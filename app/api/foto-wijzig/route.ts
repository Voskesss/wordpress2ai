import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { db } from "@/db";
import { changes, messages, sites, usage } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { deployMapNaarCloudflare } from "@/lib/cloudflare";
import { maakBranch, pushBestanden } from "@/lib/github";
import { laadWerkmap, ruimWerkmapOp } from "@/lib/werkmap";

export const maxDuration = 120;

/** Foto vervangen zonder AI: het bestaande beeldbestand wordt overschreven met
 * de nieuwe foto (zelfde naam en formaat), dus alle verwijzingen blijven kloppen. */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const form = await req.formData();
  const siteId = Number(form.get("siteId"));
  const bron = String(form.get("pad") ?? "");
  const bestand = form.get("afbeelding");
  if (!Number.isInteger(siteId) || !bron || !(bestand instanceof File)) {
    return NextResponse.json({ error: "Onvolledig verzoek" }, { status: 400 });
  }

  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site || (!site.isDemo && site.clerkUserId !== userId && !(await isBeheerder()))) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
  if ((site.status === "gepauzeerd" || site.status === "opgezegd") && !(await isBeheerder())) {
    return NextResponse.json({ error: "Site niet actief" }, { status: 403 });
  }

  // Src → pad binnen de site (zonder domein, querystring of preview-prefix)
  let pad = bron.replace(/^https?:\/\/[^/]+/, "").split("?")[0].split("#")[0];
  pad = pad.replace(/^\/preview\/\d+\//, "/").replace(/^\/+/, "");
  if (!pad || pad.includes("..")) {
    return NextResponse.json({ error: "Ongeldig pad" }, { status: 400 });
  }

  const [openConcept] = await db
    .select()
    .from(changes)
    .where(
      site.isDemo
        ? and(eq(changes.siteId, site.id), eq(changes.status, "concept"), eq(changes.clerkUserId, userId))
        : and(eq(changes.siteId, site.id), eq(changes.status, "concept"))
    )
    .orderBy(desc(changes.id))
    .limit(1);

  const { demoBranch, demoWorker } = await import("@/lib/demo");
  const eigenBranch = site.isDemo ? demoBranch(userId) : null;
  const wvNaam = site.isDemo
    ? demoWorker(site.githubRepo, userId)
    : site.netlifySiteId
      ? `wv-${site.netlifySiteId}`
      : null;

  let werkmap: string | null = null;
  try {
    if (openConcept?.branch) {
      werkmap = await laadWerkmap(site.githubRepo, openConcept.branch);
    } else if (eigenBranch) {
      werkmap = await laadWerkmap(site.githubRepo, eigenBranch).catch(() =>
        laadWerkmap(site.githubRepo)
      );
    } else {
      werkmap = await laadWerkmap(site.githubRepo);
    }

    const doel = path.join(werkmap, pad);
    const origineel = await readFile(doel).catch(() => null);
    if (!origineel) {
      return NextResponse.json({ fallback: true, melding: "Fotobestand niet gevonden" });
    }

    // Nieuwe foto in hetzelfde formaat en (maximaal) dezelfde breedte gieten
    const meta = await sharp(origineel).metadata().catch(() => null);
    const ext = pad.split(".").pop()?.toLowerCase() ?? "webp";
    let bewerking = sharp(Buffer.from(await bestand.arrayBuffer())).rotate();
    if (meta?.width) bewerking = bewerking.resize({ width: meta.width, withoutEnlargement: true });
    const nieuw =
      ext === "png"
        ? await bewerking.png().toBuffer()
        : ext === "jpg" || ext === "jpeg"
          ? await bewerking.jpeg({ quality: 84 }).toBuffer()
          : await bewerking.webp({ quality: 84 }).toBuffer();
    await writeFile(doel, nieuw);

    const wvDeploy = wvNaam
      ? deployMapNaarCloudflare(werkmap, wvNaam, { subdomeinAanzetten: site.isDemo }).catch(
          (e) => console.error("Werkversie-deploy mislukt:", e)
        )
      : Promise.resolve();

    const bestanden = [{ pad, inhoud: nieuw }];
    const omschrijving = `Foto vervangen: ${pad}`;

    let changeId: number;
    let previewUrl: string;
    if (openConcept) {
      await pushBestanden(site.githubRepo, bestanden, omschrijving, openConcept.branch);
      const samengevoegd = [
        ...new Set([
          ...(Array.isArray(openConcept.bestanden) ? (openConcept.bestanden as string[]) : []),
          pad,
        ]),
      ];
      await db
        .update(changes)
        .set({
          bestanden: samengevoegd,
          promptTekst: `${openConcept.promptTekst} → ${omschrijving}`.slice(0, 500),
        })
        .where(eq(changes.id, openConcept.id));
      changeId = openConcept.id;
      previewUrl = openConcept.previewUrl ?? `/preview/${openConcept.id}/`;
    } else {
      const branch = eigenBranch ?? `wijziging-${Date.now()}`;
      let baseSha: string | null = null;
      if (eigenBranch) {
        const { gh, GITHUB_ORG } = await import("@/lib/github");
        try {
          const ref = (await gh(
            `/repos/${GITHUB_ORG}/${site.githubRepo}/git/ref/heads/${branch}`
          )) as { object: { sha: string } };
          baseSha = ref.object.sha;
        } catch {
          await maakBranch(site.githubRepo, branch);
        }
      } else {
        await maakBranch(site.githubRepo, branch);
      }
      await pushBestanden(site.githubRepo, bestanden, omschrijving, branch);
      const [row] = await db
        .insert(changes)
        .values({
          siteId: site.id,
          branch,
          promptTekst: omschrijving,
          bestanden: [pad],
          clerkUserId: userId,
          baseSha,
        })
        .returning({ id: changes.id });
      changeId = row.id;
      previewUrl = `/preview/${row.id}/`;
      await db.update(changes).set({ previewUrl }).where(eq(changes.id, row.id));

      if (!site.isDemo) {
        const maand = new Date().toISOString().slice(0, 7);
        const [verbruik] = await db
          .select()
          .from(usage)
          .where(and(eq(usage.siteId, site.id), eq(usage.maand, maand)));
        if (verbruik) {
          await db
            .update(usage)
            .set({ wijzigingen: verbruik.wijzigingen + 1 })
            .where(eq(usage.id, verbruik.id));
        } else {
          await db.insert(usage).values({ siteId: site.id, maand, wijzigingen: 1 });
        }
      }
    }

    const reply = `Foto vervangen! De nieuwe foto staat overal waar de oude stond (${pad}). Bekijk het voorbeeld en publiceer als je tevreden bent.`;
    await db.insert(messages).values([
      { siteId: site.id, rol: "klant" as const, tekst: `[Zelf aangepast] ${omschrijving}`, clerkUserId: userId },
      { siteId: site.id, rol: "assistent" as const, tekst: reply, clerkUserId: userId },
    ]);

    await wvDeploy;
    return NextResponse.json({ ok: true, reply, previewUrl, changeId, bestanden: [pad] });
  } finally {
    if (werkmap) await ruimWerkmapOp(werkmap).catch(() => {});
  }
}
