import { existsSync } from "node:fs";
import path from "node:path";

/** Persoonlijke inhoud van Jos op de site. Foto: zet een bestand op
 * public/team/jos.webp en hij verschijnt vanzelf overal. Video: vul de
 * YouTube-link hieronder in (wordt cookie-vrij ingesloten). */
export const JOS_VIDEO_URL = ""; // bv. "https://www.youtube.com/watch?v=XXXX"

export function josFoto(): string | null {
  return existsSync(path.join(process.cwd(), "public", "team", "jos.webp"))
    ? "/team/jos.webp"
    : null;
}

/** YouTube-link → cookie-vrije embed-URL (of null als er geen video is). */
export function josVideoEmbed(): string | null {
  const id = JOS_VIDEO_URL.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/)?.[1];
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}
