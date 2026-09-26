import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, sql } from "drizzle-orm";
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
  const url = new URL(req.url);
  const siteId = Number(url.searchParams.get("siteId"));
  const site = await magErbij(siteId, userId);
  if (!site) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  // Eén video afspelen? Rechtstreeks uit de media-opslag doorsluizen, net als
  // bij audio: het voorbeeldvenster leest uit de siterepo, en daar staan
  // nieuwe video's bewust niet meer in (20-09).
  const bestand = url.searchParams.get("bestand");
  if (bestand && site.siteSlug) {
    const { VIDEO_EXTENSIES, schoneAudioNaam } = await import("@/lib/media");
    if (!VIDEO_EXTENSIES.test(bestand)) return new Response("Niet gevonden", { status: 404 });
    const { streamObject } = await import("@/lib/r2");
    const res = await streamObject(
      `media/${site.siteSlug}/video/${schoneAudioNaam(bestand)}`,
      req.headers.get("range"),
    );
    if (!res) return new Response("Niet gevonden", { status: 404 });
    const koppen = new Headers();
    for (const naam of ["content-type", "content-length", "content-range", "accept-ranges", "etag"]) {
      const w = res.headers.get(naam);
      if (w) koppen.set(naam, w);
    }
    if (!koppen.has("accept-ranges")) koppen.set("accept-ranges", "bytes");
    koppen.set("cache-control", "private, max-age=300");
    return new Response(res.body, { status: res.status, headers: koppen });
  }

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
          bron: "site" as "site" | "media",
        })),
    );
    // Video's uit de media-opslag erbij: die staan niet in de site zelf, maar
    // worden op /video/<naam> geserveerd — voor de eigenaar één lijst.
    if (site.siteSlug) {
      const { lijstMediaVideo } = await import("@/lib/media");
      for (const m of await lijstMediaVideo(site.siteSlug).catch(() => [])) {
        const pad = `video/${m.naam}`;
        if (videos.some((v) => v.pad === pad)) continue;
        videos.push({
          pad,
          poster: posterVoor(pad, alle),
          mb: Math.round((m.bytes / 1024 / 1024) * 10) / 10,
          inGebruik: inhoud.includes(pad),
          bron: "media" as "site" | "media",
        });
      }
    }
    // Nieuwste bovenaan (wens Jos 26-09): de media-opslag komt al nieuwste-
    // eerst binnen; video's die nog ín de site zelf staan zijn per definitie
    // ouder (nieuwe uploads gaan altijd naar de media-opslag) en komen
    // daarna. De sort is stabiel, dus binnen die groepen blijft de volgorde.
    videos.sort((a, b) => Number(a.bron === "site") - Number(b.bron === "site"));
    return NextResponse.json({ videos, gebruikt: site.videoUploads, limiet: site.videoLimiet });
  } catch (e) {
    console.error("Videobank laden:", e);
    return NextResponse.json({ error: "Kon de videobank niet laden." }, { status: 503 });
  } finally {
    if (werkmap) await ruimWerkmapOp(werkmap).catch(() => {});
  }
}


/** Een zojuist gecomprimeerde video (Rendi) meteen in de videobank zetten.
 * Zo overleeft hij het herladen van de pagina en staat hij in de bank, ook
 * als de eigenaar hem pas later ergens plaatst — zelfde principe als de
 * audiobank. Voorheen leefde zo'n video alleen in het browservenster tot de
 * chatbeurt hem ophaalde, en was hij na een herlaadbeurt spoorloos (20-09). */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { siteId?: number; commandId?: string } | null;
  if (!body?.siteId || !body.commandId)
    return NextResponse.json({ error: "Onvolledig verzoek" }, { status: 400 });
  const site = await magErbij(Number(body.siteId), userId);
  if (!site || site.isDemo) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  try {
    const { rendiStatus } = await import("@/lib/rendi");
    const st = await rendiStatus(body.commandId).catch(() => null);
    const videoUrl = st?.output_files?.out_1?.storage_url;
    if (!videoUrl) return NextResponse.json({ error: "De video is nog niet klaar." }, { status: 409 });
    const posterUrl = st?.output_files?.out_2?.storage_url ?? null;

    const ruw = videoUrl.split("/").pop()?.split("?")[0] ?? "";
    const naam = /^[a-z0-9-]+\.mp4$/i.test(ruw) ? ruw : `video-${Date.now().toString(36)}.mp4`;
    const videoPad = `video/${naam}`;
    const posterPad = posterUrl ? `video/${naam.replace(/\.mp4$/i, "")}-poster.jpg` : null;

    const haal = async (url: string) => Buffer.from((await fetch(url).then((x) => x.arrayBuffer())) as ArrayBuffer);

    // De video zelf gaat naar de media-opslag, niet in de siterepo: anders
    // wordt hij bij ELKE chatbeurt opnieuw met de site opgehaald. De worker
    // serveert /video/<naam> daar vandaan. De poster is een klein plaatje en
    // hoort wél bij de site (hij wordt in de HTML gebruikt als voorbeeld).
    if (!site.siteSlug) return NextResponse.json({ error: "Deze site staat nog niet online." }, { status: 409 });
    const { bewaarMediaVideo } = await import("@/lib/media");
    await bewaarMediaVideo(site.siteSlug, naam, await haal(videoUrl));

    // Poster is mooi meegenomen maar nooit reden om de hele bankactie te
    // laten mislukken: de video staat al veilig, en zonder deze vangrail
    // verdween ook het "staat in je videobank"-bericht stilletjes (20-09).
    try {
      const openConcept = await openConceptVan(site.id);
      if (posterPad && posterUrl) {
        const { pushBestanden } = await import("@/lib/github");
        const posterBestand = [{ pad: posterPad, inhoud: await haal(posterUrl) }];
        for (const tak of openConcept?.branch ? ["main", openConcept.branch] : ["main"])
          await pushBestanden(site.githubRepo, posterBestand, "Voorbeeldplaatje bij de video bewaard", tak);
      }
    } catch (e) {
      console.error("Poster bij de video bewaren:", e);
    }

    await db
      .update(sites)
      .set({ videoUploads: sql`${sites.videoUploads} + 1` })
      .where(eq(sites.id, site.id))
      .catch((e) => console.error("Videoteller bijwerken:", e));
    await db
      .insert(messages)
      .values([
        { siteId: site.id, rol: "klant" as const, tekst: `🎬 Video meegestuurd: ${naam}`, clerkUserId: userId },
        {
          siteId: site.id,
          rol: "assistent" as const,
          tekst: `Je video staat in de videobank (/${videoPad}). Typ waar hij moet komen, dan zet ik hem op je site.`,
          clerkUserId: userId,
        },
      ])
      .catch((e) => console.error("Videobank-berichten bewaren:", e));
    return NextResponse.json({ ok: true, pad: `/${videoPad}`, naam });
  } catch (e) {
    console.error("Video in de videobank zetten:", e);
    return NextResponse.json({ error: "Opslaan in de videobank lukte niet." }, { status: 503 });
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
    // Staat de video in de media-opslag, dan hoort hij daar weg; oudere
    // video's staan nog in de site zelf en gaan via git.
    if (site.siteSlug) {
      const { verwijderMediaVideo } = await import("@/lib/media");
      await verwijderMediaVideo(site.siteSlug, pad.split("/").pop() ?? pad).catch(() => {});
    }
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
