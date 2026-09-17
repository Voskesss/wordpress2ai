import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Mobiel-controle voor chatwijzigingen. De stylesheet van een site regelt kolommen per schermbreedte
 * (media queries), maar een inline style="…" wint daar altijd van: zet de AI kolommen of vaste breedtes
 * direct in de HTML, dan blijft een telefoonpagina bijvoorbeeld drie kolommen breed (RoelArt, 17-09-2026).
 *
 * We verzamelen riskante inline-layout vóór en na een chatbeurt; alleen wat NIEUW is wordt teruggegeven,
 * zodat bestaande (vaak onschuldige) regels op oudere pagina's niet telkens opnieuw worden aangemerkt.
 */

function risicoInDeclaratie(eigenschap: string, waarde: string): boolean {
  const w = waarde.trim().toLowerCase();
  if (eigenschap === "grid-template-columns") {
    const herhaal = w.match(/repeat\(\s*(\d+)/);
    if (herhaal) return Number(herhaal[1]) >= 2;
    if (/auto-fit|auto-fill/.test(w)) return false;
    // Meerdere kolommen naast elkaar (bv. "1fr 1fr" of "300px 1fr")
    const sporen = w.replace(/\([^)]*\)/g, "x").split(/\s+/).filter(Boolean);
    return sporen.length >= 2;
  }
  if (eigenschap === "width" || eigenschap === "min-width") {
    const px = w.match(/^(\d+(?:\.\d+)?)px$/);
    return Boolean(px && Number(px[1]) >= 400);
  }
  if (eigenschap === "flex" || eigenschap === "flex-basis") {
    const px = w.match(/(\d+(?:\.\d+)?)px/);
    return Boolean(px && Number(px[1]) >= 320);
  }
  if (eigenschap === "columns" || eigenschap === "column-count") {
    return /\b[2-9]\b/.test(w);
  }
  return false;
}

/** Alle riskante inline-layoutregels in de HTML van de werkmap, als "pad :: eigenschap: waarde". */
export async function mobielRisicos(werkmap: string): Promise<Set<string>> {
  const { alleHtmlBestanden } = await import("@/lib/werkmap");
  const uit = new Set<string>();
  for (const rel of await alleHtmlBestanden(werkmap)) {
    const html = await readFile(path.join(werkmap, rel), "utf8").catch(() => "");
    if (!html.includes("style=")) continue;
    for (const m of html.matchAll(/\bstyle\s*=\s*"([^"]*)"|\bstyle\s*=\s*'([^']*)'/gi)) {
      for (const declaratie of (m[1] ?? m[2] ?? "").split(";")) {
        const i = declaratie.indexOf(":");
        if (i < 0) continue;
        const eigenschap = declaratie.slice(0, i).trim().toLowerCase();
        const waarde = declaratie.slice(i + 1).trim();
        if (risicoInDeclaratie(eigenschap, waarde)) uit.add(`${rel} :: ${eigenschap}: ${waarde}`);
      }
    }
  }
  return uit;
}

/** Nieuwe risico's ten opzichte van de stand vóór de chatbeurt. */
export function nieuweRisicos(voor: Set<string>, na: Set<string>): string[] {
  return [...na].filter((r) => !voor.has(r));
}
