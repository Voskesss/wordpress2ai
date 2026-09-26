import { claimOperation, operationScope } from "@/lib/operation-guards";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, sql, inArray } from "drizzle-orm";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { changes, messages, sites, usage } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { deployMapNaarCloudflare } from "@/lib/cloudflare";
import { maakBranch, pushBestanden } from "@/lib/github";
import { alleHtmlBestanden, laadWerkmap, ruimWerkmapOp } from "@/lib/werkmap";
import {
  verwijderKaart,
  vindFotoInReeks,
  wisselKaarten,
} from "@/lib/foto-ordenen";

export const maxDuration = 120;

/** Directe acties op een foto die de eigenaar heeft aangewezen: weghalen, of
 * een plek naar voren of naar achteren in de reeks. Zonder AI, dus in seconden
 * klaar, en via dezelfde trechter als de andere wijzigingen: eerst een concept
 * dat de eigenaar zelf publiceert.
 * "info" verandert niets en vertelt alleen of deze foto in een reeks staat —
 * daarmee bepaalt het portaal of de pijltjes zinvol zijn. */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const body = (await req.json()) as {
    siteId: number;
    /** Bestandsnaam van de foto zoals hij in de pagina staat */
    src: string;
    /** Pagina waar de eigenaar naar keek, bv. "/galerij/" */
    pagina?: string;
    actie: "info" | "verwijder" | "voor" | "achter";
  };
  const src = (body.src ?? "").trim();
  if (!src || !["info", "verwijder", "voor", "achter"].includes(body.actie)) {
    return NextResponse.json({ error: "Onvolledig verzoek" }, { status: 400 });
  }

  const [site] = await db.select().from(sites).where(eq(sites.id, body.siteId));
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

  const release = await claimOperation(operationScope(site, userId));
  if (!release)
    return NextResponse.json(
      { slot: true, melding: "Ik ben nog met je vorige opdracht bezig. Zodra de balk in de chat klaar is, kun je dit meteen opnieuw proberen." },
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

    // Demo: persoonlijke branch + persoonlijke voorbeeld-site
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

      // Pagina kiezen waar de eigenaar naar keek; anders alle pagina's aflopen
      const voorkeur = (body.pagina ?? "")
        .replace(/^\/+|\/+$/g, "")
        .replace(/\.html?$/, "");
      const alleHtml = await alleHtmlBestanden(werkmap);
      const volgorde = [
        ...alleHtml.filter((p) =>
          voorkeur
            ? p === `${voorkeur}/index.html` || p === `${voorkeur}.html`
            : p === "index.html",
        ),
        ...alleHtml,
      ];

      let raak: {
        pad: string;
        inhoud: string;
        kaarten: { start: number; eind: number }[];
        index: number;
      } | null = null;
      for (const pad of volgorde) {
        if (pad.startsWith("delen/")) continue;
        const inhoud = await readFile(path.join(werkmap, pad), "utf8");
        if (!inhoud.includes(src.split("/").pop() ?? src)) continue;
        const gevonden = vindFotoInReeks(inhoud, src);
        if (gevonden) {
          raak = { pad, inhoud, ...gevonden };
          break;
        }
      }
      if (!raak)
        return NextResponse.json(
          { melding: "Ik kan deze foto niet terugvinden op de pagina." },
          { status: 404 },
        );

      const aantal = raak.kaarten.length;
      if (body.actie === "info") {
        return NextResponse.json({
          ok: true,
          inReeks: aantal > 1,
          positie: raak.index + 1,
          totaal: aantal,
        });
      }

      const buurIndex =
        body.actie === "voor" ? raak.index - 1 : raak.index + 1;
      if (
        body.actie !== "verwijder" &&
        (aantal < 2 || buurIndex < 0 || buurIndex >= aantal)
      )
        return NextResponse.json(
          { melding: "Deze foto staat al helemaal vooraan of achteraan." },
          { status: 409 },
        );

      const nieuweInhoud =
        body.actie === "verwijder"
          ? verwijderKaart(raak.inhoud, raak.kaarten[raak.index])
          : wisselKaarten(
              raak.inhoud,
              raak.kaarten[raak.index],
              raak.kaarten[buurIndex],
            );
      await writeFile(path.join(werkmap, raak.pad), nieuweInhoud);
      const gewijzigdePaden = [{ pad: raak.pad, inhoud: nieuweInhoud }];
      const naam = src.split("/").pop() ?? src;
      const omschrijving =
        body.actie === "verwijder"
          ? `Foto verwijderd: ${naam}`
          : `Foto verplaatst (${body.actie === "voor" ? "naar voren" : "naar achteren"}): ${naam}`;

      // Zelfde trechter als AI-wijzigingen: werkversie + branch + concept
      const wvDeploy = wvNaam
        ? deployMapNaarCloudflare(werkmap, wvNaam, {
            subdomeinAanzetten: site.isDemo,
          }).catch((e) => console.error("Werkversie-deploy mislukt:", e))
        : Promise.resolve();

      const bestanden = gewijzigdePaden.map((g) => ({
        pad: g.pad,
        inhoud: Buffer.from(g.inhoud),
      }));


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
            ...gewijzigdePaden.map((g) => g.pad),
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
            bestanden: gewijzigdePaden.map((g) => g.pad),
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

      const reply =
        body.actie === "verwijder"
          ? `Foto weggehaald. Bekijk het voorbeeld en publiceer als je tevreden bent.`
          : `Foto een plek ${body.actie === "voor" ? "naar voren" : "naar achteren"} gezet (nu ${
              body.actie === "voor" ? raak.index : raak.index + 2
            } van ${aantal}). Bekijk het voorbeeld en publiceer als je tevreden bent.`;
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
        bestanden: gewijzigdePaden.map((g) => g.pad),
      });
    } finally {
      if (werkmap) await ruimWerkmapOp(werkmap).catch(() => {});
    }
  } finally {
    await release();
  }
}
