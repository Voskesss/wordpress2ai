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
import { alleCssBestanden, alleHtmlBestanden, laadWerkmap, ruimWerkmapOp } from "@/lib/werkmap";

export const maxDuration = 120;

/** "rgb(124, 58, 237)" of "#7c3aed" → [124, 58, 237]. */
function kleurNaarRgb(kleur: string): [number, number, number] | null {
  const rgbMatch = kleur.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
  const hexMatch = kleur.match(/^#?([0-9a-f]{6})$/i);
  if (hexMatch) {
    const h = hexMatch[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const kortMatch = kleur.match(/^#?([0-9a-f]{3})$/i);
  if (kortMatch) {
    const h = kortMatch[1];
    return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
  }
  return null;
}

/** "#7c3aed" → "124, 58, 237" (voor rgba-vervangingen). */
function hexNaarRgbTriplet(hex: string): string {
  const rgb = kleurNaarRgb(hex);
  return rgb ? rgb.join(", ") : hex;
}

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
    // Kleur-modus: vervang de kleur OVERAL (zoals een colorpicker in een thema)
    kleur?: boolean;
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
    .where(
      site.isDemo
        ? and(
            eq(changes.siteId, site.id),
            eq(changes.status, "concept"),
            eq(changes.clerkUserId, userId)
          )
        : and(eq(changes.siteId, site.id), eq(changes.status, "concept"))
    )
    .orderBy(desc(changes.id))
    .limit(1);

  // Demo: persoonlijke branch + persoonlijke voorbeeld-site
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

    let patroon: RegExp;
    let vervanging = nieuw;
    if (body.kleur) {
      // Alle schrijfwijzen van dezelfde kleur herkennen: #hex, rgb() en rgba()
      const rgb = kleurNaarRgb(oud);
      if (!rgb) return NextResponse.json({ fallback: true, gevonden: 0 });
      const [r, g, b] = rgb;
      const hex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
      const kort =
        hex[1] === hex[2] && hex[3] === hex[4] && hex[5] === hex[6]
          ? `#${hex[1]}${hex[3]}${hex[5]}`
          : null;
      const varianten = [
        hex.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        ...(kort ? [kort.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![0-9a-fA-F])"] : []),
        `rgb\\(\\s*${r}\\s*,\\s*${g}\\s*,\\s*${b}\\s*\\)`,
        `rgba\\(\\s*${r}\\s*,\\s*${g}\\s*,\\s*${b}\\s*,`,
      ];
      patroon = new RegExp(varianten.join("|"), "gi");
      // rgba(r,g,b, → nieuwe kleur als rgba met behoud van de rest lukt niet in
      // één vervanging; vervang rgba-varianten door de nieuwe hex + komma-loze vorm
      vervanging = nieuw;
    } else {
      // Tolerant zoeken: witruimte in de bron mag afwijken van wat de browser toont
      patroon = new RegExp(
        oud.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"),
        "g"
      );
    }
    const htmlPaden = (await alleHtmlBestanden(werkmap)).concat(
      body.kleur ? await alleCssBestanden(werkmap) : []
    );
    const treffers: { pad: string; inhoud: string; aantal: number }[] = [];
    for (const pad of htmlPaden) {
      const inhoud = await readFile(path.join(werkmap, pad), "utf8");
      const aantal = (inhoud.match(patroon) ?? []).length;
      if (aantal > 0) treffers.push({ pad, inhoud, aantal });
    }
    const totaal = treffers.reduce((som, t) => som + t.aantal, 0);
    // Tekst: alleen bij precies één vindplaats (anders AI). Kleur: overal vervangen.
    if (body.kleur ? totaal === 0 : totaal !== 1) {
      return NextResponse.json({ fallback: true, gevonden: totaal });
    }

    const gewijzigdePaden: { pad: string; inhoud: string }[] = [];
    for (const treffer of body.kleur ? treffers : [treffers[0]]) {
      const nieuweInhoud = treffer.inhoud.replace(patroon, (m) =>
        m.startsWith("rgba") || m.startsWith("RGBA") ? `rgba(${hexNaarRgbTriplet(vervanging)},` : vervanging
      );
      await writeFile(path.join(werkmap, treffer.pad), nieuweInhoud);
      gewijzigdePaden.push({ pad: treffer.pad, inhoud: nieuweInhoud });
    }
    const treffer = gewijzigdePaden[0]
      ? { pad: gewijzigdePaden[0].pad, inhoud: gewijzigdePaden[0].inhoud }
      : treffers[0];

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
    const omschrijving = body.kleur
      ? `Kleur aangepast: ${oud.slice(0, 30)} → ${nieuw.slice(0, 30)} (${totaal}x op ${gewijzigdePaden.length} bestand(en))`
      : `Tekst aangepast: "${oud.slice(0, 40)}" → "${nieuw.slice(0, 40)}"`;

    let changeId: number;
    let previewUrl: string;
    if (openConcept) {
      await pushBestanden(site.githubRepo, bestanden, omschrijving, openConcept.branch);
      const samengevoegd = [
        ...new Set([
          ...(Array.isArray(openConcept.bestanden) ? (openConcept.bestanden as string[]) : []),
          ...gewijzigdePaden.map((g) => g.pad),
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
          bestanden: gewijzigdePaden.map((g) => g.pad),
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

    const reply = body.kleur
      ? `Kleur aangepast! ${oud.slice(0, 40)} is overal vervangen door ${nieuw.slice(0, 40)} (${totaal} plekken). Bekijk het voorbeeld en publiceer als je tevreden bent.`
      : `Aangepast! "${oud.slice(0, 60)}" is nu "${nieuw.slice(0, 60)}" (op ${treffer.pad}). Bekijk het voorbeeld en publiceer als je tevreden bent.`;
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
      bestanden: gewijzigdePaden.map((g) => g.pad),
    });
  } finally {
    if (werkmap) await ruimWerkmapOp(werkmap).catch(() => {});
  }
}
