/** Rendi (ffmpeg in de cloud): video's van klanten comprimeren zonder dat ze
 * door onze eigen server hoeven (Vercel kapt bij 4,5 MB per aanvraag).
 * Flow: init-upload → delen uploaden (via onze proxy, 4 MB per stuk) →
 * complete-upload → ffmpeg-opdracht → pollen → resultaat ophalen. */
const BASIS = "https://api.rendi.dev/v1";

function kop(): Record<string, string> {
  const sleutel = process.env.RENDI_API_KEY;
  if (!sleutel) throw new Error("RENDI_API_KEY ontbreekt");
  return { "X-API-KEY": sleutel, "Content-Type": "application/json" };
}

export const RENDI_DEELGROOTTE = 4 * 1024 * 1024; // past onder de Vercel-grens

export async function rendiInitUpload(bestandsnaam: string, grootte: number) {
  const res = await fetch(`${BASIS}/files/init-upload`, {
    method: "POST",
    signal: AbortSignal.timeout(30_000),
    headers: kop(),
    body: JSON.stringify({
      filename: bestandsnaam,
      size_bytes: grootte,
      is_private: false,
      part_size: RENDI_DEELGROOTTE,
    }),
  });
  if (!res.ok) throw new Error(`Rendi init-upload: ${res.status} ${await res.text()}`);
  return (await res.json()) as { file_id: string; part_size: number; upload_urls: string[] };
}

export async function rendiCompleteUpload(
  fileId: string,
  parts: { part_number: number; etag: string }[]
) {
  const res = await fetch(`${BASIS}/files/${fileId}/complete-upload`, {
    method: "POST",
    signal: AbortSignal.timeout(60_000),
    headers: kop(),
    body: JSON.stringify({ parts }),
  });
  if (!res.ok) throw new Error(`Rendi complete-upload: ${res.status} ${await res.text()}`);
  return (await res.json()) as { file_id: string; status: string; storage_url: string };
}

import { VIDEO_MAX_SECONDEN } from "./video-grens";
export { VIDEO_MAX_SECONDEN };

/** Comprimeert tot een web-video (H.264, 720p, mét geluid, max 3 minuten)
 * plus een poster-frame.
 *
 * Het geluid blijft bewust staan: dit recept kwam uit de huisregels voor
 * achtergrondvideo's (die spelen toch muted) en gooide met `-an` het geluid
 * weg — maar klanten sturen ook gewone video's met gesproken tekst mee, en
 * die kwamen zonder geluid op de site terecht (gezien 20-09). Een hero-video
 * krijgt van de AI altijd het muted-attribuut, dus de bezoeker hoort daar
 * nog steeds niets; alleen het bestand is een paar honderd kB groter. */
export async function rendiComprimeer(bronUrl: string, basisnaam: string) {
  const res = await fetch(`${BASIS}/run-ffmpeg-command`, {
    method: "POST",
    signal: AbortSignal.timeout(30_000),
    headers: kop(),
    body: JSON.stringify({
      input_files: { in_1: bronUrl },
      output_files: { out_1: `${basisnaam}.mp4`, out_2: `${basisnaam}-poster.jpg` },
      ffmpeg_command:
        `-i {{in_1}} -t ${VIDEO_MAX_SECONDEN} -vf scale=-2:720 -c:v libx264 -crf 28 -preset medium -pix_fmt yuv420p -c:a aac -b:a 96k -ac 2 -movflags +faststart {{out_1}} -ss 1 -frames:v 1 -vf scale=-2:720 -q:v 4 {{out_2}}`,
    }),
  });
  if (!res.ok) throw new Error(`Rendi run: ${res.status} ${await res.text()}`);
  return (await res.json()) as { command_id: string };
}

export type RendiStatus = {
  status: "QUEUED" | "PROCESSING" | "SUCCESS" | "FAILED" | string;
  error_message?: string;
  output_files?: Record<string, { storage_url: string; size_mbytes?: number; status?: string }>;
};

export async function rendiStatus(commandId: string): Promise<RendiStatus> {
  const res = await fetch(`${BASIS}/commands/${commandId}`, { headers: kop(), cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Rendi status: ${res.status}`);
  return (await res.json()) as RendiStatus;
}
