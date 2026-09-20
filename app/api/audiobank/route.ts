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
  const siteId = Number(new URL(req.url).searchParams.get("siteId"));
  const site = await magErbij(siteId, userId);
  if (!site?.siteSlug) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
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
  const { verwijderAudio } = await import("@/lib/media");
  await verwijderAudio(site.siteSlug, body.naam);
  return NextResponse.json({ ok: true });
}
