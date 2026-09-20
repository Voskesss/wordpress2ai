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

/** De videobank: alle video's die op de site staan, met hun poster-afbeelding.
 * Video's leven (anders dan audio) in de siterepo zelf, omdat ze na het
 * comprimeren klein genoeg zijn en bij het publiceren gewoon meegaan.
 * Opruimen kan alleen als een video nergens meer gebruikt wordt — zelfde
 * regel als in de foto- en audiobank. */

export const maxDuration = 120;

const IS_VIDEO = /\.(mp4|webm|mov)$/i;

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

/** Poster die bij een video hoort: <naam>-poster.<ext> naast het bestand. */
function posterVoor(videoPad: string, alle: string[]): string | null {
  const stam = videoPad.replace(/\.[^.]+$/, "");
  return alle.find((b) => b.startsWith(`${stam}-poster.`)) ?? null;
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
    const videos = await Promise.all(
      alle
        .filter((b) => IS_VIDEO.test(b))
        .map(async (pad) => ({
          pad,
          poster: posterVoor(pad, alle),
          mb: Math.round(((await stat(path.join(werkmap!, pad))).size / 1024 / 1024) * 10) / 10,
          inGebruik: inhoud.includes(pad),
        })),
    );
    videos.sort((a, b) => Number(b.inGebruik) - Number(a.inGebruik) || a.pad.localeCompare(b.pad));
    return NextResponse.json({ videos, gebruikt: site.videoUploads, limiet: site.videoLimiet });
  } catch (e) {
    console.error("Videobank laden:", e);
    return NextResponse.json({ error: "Kon de videobank niet laden." }, { status: 503 });
  } finally {
    if (werkmap) await ruimWerkmapOp(werkmap).catch(() => {});
  }
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const { siteId, pad } = (await req.json().catch(() => ({}))) as { siteId?: number; pad?: string };
  if (!Number.isInteger(siteId) || !pad || pad.includes("..") || !IS_VIDEO.test(pad))
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
    let poster: string | null = null;
    for (const tak of teControleren) {
      const map = await laadWerkmap(site.githubRepo, tak);
      mappen.push(map);
      const alle = await alleBestandenVan(map);
      poster = poster ?? posterVoor(pad, alle);
      for (const b of alle.filter((x) => /\.(html?|css|js)$/i.test(x))) {
        const inhoud = await readFile(path.join(map, b), "utf8").catch(() => "");
        if (inhoud.includes(pad))
          return NextResponse.json(
            {
              melding: `Deze video staat nog op je website (${alsPagina(b)})${
                tak ? " in je openstaande concept" : ""
              }. Vraag in de chat eerst om hem daar weg te halen; daarna kun je hem hier opruimen.`,
            },
            { status: 409 },
          );
      }
    }

    // De poster hoort bij de video en gaat mee; hij is verder nergens in gebruik
    const teWissen = poster ? [pad, poster] : [pad];
    const { verwijderBestanden } = await import("@/lib/github");
    for (const tak of openConcept?.branch ? ["main", openConcept.branch] : ["main"])
      await verwijderBestanden(site.githubRepo, teWissen, `Video uit de videobank verwijderd: ${pad}`, tak);
    await db.insert(messages).values([
      { siteId: site.id, rol: "klant" as const, tekst: `[Zelf aangepast] Video uit de videobank verwijderd: ${pad}`, clerkUserId: userId },
      {
        siteId: site.id,
        rol: "assistent" as const,
        tekst: `De video ${pad.split("/").pop()} is uit je videobank gehaald${poster ? " (met zijn voorbeeldplaatje)" : ""}. Hij stond nergens meer op je site; via "Vorige versies" is hij zo nodig nog terug te halen.`,
        clerkUserId: userId,
      },
    ]);
    return NextResponse.json({ ok: true, ookVerwijderd: poster });
  } catch (e) {
    console.error("Video verwijderen uit de videobank:", e);
    return NextResponse.json({ melding: "Verwijderen lukte niet. Probeer het zo nog eens." }, { status: 503 });
  } finally {
    for (const m of mappen) await ruimWerkmapOp(m).catch(() => {});
    await release();
  }
}
