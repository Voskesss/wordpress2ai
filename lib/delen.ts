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

/**
 * Hoe diep een deel in een deel mag zitten. Een zoekvak hoort in het menu, en
 * het menu is zelf een deel: zonder meerdere rondes bleef die marker gewoon als
 * commentaar in de pagina staan. De grens vangt een deel dat zichzelf invoegt.
 */
const MAX_RONDES = 5;

export function vouwUit(html: string, delen: Map<string, string>): string {
  if (delen.size === 0) return html;
  let uit = html;
  for (let ronde = 0; ronde < MAX_RONDES; ronde++) {
    let verandering = false;
    uit = uit.replace(INVOEG_PATROON, (marker, naam: string) => {
      const inhoud = delen.get(naam.toLowerCase());
      // Onbekende marker laten staan: dan valt hij op in plaats van stil te verdwijnen
      if (inhoud === undefined) return marker;
      verandering = true;
      return inhoud;
    });
    if (!verandering) break;
  }
  return uit;
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
