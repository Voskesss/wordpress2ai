import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { MAIL_BEELD_BREEDTE } from "@/lib/mailer";

/**
 * Afbeelding voor in een mail uit de admin-Mailer (bijvoorbeeld een
 * ontwerpvoorstel voor een lead). De afbeelding gaat naar de Blob-opslag en
 * krijgt een vast adres, zodat hij ook over een jaar nog laadt in de mailbox
 * van de ontvanger. JPEG, want oudere Outlook-versies tonen geen webp.
 */

export const maxDuration = 60;
const MAX_BYTES = 4 * 1024 * 1024; // boven ~4,5 MB weigert het platform het verzoek al

export async function POST(req: Request) {
  const user = await currentUser();
  if (user?.publicMetadata?.role !== "admin") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  const token = process.env.BLOBEU_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Afbeeldingsopslag is nog niet ingeschakeld." }, { status: 503 });
  }

  const form = await req.formData().catch(() => null);
  const bestand = form?.get("afbeelding");
  if (!(bestand instanceof File) || bestand.size === 0) {
    return NextResponse.json({ error: "Geen afbeelding ontvangen." }, { status: 400 });
  }
  if (bestand.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `De afbeelding is te groot (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB).` },
      { status: 400 },
    );
  }
  if (!/^image\//.test(bestand.type)) {
    return NextResponse.json({ error: "Dat is geen afbeelding." }, { status: 400 });
  }

  try {
    // Op mailbreedte zetten en als JPEG opslaan: scheelt laadtijd en spamscore,
    // en werkt in elke mailclient.
    const data = await sharp(Buffer.from(await bestand.arrayBuffer()))
      .rotate()
      .resize({ width: MAIL_BEELD_BREEDTE, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    const { url } = await put(`mail/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`, data, {
      access: "public",
      token,
      contentType: "image/jpeg",
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    return NextResponse.json({ url, bytes: data.length });
  } catch (e) {
    console.error("Mailafbeelding mislukt:", e);
    return NextResponse.json({ error: "Verwerken mislukte — probeer een andere afbeelding." }, { status: 500 });
  }
}
