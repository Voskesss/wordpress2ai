import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { changes, messages, sites } from "@/db/schema";
import { documentAdres, schoneNaamDelen, staatLive, vrijeNaam } from "@/lib/document-adres";
import { magBewerken, logActiviteit } from "@/lib/toegang";

/** Een foto rechtstreeks in de fotobank zetten, zonder de chat. Verkleind op
 * dezelfde maat als een foto uit de chat (1600px breed, webp q78), in de site
 * bewaard en meteen online, zodat de link direct te kopiëren is. Een bestaande
 * foto wordt nooit overschreven. */

export const maxDuration = 120;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { siteId?: number; blobUrl?: string; naam?: string } | null;
  if (!body?.siteId || !body.blobUrl || !body.naam) return NextResponse.json({ error: "Onvolledig verzoek" }, { status: 400 });
  const [site] = await db.select().from(sites).where(eq(sites.id, Number(body.siteId)));
  if (!site || site.isDemo || (!(await magBewerken(site, userId))))
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  {
    const { magLiveSchrijven, REM_MELDING } = await import("@/lib/omgeving");
    if (!magLiveSchrijven(site)) return NextResponse.json({ error: REM_MELDING, melding: REM_MELDING }, { status: 403 });
  }
  if (!/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//.test(body.blobUrl))
    return NextResponse.json({ error: "Ongeldig bestandsadres" }, { status: 400 });

  try {
    const antwoord = await fetch(body.blobUrl);
    if (!antwoord.ok) return NextResponse.json({ error: "Foto niet gevonden in de upload-opslag." }, { status: 400 });
    const origineel = Buffer.from(await antwoord.arrayBuffer());
    const sharp = (await import("sharp")).default;
    // Zelfde instellingen als de chat (app/api/chat/route.ts, verwerkFoto)
    const data = await sharp(origineel).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
    const { meetFotoKwaliteit, kwaliteitsWaarschuwing } = await import("@/lib/foto-kwaliteit");
    const kwaliteit = kwaliteitsWaarschuwing(await meetFotoKwaliteit(origineel));

    const [openConcept] = await db
      .select()
      .from(changes)
      .where(and(eq(changes.siteId, site.id), eq(changes.status, "concept")))
      .orderBy(desc(changes.id))
      .limit(1);
    const takken = openConcept?.branch ? ["main", openConcept.branch] : ["main"];
    const { lijstBestanden, pushBestanden } = await import("@/lib/github");
    const bestaand = new Set<string>();
    for (const tak of takken) for (const b of await lijstBestanden(site.githubRepo, tak).catch(() => [])) bestaand.add(b);
    const { stam } = schoneNaamDelen(body.naam, "foto");
    const pad = `afbeeldingen/${vrijeNaam(stam, ".webp", bestaand, (n) => `afbeeldingen/${n}`)}`;
    for (const tak of takken) await pushBestanden(site.githubRepo, [{ pad, inhoud: data }], "Foto bewaard in de fotobank", tak);

    // Meteen ook op de live site (alleen dit nieuwe bestand, geen pagina's)
    if (site.siteSlug) {
      try {
        const { schrijfObject } = await import("@/lib/r2");
        await schrijfObject(`${site.siteSlug}/${pad}`, data, "image/webp");
      } catch (e) {
        console.error("Foto direct live zetten:", e);
      }
    }
    try {
      const { del } = await import("@vercel/blob");
      const token = process.env.BLOBEU_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN;
      if (token) await del(body.blobUrl, { token });
    } catch (e) {
      console.error("Blob opruimen na fotobank:", e);
    }
    const adres = documentAdres(site, pad);
    const live = adres ? await staatLive(adres) : false;
    await db
      .insert(messages)
      .values([
        { siteId: site.id, rol: "klant" as const, tekst: `🖼️ Foto geüpload in de fotobank: ${body.naam}`, clerkUserId: userId },
        {
          siteId: site.id,
          rol: "assistent" as const,
          tekst: `Je foto staat in de fotobank (/${pad}).${live && adres ? ` Hij staat al online: ${adres}` : ""} Wil je hem op een pagina, kies hem dan in de fotobank of typ waar hij moet komen.`,
          clerkUserId: userId,
        },
      ])
      .catch((e) => console.error("Fotobank-berichten bewaren:", e));
    await logActiviteit(site.id, userId, "upload", `Foto geüpload: ${pad}`);
    return NextResponse.json({ ok: true, pad, grootte: data.length, adres, live, kwaliteit });
  } catch (e) {
    console.error("Foto in de fotobank zetten:", e);
    return NextResponse.json({ error: "Opslaan in de fotobank lukte niet." }, { status: 503 });
  }
}
