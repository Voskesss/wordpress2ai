import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * Centrale site-onderdelen: bestanden in `delen/` (menu.html, footer.html,
 * referenties.html, ...) worden op pagina's ingevoegd waar een marker staat:
 *   <!--invoeg:menu-->
 * De repo blijft de bron mét markers; bij het serveren/deployen wordt
 * uitgevouwen zodat bezoekers complete HTML krijgen.
 */
const INVOEG_PATROON = /<!--\s*invoeg:([a-z0-9-]+)\s*-->/gi;

export function vouwUit(html: string, delen: Map<string, string>): string {
  if (delen.size === 0) return html;
  return html.replace(INVOEG_PATROON, (marker, naam: string) => {
    const inhoud = delen.get(naam.toLowerCase());
    // Onbekende marker laten staan: dan valt hij op in plaats van stil te verdwijnen
    return inhoud !== undefined ? inhoud : marker;
  });
}

/** Leest alle delen/*.html uit een werkmap; lege map als er geen delen zijn. */
export async function laadDelen(dir: string): Promise<Map<string, string>> {
  const delen = new Map<string, string>();
  try {
    const items = await readdir(path.join(dir, "delen"));
    for (const item of items) {
      if (!/\.html?$/i.test(item)) continue;
      const naam = item.replace(/\.html?$/i, "").toLowerCase();
      delen.set(naam, await readFile(path.join(dir, "delen", item), "utf8"));
    }
  } catch {
    // geen delen-map: prima
  }
  return delen;
}
