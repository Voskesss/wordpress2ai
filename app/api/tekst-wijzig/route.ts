import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { changes, messages, sites, usage } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { deployMapNaarCloudflare } from "@/lib/cloudflare";
import { maakBranch, pushBestanden } from "@/lib/github";
import { alleHtmlBestanden, laadWerkmap, ruimWerkmapOp } from "@/lib/werkmap";

export const maxDuration = 120;

/** Zelf tekst aanpassen via de aanwijs-tool: letterlijke vervanging zonder AI.
 * Lukt het niet eenduidig (tekst niet of vaker gevonden), dan meldt de route
 * dat de chat het via de AI moet doen — er kan dus nooit iets misgaan. */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const body = (await req.json()) as {
    siteId: number;
    oud: string;
    nieuw: string;
  };
  const oud = (body.oud ?? "").trim();
  const nieuw = (body.nieuw ?? "").trim();
  if (!oud || !nieuw || oud === nieuw) {
    return NextResponse.json({ error: "Geen wijziging" }, { status: 400 });
  }

  const [site] = await db.select().from(sites).where(eq(sites.id, body.siteId));
  if (!site || (!site.isDemo && site.clerkUserId !== userId && !(await isBeheerder()))) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
  if ((site.status === "gepauzeerd" || site.status === "opgezegd") && !(await isBeheerder())) {
    return NextResponse.json({ error: "Site niet actief" }, { status: 403 });
  }

  const [openConcept] = await db
    .select()
    .from(changes)
    .where(and(eq(changes.siteId, site.id), eq(changes.status, "concept")))
    .orderBy(desc(changes.id))
    .limit(1);

  let werkmap: string | null = null;
  try {
    werkmap = await laadWerkmap(site.githubRepo, openConcept?.branch);

    // Tolerant zoeken: witruimte in de bron mag afwijken van wat de browser toont
    const patroon = new RegExp(
      oud.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"),
      "g"
    );
    const htmlPaden = await alleHtmlBestanden(werkmap);
    const treffers: { pad: string; inhoud: string; aantal: number }[] = [];
    for (const pad of htmlPaden) {
      const inhoud = await readFile(path.join(werkmap, pad), "utf8");
      const aantal = (inhoud.match(patroon) ?? []).length;
      if (aantal > 0) treffers.push({ pad, inhoud, aantal });
    }
    const totaal = treffers.reduce((som, t) => som + t.aantal, 0);
    if (totaal !== 1) {
      // Niet (eenduidig) gevonden → laat de AI het veilig oplossen
      return NextResponse.json({ fallback: true, gevonden: totaal });
    }

    const [treffer] = treffers;
    const nieuweInhoud = treffer.inhoud.replace(patroon, nieuw);
    await writeFile(path.join(werkmap, treffer.pad), nieuweInhoud);

    // Zelfde trechter als AI-wijzigingen: werkversie + branch + concept
    const wvDeploy = site.netlifySiteId
      ? deployMapNaarCloudflare(werkmap, `wv-${site.netlifySiteId}`, {
          subdomeinAanzetten: false,
        }).catch((e) => console.error("Werkversie-deploy mislukt:", e))
      : Promise.resolve();

    const bestanden = [
      { pad: treffer.pad, inhoud: Buffer.from(nieuweInhoud) },
    ];
    const omschrijving = `Tekst aangepast: "${oud.slice(0, 40)}" → "${nieuw.slice(0, 40)}"`;

    let changeId: number;
    let previewUrl: string;
    if (openConcept) {
      await pushBestanden(site.githubRepo, bestanden, omschrijving, openConcept.branch);
      const samengevoegd = [
        ...new Set([
          ...(Array.isArray(openConcept.bestanden) ? (openConcept.bestanden as string[]) : []),
          treffer.pad,
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
      const branch = `wijziging-${Date.now()}`;
      await maakBranch(site.githubRepo, branch);
      await pushBestanden(site.githubRepo, bestanden, omschrijving, branch);
      const [row] = await db
        .insert(changes)
        .values({
          siteId: site.id,
          branch,
          promptTekst: omschrijving,
          bestanden: [treffer.pad],
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

    const reply = `Aangepast! "${oud.slice(0, 60)}" is nu "${nieuw.slice(0, 60)}" (op ${treffer.pad}). Bekijk het voorbeeld en publiceer als je tevreden bent.`;
    await db.insert(messages).values([
      { siteId: site.id, rol: "klant" as const, tekst: `[Zelf aangepast] ${omschrijving}`, clerkUserId: userId },
      { siteId: site.id, rol: "assistent" as const, tekst: reply, clerkUserId: userId },
    ]);

    await wvDeploy;
    return NextResponse.json({
      ok: true,
      reply,
      previewUrl,
      changeId,
      bestanden: [treffer.pad],
    });
  } finally {
    if (werkmap) await ruimWerkmapOp(werkmap).catch(() => {});
  }
}
