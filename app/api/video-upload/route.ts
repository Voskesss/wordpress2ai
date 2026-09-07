import { auth } from "@clerk/nextjs/server";
import { del } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { rendiComprimeer, rendiStatus } from "@/lib/rendi";

export const maxDuration = 60;

const MAX_VIDEO = 500 * 1024 * 1024;

async function magErbij(siteId: number, userId: string) {
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site || (!site.isDemo && site.clerkUserId !== userId && !(await isBeheerder()))) return null;
  return site;
}

/** Video-upload: de browser zet het bestand rechtstreeks in Vercel Blob
 * (grote bestanden, buiten onze server om), Rendi haalt het daar op en
 * comprimeert, daarna ruimen we het origineel op.
 * ?stap=token → ?stap=klaar → ?stap=status */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  // Europese Blob-store (Frankfurt): eigen prefix BLOBEU_, daarom geven we
  // het token overal expliciet mee in plaats van op de standaardnaam te leunen
  const blobToken = process.env.BLOBEU_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN;
  if (!process.env.RENDI_API_KEY || !blobToken) {
    return NextResponse.json({ error: "Video-verwerking is nog niet ingeschakeld." }, { status: 503 });
  }
  const stap = new URL(req.url).searchParams.get("stap");

  try {
    if (stap === "token") {
      // Upload-toestemming voor de browser: alleen na controle van site en tegoed
      const body = (await req.json()) as HandleUploadBody;
      const uit = await handleUpload({
        body,
        request: req,
        token: blobToken,
        onBeforeGenerateToken: async (_pad, clientPayload) => {
          const { siteId } = JSON.parse(clientPayload ?? "{}") as { siteId?: number };
          const site = await magErbij(Number(siteId), userId);
          if (!site) throw new Error("Niet gevonden");
          if (site.videoUploads >= site.videoLimiet && !(await isBeheerder())) {
            throw new Error(
              `Je hebt de ${site.videoLimiet} video's uit je pakket gebruikt. Meer video's? Vraag het even aan via de chat of mail info@wordswap.nl — dan zetten we je tegoed hoger.`
            );
          }
          return {
            allowedContentTypes: ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"],
            maximumSizeInBytes: MAX_VIDEO,
            addRandomSuffix: true,
            tokenPayload: JSON.stringify({ siteId: site.id, userId }),
          };
        },
        onUploadCompleted: async () => {
          // Verwerking start pas als de browser ?stap=klaar aanroept
        },
      });
      return NextResponse.json(uit);
    }

    if (stap === "klaar") {
      const { siteId, blobUrl, basisnaam } = (await req.json()) as {
        siteId: number; blobUrl: string; basisnaam: string;
      };
      const site = await magErbij(Number(siteId), userId);
      if (!site) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
      let host = "";
      try { host = new URL(blobUrl).host; } catch { host = ""; }
      if (!/\.public\.blob\.vercel-storage\.com$/.test(host)) {
        return NextResponse.json({ error: "Ongeldige video-URL" }, { status: 400 });
      }
      const naam = (basisnaam || "video").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "video";
      const cmd = await rendiComprimeer(blobUrl, `${naam}-v${Date.now().toString(36)}`);
      await db.update(sites).set({ videoUploads: site.videoUploads + 1 }).where(eq(sites.id, site.id));
      return NextResponse.json({ commandId: cmd.command_id });
    }

    if (stap === "status") {
      const { commandId, blobUrl } = (await req.json()) as { commandId: string; blobUrl?: string };
      const s = await rendiStatus(commandId);
      const video = s.output_files?.out_1;
      const poster = s.output_files?.out_2;
      const klaar = s.status === "SUCCESS" && Boolean(video?.storage_url);
      if ((klaar || s.status === "FAILED") && blobUrl) {
        // Origineel opruimen: het gecomprimeerde resultaat staat bij Rendi
        del(blobUrl, { token: blobToken }).catch(() => {});
      }
      return NextResponse.json({
        status: s.status,
        fout: s.status === "FAILED" ? (s.error_message ?? "Comprimeren mislukt") : undefined,
        klaar,
        groottemb: video?.size_mbytes,
        videoUrl: video?.storage_url,
        posterUrl: poster?.storage_url,
      });
    }

    return NextResponse.json({ error: "Onbekende stap" }, { status: 400 });
  } catch (e) {
    console.error("Video-upload:", e);
    const melding = e instanceof Error ? e.message : "Video-verwerking mislukte";
    return NextResponse.json({ error: melding }, { status: /tegoed|pakket/.test(melding) ? 429 : 502 });
  }
}
