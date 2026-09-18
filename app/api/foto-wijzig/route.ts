import { claimOperation, operationScope } from "@/lib/operation-guards";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, sql, inArray } from "drizzle-orm";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { db } from "@/db";
import { changes, messages, sites, usage } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { alsPagina } from "@/lib/consistentie";
import { deployMapNaarCloudflare } from "@/lib/cloudflare";
import { maakBranch, pushBestanden } from "@/lib/github";
import { laadWerkmap, ruimWerkmapOp } from "@/lib/werkmap";

export const maxDuration = 120;

/** Foto vervangen zonder AI: het bestaande beeldbestand wordt overschreven met
 * de nieuwe foto (zelfde naam en formaat), dus alle verwijzingen blijven kloppen. */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const form = await req.formData();
  const siteId = Number(form.get("siteId"));
  const bron = String(form.get("pad") ?? "");
  const bestand = form.get("afbeelding");
  if (!Number.isInteger(siteId) || !bron || !(bestand instanceof File)) {
    return NextResponse.json({ error: "Onvolledig verzoek" }, { status: 400 });
  }

  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (
    !site ||
    (!site.isDemo && site.clerkUserId !== userId && !(await isBeheerder()))
  ) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
  if (
    (site.status === "gepauzeerd" || site.status === "opgezegd") &&
    !(await isBeheerder())
  ) {
    return NextResponse.json({ error: "Site niet actief" }, { status: 403 });
  }

  // Src → pad binnen de site (zonder domein, querystring of preview-prefix)
  let pad = bron
    .replace(/^https?:\/\/[^/]+/, "")
    .split("?")[0]
    .split("#")[0];
  pad = pad
    .replace(/^\/(?:preview|site-weergave)\/[^/]+\//, "/")
    .replace(/^\/+/, "");
  if (!pad || pad.includes("..")) {
    return NextResponse.json({ error: "Ongeldig pad" }, { status: 400 });
  }

  const release = await claimOperation(operationScope(site, userId));
  if (!release)
    return NextResponse.json(
      { slot: true, melding: "Er wordt al aan je website gewerkt." },
      { status: 409 },
    );
  try {
    const pending = await db
      .select({ id: changes.id })
      .from(changes)
      .where(
        and(
          eq(changes.siteId, site.id),
          inArray(changes.status, ["publicatie_mislukt", "herstel_mislukt"]),
          site.isDemo ? eq(changes.clerkUserId, userId) : undefined,
        ),
      );
    if (pending.length)
      return NextResponse.json(
        { melding: "Rond eerst de eerdere publicatie of het herstel af." },
        { status: 409 },
      );
    const [openConcept] = await db
      .select()
      .from(changes)
      .where(
        site.isDemo
          ? and(
              eq(changes.siteId, site.id),
              eq(changes.status, "concept"),
              eq(changes.clerkUserId, userId),
            )
          : and(eq(changes.siteId, site.id), eq(changes.status, "concept")),
      )
      .orderBy(desc(changes.id))
      .limit(1);

    const { demoBranch, demoWorker } = await import("@/lib/demo");
    const eigenBranch = site.isDemo ? demoBranch(userId) : null;
    const wvNaam = site.isDemo
      ? demoWorker(site.githubRepo, userId)
      : site.siteSlug
        ? `wv-${site.siteSlug}`
        : null;

    let werkmap: string | null = null;
    try {
      if (openConcept?.branch) {
        werkmap = await laadWerkmap(site.githubRepo, openConcept.branch);
      } else if (eigenBranch) {
        werkmap = await laadWerkmap(site.githubRepo, eigenBranch).catch(() =>
          laadWerkmap(site.githubRepo),
        );
      } else {
        werkmap = await laadWerkmap(site.githubRepo);
      }

      const doel = path.join(werkmap, pad);
      const origineel = await readFile(doel).catch(() => null);
      if (!origineel) {
        return NextResponse.json({
          fallback: true,
          melding: "Fotobestand niet gevonden",
        });
      }

      // Nieuwe foto in hetzelfde formaat en (maximaal) dezelfde breedte gieten
      const meta = await sharp(origineel)
        .metadata()
        .catch(() => null);
      const upload = Buffer.from(await bestand.arrayBuffer());
      const uploadMeta = await sharp(upload)
        .metadata()
        .catch(() => null);
      let ext = pad.split(".").pop()?.toLowerCase() ?? "webp";
      // Doorzichtige aanlevering (bv. achtergrond weggehaald) past niet in jpg:
      // dan slaan we op als webp, dat alfa wél ondersteunt.
      if (uploadMeta?.hasAlpha && (ext === "jpg" || ext === "jpeg"))
        ext = "webp";
      let bewerking = sharp(upload).rotate();
      if (meta?.width)
        bewerking = bewerking.resize({
          width: meta.width,
          withoutEnlargement: true,
        });
      const nieuw =
        ext === "png"
          ? await bewerking.png().toBuffer()
          : ext === "jpg" || ext === "jpeg"
            ? await bewerking.jpeg({ quality: 84 }).toBuffer()
            : await bewerking.webp({ quality: 84 }).toBuffer();

      // Nieuwe bestandsnaam (cache-busting): browsers en Cloudflare cachen
      // afbeeldingen op naam — zelfde naam = oude foto blijven zien. Met een
      // verse naam + bijgewerkte verwijzingen is hij overal per direct zichtbaar.
      const zonderExt = pad.replace(/\.[^.]+$/, "").replace(/-v\d+$/, "");
      const nieuwPad = `${zonderExt}-v${Date.now().toString(36)}.${ext}`;
      await writeFile(path.join(werkmap, nieuwPad), nieuw);

      // Verwijzingen naar het oude pad opzoeken (html + css)
      const { alleHtmlBestanden, alleCssBestanden } =
        await import("@/lib/werkmap");
      const teDoorzoeken = [
        ...(await alleHtmlBestanden(werkmap)),
        ...(await alleCssBestanden(werkmap)),
      ];
      const padEsc = pad.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const verwijzing = new RegExp(`(/?)${padEsc}`, "g");
      const verwijzend: { pad: string; inhoud: string }[] = [];
      for (const bron of teDoorzoeken) {
        const inhoud = await readFile(path.join(werkmap, bron), "utf8");
        verwijzing.lastIndex = 0;
        if (verwijzing.test(inhoud)) verwijzend.push({ pad: bron, inhoud });
      }

      // Aangewezen pagina ("/", "/contact/") → bestandspad. Staat de foto op
      // méér pagina's (hero op de homepage én bij een project!), dan vervangen
      // we hem standaard alleen op de aangewezen pagina en vragen we hieronder
      // of de rest mee moet — zelfde regel als bij tekst.
      const paginaKaal = String(form.get("pagina") ?? "")
        .replace(/^\/(?:preview|site-weergave)\/[^/]+/, "")
        .replace(/^\/+|\/+$/g, "");
      const aangewezenPad = form.get("pagina")
        ? paginaKaal === ""
          ? "index.html"
          : /\.html?$/i.test(paginaKaal)
            ? paginaKaal
            : `${paginaKaal}/index.html`
        : null;
      const hierBron = aangewezenPad
        ? verwijzend.find((v) => v.pad === aangewezenPad)
        : undefined;
      const teVervangen =
        hierBron && verwijzend.length > 1 ? [hierBron] : verwijzend;

      const gewijzigdeBronnen: { pad: string; inhoud: Buffer }[] = [];
      for (const bron of teVervangen) {
        verwijzing.lastIndex = 0;
        const nieuweInhoud = bron.inhoud.replace(verwijzing, `$1${nieuwPad}`);
        await writeFile(path.join(werkmap, bron.pad), nieuweInhoud);
        gewijzigdeBronnen.push({
          pad: bron.pad,
          inhoud: Buffer.from(nieuweInhoud),
        });
      }
      // Waar staat de oude foto ná deze beurt nog?
      const eldersNog = verwijzend
        .filter((v) => !teVervangen.includes(v))
        .map((v) => v.pad);
      if (gewijzigdeBronnen.length === 0) {
        // Geen verwijzingen gevonden — dan toch in-place overschrijven als vangnet
        await writeFile(doel, nieuw);
      }

      const wvDeploy = wvNaam
        ? deployMapNaarCloudflare(werkmap, wvNaam, {
            subdomeinAanzetten: site.isDemo,
          }).catch((e) => console.error("Werkversie-deploy mislukt:", e))
        : Promise.resolve();

      const bestanden =
        gewijzigdeBronnen.length > 0
          ? [{ pad: nieuwPad, inhoud: nieuw }, ...gewijzigdeBronnen]
          : [{ pad, inhoud: nieuw }];
      const paden = bestanden.map((b) => b.pad);
      const omschrijving = `Foto vervangen: ${pad}`;

      let changeId: number;
      let previewUrl: string;
      if (openConcept) {
        await pushBestanden(
          site.githubRepo,
          bestanden,
          omschrijving,
          openConcept.branch,
        );
        const samengevoegd = [
          ...new Set([
            ...(Array.isArray(openConcept.bestanden)
              ? (openConcept.bestanden as string[])
              : []),
            ...paden,
          ]),
        ];
        await db
          .update(changes)
          .set({
            bestanden: samengevoegd,
            promptTekst: `${openConcept.promptTekst} → ${omschrijving}`.slice(
              0,
              500,
            ),
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
              `/repos/${GITHUB_ORG}/${site.githubRepo}/git/ref/heads/${branch}`,
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
            bestanden: paden,
            clerkUserId: userId,
            baseSha,
          })
          .returning({ id: changes.id });
        changeId = row.id;
        previewUrl = `/preview/${row.id}/`;
        await db
          .update(changes)
          .set({ previewUrl })
          .where(eq(changes.id, row.id));

        if (!site.isDemo) {
          const maand = new Date().toISOString().slice(0, 7);
          const [verbruik] = await db
            .select()
            .from(usage)
            .where(and(eq(usage.siteId, site.id), eq(usage.maand, maand)));
          if (verbruik) {
            await db
              .update(usage)
              .set({ wijzigingen: sql`${usage.wijzigingen} + 1` })
              .where(eq(usage.id, verbruik.id));
          } else {
            await db
              .insert(usage)
              .values({ siteId: site.id, maand, wijzigingen: 1 });
          }
        }
      }

      // Nooit stilletjes: staat de oude foto elders nog, vraag dan met knoppen
      // of hij daar ook mee moet (zelfde regel als tekst); is hij zonder
      // aangewezen pagina tóch overal vervangen, benoem dan de pagina's.
      const eldersLijst = eldersNog
        .filter((p) => p.endsWith(".html"))
        .map(alsPagina);
      const fotoPaginas = gewijzigdeBronnen
        .filter((b) => b.pad.endsWith(".html"))
        .map((b) => alsPagina(b.pad));
      const reply =
        eldersLijst.length > 0
          ? `Foto vervangen op ${fotoPaginas[0] ?? "deze pagina"}!\n\n⚠️ **Let op:** dezelfde oude foto staat óók nog op ${eldersLijst.slice(0, 4).join(" en ")}${eldersLijst.length > 4 ? ` en nog ${eldersLijst.length - 4} plekken` : ""}. Zal ik hem daar ook vervangen, of moest dit bewust alleen hier?\nKEUZES: Overal doorvoeren | Het moest alleen hier`
          : fotoPaginas.length > 1
            ? `Foto vervangen! ⚠️ **Let op:** deze foto stond op meerdere plekken en is overal vervangen: ${fotoPaginas.slice(0, 4).join(", ")}${fotoPaginas.length > 4 ? ` en nog ${fotoPaginas.length - 4} plekken` : ""}. Moest hij maar op één plek anders? Zeg het hieronder, dan zet ik de andere plekken terug.\nKEUZES: Goed zo, overal vervangen | Zet de andere plekken terug`
            : `Foto vervangen! De nieuwe foto staat overal waar de oude stond (${pad}). Bekijk het voorbeeld en publiceer als je tevreden bent.`;
      await db.insert(messages).values([
        {
          siteId: site.id,
          rol: "klant" as const,
          tekst: `[Zelf aangepast] ${omschrijving}`,
          clerkUserId: userId,
        },
        {
          siteId: site.id,
          rol: "assistent" as const,
          tekst: reply,
          clerkUserId: userId,
        },
      ]);

      await wvDeploy;
      return NextResponse.json({
        ok: true,
        reply,
        previewUrl,
        changeId,
        bestanden: paden,
      });
    } finally {
      if (werkmap) await ruimWerkmapOp(werkmap).catch(() => {});
    }
  } finally {
    await release();
  }
}
