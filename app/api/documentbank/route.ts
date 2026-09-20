import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { changes, messages, sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { alsPagina } from "@/lib/consistentie";
import { claimOperation, operationScope } from "@/lib/operation-guards";
import { alleBestandenVan, laadWerkmap, ruimWerkmapOp } from "@/lib/werkmap";

/** De documentenbank: alle pdf's die op de site staan (vacatures, voorwaarden,
 * menukaarten, brochures). Ze leven in de siterepo, in bestanden/, en gaan bij
 * het publiceren gewoon mee. Opruimen kan alleen als er nergens meer naar
 * wordt gelinkt — zelfde regel als in de andere banken, want een dode
 * downloadknop is erger dan een bestand te veel. */

export const maxDuration = 120;

const IS_DOCUMENT = /\.pdf$/i;

async function magErbij(siteId: number, userId: string) {
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site || (!site.isDemo && site.clerkUserId !== userId && !(await isBeheerder()))) return null;
  return site;
}

async function openConceptVan(siteId: number) {
  const [rij] = await db
    .select()
    .from(changes)
    .where(and(eq(changes.siteId, siteId), eq(changes.status, "concept")))
    .orderBy(desc(changes.id))
    .limit(1);
  return rij ?? null;
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const siteId = Number(new URL(req.url).searchParams.get("siteId"));
  const site = await magErbij(siteId, userId);
  if (!site) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  let werkmap: string | null = null;
  try {
    const openConcept = await openConceptVan(site.id);
    werkmap = await laadWerkmap(site.githubRepo, openConcept?.branch ?? undefined);
    const alle = await alleBestandenVan(werkmap);
    const bronnen = alle.filter((b) => /\.(html?|css|js)$/i.test(b));
    let inhoud = "";
    for (const b of bronnen) inhoud += await readFile(path.join(werkmap, b), "utf8").catch(() => "");
    const documenten = await Promise.all(
      alle
        .filter((b) => IS_DOCUMENT.test(b))
        .map(async (pad) => ({
          pad,
          kb: Math.round((await stat(path.join(werkmap!, pad))).size / 1024),
          inGebruik: inhoud.includes(pad),
        })),
    );
    documenten.sort((a, b) => Number(b.inGebruik) - Number(a.inGebruik) || a.pad.localeCompare(b.pad));
    return NextResponse.json({ documenten });
  } catch (e) {
    console.error("Documentenbank laden:", e);
    return NextResponse.json({ error: "Kon de documentenbank niet laden." }, { status: 503 });
  } finally {
    if (werkmap) await ruimWerkmapOp(werkmap).catch(() => {});
  }
}


export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const { siteId, pad } = (await req.json().catch(() => ({}))) as { siteId?: number; pad?: string };
  if (!Number.isInteger(siteId) || !pad || pad.includes("..") || !IS_DOCUMENT.test(pad))
    return NextResponse.json({ error: "Onvolledig verzoek" }, { status: 400 });
  const site = await magErbij(Number(siteId), userId);
  if (!site) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  if (site.isDemo) return NextResponse.json({ error: "In de demo kun je niets verwijderen." }, { status: 403 });

  const release = await claimOperation(operationScope(site, userId));
  if (!release)
    return NextResponse.json({ slot: true, melding: "Er wordt al aan je website gewerkt." }, { status: 409 });

  const mappen: string[] = [];
  try {
    const openConcept = await openConceptVan(site.id);
    // In gebruik? Zowel in het concept als in de gepubliceerde versie kijken.
    const teControleren = openConcept?.branch ? [openConcept.branch, undefined] : [undefined];
    for (const tak of teControleren) {
      const map = await laadWerkmap(site.githubRepo, tak);
      mappen.push(map);
      const alle = await alleBestandenVan(map);
      for (const b of alle.filter((x) => /\.(html?|css|js)$/i.test(x))) {
        const inhoud = await readFile(path.join(map, b), "utf8").catch(() => "");
        if (inhoud.includes(pad))
          return NextResponse.json(
            {
              melding: `Er staat nog een downloadlink naar dit document op je website (${alsPagina(b)})${
                tak ? " in je openstaande concept" : ""
              }. Vraag in de chat eerst om die link weg te halen; daarna kun je het bestand hier opruimen.`,
            },
            { status: 409 },
          );
      }
    }

    const { verwijderBestanden } = await import("@/lib/github");
    for (const tak of openConcept?.branch ? ["main", openConcept.branch] : ["main"])
      await verwijderBestanden(site.githubRepo, [pad], `Document uit de documentenbank verwijderd: ${pad}`, tak);
    await db.insert(messages).values([
      { siteId: site.id, rol: "klant" as const, tekst: `[Zelf aangepast] Document uit de documentenbank verwijderd: ${pad}`, clerkUserId: userId },
      {
        siteId: site.id,
        rol: "assistent" as const,
        tekst: `Het document ${pad.split("/").pop()} is uit je documentenbank gehaald. Er linkte niets meer naartoe; via "Vorige versies" is het zo nodig nog terug te halen.`,
        clerkUserId: userId,
      },
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Document verwijderen uit de documentenbank:", e);
    return NextResponse.json({ melding: "Verwijderen lukte niet. Probeer het zo nog eens." }, { status: 503 });
  } finally {
    for (const m of mappen) await ruimWerkmapOp(m).catch(() => {});
    await release();
  }
}
