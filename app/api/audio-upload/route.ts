import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { MAX_AUDIO_BYTES } from "@/lib/media";

/** Audio-upload (podcasts e.d.) buiten de server om, zelfde weg als foto's en
 * video: een aflevering is zo 30–100 MB en een verzoek aan onze eigen functies
 * mag hooguit ~4,5 MB zijn. De browser zet het bestand rechtstreeks in de
 * Europese Blob-opslag; daarna verhuist /api/audiobank hem naar de media-map
 * van de site in R2 en ruimt de blob op. */

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const blobToken =
    process.env.BLOBEU_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken)
    return NextResponse.json(
      { error: "Audio-opslag is nog niet ingeschakeld." },
      { status: 503 },
    );
  try {
    const body = (await req.json()) as HandleUploadBody;
    const uit = await handleUpload({
      body,
      request: req,
      token: blobToken,
      onBeforeGenerateToken: async (_pad, clientPayload) => {
        const { siteId } = JSON.parse(clientPayload ?? "{}") as { siteId?: number };
        const [site] = await db
          .select()
          .from(sites)
          .where(eq(sites.id, Number(siteId)));
        if (!site || (!site.isDemo && site.clerkUserId !== userId && !(await isBeheerder())))
          throw new Error("Niet gevonden");
        if (site.isDemo) throw new Error("In de demo kun je geen audio meesturen.");
        return {
          allowedContentTypes: [
            "audio/mpeg",
            "audio/mp3",
            "audio/mp4",
            "audio/x-m4a",
            "audio/aac",
            "audio/ogg",
            "audio/wav",
            "audio/x-wav",
          ],
          maximumSizeInBytes: MAX_AUDIO_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ siteId: site.id, userId }),
        };
      },
      onUploadCompleted: async () => {
        // /api/audiobank verhuist de blob naar R2 zodra het portaal hem meldt
      },
    });
    return NextResponse.json(uit);
  } catch (e) {
    const melding = e instanceof Error ? e.message : "Upload mislukt.";
    console.error("Audio-upload:", e);
    return NextResponse.json({ error: melding }, { status: 400 });
  }
}
