import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { messages, sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";

/** De audiobank van een site: afleveringen in de media-map in R2, los van de
 * GitHub-repo en de deploy-sync. Verwijderen is hier een bewuste actie; een
 * concept weggooien raakt deze bestanden nooit. */

export const maxDuration = 300; // een aflevering van 150 MB verhuizen kost even

async function magErbij(siteId: number, userId: string) {
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site || site.isDemo) return null;
  if (site.clerkUserId !== userId && !(await isBeheerder())) return null;
  return site;
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const url = new URL(req.url);
  const siteId = Number(url.searchParams.get("siteId"));
  const site = await magErbij(siteId, userId);
  if (!site?.siteSlug) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  // Eén bestand afspelen? Rechtstreeks uit de media-opslag doorsluizen.
  // Niet via de site-worker: die kent het /audio/-adres pas nadat de site
  // opnieuw is uitgerold, waardoor een net geüploade aflevering in de bank
  // stil bleef (20-09). Zo speelt hij altijd, ook vóór het publiceren.
  const bestand = url.searchParams.get("bestand");
  if (bestand) {
    const { AUDIO_EXTENSIES, schoneAudioNaam } = await import("@/lib/media");
    if (!AUDIO_EXTENSIES.test(bestand)) return new Response("Niet gevonden", { status: 404 });
    const { streamObject } = await import("@/lib/r2");
    const res = await streamObject(
      `media/${site.siteSlug}/audio/${schoneAudioNaam(bestand)}`,
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

  const { lijstAudio } = await import("@/lib/media");
  return NextResponse.json({ audio: await lijstAudio(site.siteSlug), limiet: site.audioLimiet });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as
    | { siteId?: number; blobUrl?: string; naam?: string }
    | null;
  if (!body?.siteId || !body.blobUrl || !body.naam)
    return NextResponse.json({ error: "Onvolledig verzoek" }, { status: 400 });
  const site = await magErbij(Number(body.siteId), userId);
  if (!site?.siteSlug) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  // Alleen blobs uit onze eigen opslag verhuizen — nooit een willekeurig adres ophalen
  const blobHost = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//;
  if (!blobHost.test(body.blobUrl))
    return NextResponse.json({ error: "Ongeldig bestandsadres" }, { status: 400 });

  const { AUDIO_EXTENSIES, MAX_AUDIO_BYTES, bewaarAudio, lijstAudio, schoneAudioNaam } = await import("@/lib/media");
  if (!AUDIO_EXTENSIES.test(body.naam))
    return NextResponse.json({ error: "Alleen audio (mp3, m4a, aac, ogg, wav)." }, { status: 400 });

  const bestaand = await lijstAudio(site.siteSlug);
  const schoon = schoneAudioNaam(body.naam);
  if (!bestaand.includes(schoon) && bestaand.length >= site.audioLimiet)
    return NextResponse.json(
      { error: `De audiobank zit vol (${site.audioLimiet} bestanden). Verwijder eerst een oude aflevering, of vraag ons om meer ruimte.` },
      { status: 409 },
    );

  const antwoord = await fetch(body.blobUrl);
  if (!antwoord.ok)
    return NextResponse.json({ error: "Bestand niet gevonden in de upload-opslag." }, { status: 400 });
  const data = Buffer.from(await antwoord.arrayBuffer());
  if (data.length > MAX_AUDIO_BYTES)
    return NextResponse.json({ error: "Bestand is te groot (max 150 MB)." }, { status: 400 });
  const naam = await bewaarAudio(site.siteSlug, body.naam, data);

  // Tijdelijke blob opruimen; mislukt dat, dan verloopt hij vanzelf
  try {
    const { del } = await import("@vercel/blob");
    const token = process.env.BLOBEU_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN;
    if (token) await del(body.blobUrl, { token });
  } catch (e) {
    console.error("Blob opruimen na audiobank:", e);
  }
  // In de gespreksgeschiedenis vastleggen: de volgende chatbeurt ("zet hem
  // naast de kop X") moet kunnen weten om welke aflevering het gaat — het
  // portaal toont deze berichten al, maar de AI leest alleen de database.
  await db
    .insert(messages)
    .values([
      { siteId: site.id, rol: "klant", tekst: `🎧 Audio meegestuurd: ${body.naam}`, clerkUserId: userId },
      {
        siteId: site.id,
        rol: "assistent",
        tekst: `Je audio staat klaar in de audiobank (/audio/${naam}). Typ waar hij moet komen, dan zet ik er een nette speler neer.`,
        clerkUserId: userId,
      },
    ])
    .catch((e) => console.error("Audiobank-berichten bewaren:", e));
  return NextResponse.json({ ok: true, naam, pad: `/audio/${naam}` });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { siteId?: number; naam?: string } | null;
  if (!body?.siteId || !body.naam)
    return NextResponse.json({ error: "Onvolledig verzoek" }, { status: 400 });
  const site = await magErbij(Number(body.siteId), userId);
  if (!site?.siteSlug) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  // Staat er nog een speler op de site? Dan niet weggooien: die pagina zou
  // een stille, kapotte speler overhouden. Zowel het openstaande concept als
  // de gepubliceerde versie nakijken.
  const { changes } = await import("@/db/schema");
  const { and, desc } = await import("drizzle-orm");
  const { alleBestandenVan, laadWerkmap, ruimWerkmapOp } = await import("@/lib/werkmap");
  const { alsPagina } = await import("@/lib/consistentie");
  const { readFile } = await import("node:fs/promises");
  const path = (await import("node:path")).default;
  const [openConcept] = await db
    .select()
    .from(changes)
    .where(and(eq(changes.siteId, site.id), eq(changes.status, "concept")))
    .orderBy(desc(changes.id))
    .limit(1);
  const zoek = `/audio/${body.naam}`;
  const mappen: string[] = [];
  try {
    for (const tak of openConcept?.branch ? [openConcept.branch, undefined] : [undefined]) {
      const map = await laadWerkmap(site.githubRepo, tak);
      mappen.push(map);
      for (const b of (await alleBestandenVan(map)).filter((x) => /\.html?$/i.test(x))) {
        const inhoud = await readFile(path.join(map, b), "utf8").catch(() => "");
        if (inhoud.includes(zoek))
          return NextResponse.json(
            {
              error: `Deze audio staat nog op je website (${alsPagina(b)})${
                tak ? " in je openstaande concept" : ""
              }. Vraag in de chat eerst om de speler daar weg te halen; daarna kun je het bestand hier opruimen.`,
            },
            { status: 409 },
          );
      }
    }
  } finally {
    for (const m of mappen) await ruimWerkmapOp(m).catch(() => {});
  }

  const { verwijderAudio } = await import("@/lib/media");
  await verwijderAudio(site.siteSlug, body.naam);
  return NextResponse.json({ ok: true });
}
