import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { rendiCompleteUpload, rendiComprimeer, rendiInitUpload, rendiStatus } from "@/lib/rendi";

export const maxDuration = 60;

async function magErbij(siteId: number, userId: string) {
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site || (!site.isDemo && site.clerkUserId !== userId && !(await isBeheerder()))) return null;
  return site;
}

/** Video-upload in stappen (de browser praat alleen met ons; wij met Rendi):
 * ?stap=init → ?stap=deel (per 4 MB) → ?stap=klaar → ?stap=status */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!process.env.RENDI_API_KEY) {
    return NextResponse.json({ error: "Video-verwerking is nog niet ingeschakeld." }, { status: 503 });
  }
  const stap = new URL(req.url).searchParams.get("stap");

  try {
    if (stap === "init") {
      const { siteId, bestandsnaam, grootte } = (await req.json()) as {
        siteId: number; bestandsnaam: string; grootte: number;
      };
      const site = await magErbij(Number(siteId), userId);
      if (!site) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
      if (grootte > 500 * 1024 * 1024) return NextResponse.json({ error: "Video is te groot (max 500 MB)" }, { status: 400 });
      // Tegoed: standaard 10 video's per site; meer regelt WordSwap (limiet in de admin)
      if (site.videoUploads >= site.videoLimiet && !(await isBeheerder())) {
        return NextResponse.json(
          {
            error: `Je hebt de ${site.videoLimiet} video's uit je pakket gebruikt. Meer video's? Vraag het even aan via de chat of stuur een mail naar info@wordswap.nl — dan zetten we je tegoed hoger.`,
            limiet: true,
          },
          { status: 429 }
        );
      }
      const r = await rendiInitUpload(bestandsnaam.replace(/[^\w.-]+/g, "-"), grootte);
      return NextResponse.json(r);
    }

    if (stap === "deel") {
      // Eén deel doorzetten naar de presigned URL van Rendi; ETag terug
      const url = new URL(req.url).searchParams.get("url") ?? "";
      // Uitsluitend de presigned opslag-URL's van Rendi (Cloudflare R2) — onze
      // server mag nooit als doorgeefluik naar willekeurige adressen dienen
      let host = "";
      try { host = new URL(url).host; } catch { host = ""; }
      if (!/^https:\/\//.test(url) || !/\.r2\.cloudflarestorage\.com$/.test(host)) {
        return NextResponse.json({ error: "Ongeldige upload-URL" }, { status: 400 });
      }
      const data = await req.arrayBuffer();
      const up = await fetch(url, { method: "PUT", body: data, headers: { "Content-Length": String(data.byteLength) } });
      if (!up.ok) return NextResponse.json({ error: `Upload van een deel mislukte (${up.status})` }, { status: 502 });
      return NextResponse.json({ etag: up.headers.get("etag") ?? "" });
    }

    if (stap === "klaar") {
      const { fileId, parts, basisnaam, siteId } = (await req.json()) as {
        fileId: string; parts: { part_number: number; etag: string }[]; basisnaam: string; siteId?: number;
      };
      const site = siteId ? await magErbij(Number(siteId), userId) : null;
      if (site) {
        await db.update(sites).set({ videoUploads: site.videoUploads + 1 }).where(eq(sites.id, site.id));
      }
      const bestand = await rendiCompleteUpload(fileId, parts);
      const naam = (basisnaam || "video").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "video";
      const cmd = await rendiComprimeer(bestand.storage_url, `${naam}-v${Date.now().toString(36)}`);
      return NextResponse.json({ commandId: cmd.command_id });
    }

    if (stap === "status") {
      const { commandId } = (await req.json()) as { commandId: string };
      const s = await rendiStatus(commandId);
      const video = s.output_files?.out_1;
      const poster = s.output_files?.out_2;
      return NextResponse.json({
        status: s.status,
        fout: s.status === "FAILED" ? (s.error_message ?? "Comprimeren mislukt") : undefined,
        klaar: s.status === "SUCCESS" && Boolean(video?.storage_url),
        groottemb: video?.size_mbytes,
        videoUrl: video?.storage_url,
        posterUrl: poster?.storage_url,
      });
    }

    return NextResponse.json({ error: "Onbekende stap" }, { status: 400 });
  } catch (e) {
    console.error("Video-upload:", e);
    return NextResponse.json({ error: "Video-verwerking mislukte — probeer het zo nog eens." }, { status: 502 });
  }
}
