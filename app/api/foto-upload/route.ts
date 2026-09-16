import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";

/** Foto-upload buiten de server om. Een verzoek aan onze eigen functies mag
 * hooguit ~4,5 MB zijn; daarboven weigert het platform het vóór onze code.
 * Telefoonfoto's zijn zo 10 MB en een galerij bestaat uit tientallen foto's,
 * dus zet de browser ze rechtstreeks in de Europese Blob-opslag (zelfde weg
 * als video) en stuurt daarna alleen de adressen mee met het chatbericht.
 * De chat-route haalt ze op, verwerkt ze en ruimt ze meteen weer op. */

const MAX_FOTO = 25 * 1024 * 1024;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const blobToken =
    process.env.BLOBEU_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken)
    return NextResponse.json(
      { error: "Foto-opslag is nog niet ingeschakeld." },
      { status: 503 },
    );
  try {
    const body = (await req.json()) as HandleUploadBody;
    const uit = await handleUpload({
      body,
      request: req,
      token: blobToken,
      onBeforeGenerateToken: async (_pad, clientPayload) => {
        const { siteId } = JSON.parse(clientPayload ?? "{}") as {
          siteId?: number;
        };
        const [site] = await db
          .select()
          .from(sites)
          .where(eq(sites.id, Number(siteId)));
        if (
          !site ||
          (!site.isDemo &&
            site.clerkUserId !== userId &&
            !(await isBeheerder()))
        )
          throw new Error("Niet gevonden");
        // Demo: geen eigen foto's (zelfde regel als in de chat)
        if (site.isDemo) throw new Error("In de demo kun je geen foto's meesturen.");
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/avif",
            "image/heic",
          ],
          maximumSizeInBytes: MAX_FOTO,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ siteId: site.id, userId }),
        };
      },
      onUploadCompleted: async () => {
        // De chat-route haalt de foto op zodra het bericht binnenkomt
      },
    });
    return NextResponse.json(uit);
  } catch (e) {
    const melding = e instanceof Error ? e.message : "Upload mislukt.";
    console.error("Foto-upload:", e);
    return NextResponse.json({ error: melding }, { status: 400 });
  }
}
