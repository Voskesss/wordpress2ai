/**
 * De media-map van een site in R2: grote bestanden (nu: audio/podcasts) die
 * NIET in de GitHub-repo horen — te groot voor git (100 MB-grens) en de
 * historie zou de repo blijvend laten groeien. Ze staan onder een eigen
 * top-voorvoegsel `media/<slug>/...`, búíten het site-voorvoegsel dat de
 * deploy-sync beheert, zodat een publicatie ze nooit opruimt. De live- én de
 * werkversie-worker lezen dezelfde map (zie lib/worker-r2.ts): een aflevering
 * staat dus meteen in het voorbeeld en hoeft niet dubbel opgeslagen.
 *
 * Verwijderen is bewust een aparte, expliciete actie (audiobank), nooit een
 * bijeffect van een concept weggooien — zelfde principe als de fotobank:
 * meegestuurde bestanden gaan nooit stilletjes verloren.
 */
import { lijstSleutels, schrijfObject, verwijderObject, zorgBucket } from "./r2";

export const MAX_AUDIO_BYTES = 150 * 1024 * 1024;
export const AUDIO_EXTENSIES = /\.(mp3|m4a|aac|ogg|wav)$/i;
export const VIDEO_EXTENSIES = /\.(mp4|webm|mov)$/i;

/** Bestandsnaam veilig en voorspelbaar: kleine letters, streepjes, extensie behouden. */
export function schoneAudioNaam(naam: string): string {
  const basis = naam.split("/").pop() ?? naam;
  const punt = basis.lastIndexOf(".");
  const stam = (punt >= 0 ? basis.slice(0, punt) : basis)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "aflevering";
  const ext = (punt >= 0 ? basis.slice(punt) : "").toLowerCase();
  return `${stam}${ext}`;
}

const audioPrefix = (slug: string) => `media/${slug}/audio/`;
const videoPrefix = (slug: string) => `media/${slug}/video/`;

/** Alle afleveringen van een site, nieuwste bovenaan (op naam is niet te
 * sorteren, dus de aanroeper toont ze zoals R2 ze geeft — alfabetisch). */
export async function lijstAudio(slug: string): Promise<string[]> {
  const sleutels = await lijstSleutels(audioPrefix(slug)).catch(() => []);
  return sleutels
    .map((s) => s.slice(audioPrefix(slug).length))
    .filter((n) => n && AUDIO_EXTENSIES.test(n));
}

const MIME_VOOR: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
};

export async function bewaarAudio(slug: string, naam: string, data: Buffer): Promise<string> {
  await zorgBucket();
  const schoon = schoneAudioNaam(naam);
  const ext = schoon.slice(schoon.lastIndexOf("."));
  await schrijfObject(`${audioPrefix(slug)}${schoon}`, data, MIME_VOOR[ext] ?? "application/octet-stream");
  return schoon;
}

export async function verwijderAudio(slug: string, naam: string): Promise<void> {
  const schoon = schoneAudioNaam(naam);
  await verwijderObject(`${audioPrefix(slug)}${schoon}`);
}

/** Video's in de media-opslag. Nieuwe video's komen hier terecht in plaats
 * van in de siterepo: een gecomprimeerde video is al gauw een paar MB, en
 * die haalden we bij ELKE chatbeurt opnieuw op met de rest van de site.
 * Bestaande video's in repo's blijven gewoon werken — de worker kijkt eerst
 * in de site zelf en daarna hier. */
export async function lijstMediaVideo(slug: string): Promise<{ naam: string; bytes: number }[]> {
  const { lijstObjecten } = await import("./r2");
  const prefix = videoPrefix(slug);
  const rijen = await lijstObjecten(prefix).catch(() => []);
  return rijen
    .map((r) => ({ naam: r.key.slice(prefix.length), bytes: r.size }))
    .filter((r) => r.naam && VIDEO_EXTENSIES.test(r.naam));
}

export async function bewaarMediaVideo(
  slug: string,
  naam: string,
  data: Buffer,
  contentType = "video/mp4",
): Promise<string> {
  await zorgBucket();
  const schoon = schoneAudioNaam(naam);
  await schrijfObject(`${videoPrefix(slug)}${schoon}`, data, contentType);
  return schoon;
}

export async function verwijderMediaVideo(slug: string, naam: string): Promise<void> {
  await verwijderObject(`${videoPrefix(slug)}${schoneAudioNaam(naam)}`);
}
