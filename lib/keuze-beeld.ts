/** Kieskaartjes met beeld: de AI levert per variant één regel
 * `KEUZES-BEELD: <naam> :: <svg .../>` en het portaal toont die als
 * aanklikbare kaartjes (icoontjes, kleurstalen). Zo hoeft er niets
 * tijdelijks op de pagina — het oude patroon (keuzeblok in het concept)
 * blijft alleen over voor complete secties, mét publiceer-bewaking.
 *
 * De svg wordt hier gesaneerd vóór hij de browser van de eigenaar in gaat:
 * de bron is onze eigen AI, maar een gereedschap kan haperen en een
 * huisregel kan genegeerd worden — dit bestand is de grens die dat opvangt.
 */

export const MAX_KAARTJES = 12;
const MAX_SVG_TEKENS = 4000;
const MAX_NAAM_TEKENS = 40;

/** Alleen teken-elementen; geen script, foreignObject, image, use, style of
 * animatie — een keuzekaartje is een plaatje, meer niet. */
const TOEGESTANE_TAGS = new Set([
  "svg", "g", "path", "circle", "ellipse", "rect", "line", "polyline",
  "polygon", "defs", "lineargradient", "radialgradient", "stop", "title",
  "desc", "mask", "clippath", "symbol", "text", "tspan",
]);

/** Keurt één svg goed of af. Afgekeurd = het kaartje vervalt stilletjes
 * (de regel is dan al uit de berichttekst gehaald, dus er blijft geen
 * halve code in de chat staan). */
export function saneerSvg(svg: string): string | null {
  const s = svg.trim();
  if (s.length > MAX_SVG_TEKENS) return null;
  if (!/^<svg[\s>]/i.test(s) || !/<\/svg>\s*$/i.test(s)) return null;
  // Zonder viewBox schaalt het kaartje niet mee en kan het uit zijn vak lopen
  if (!/viewBox\s*=/.test(s)) return null;
  // Geen commentaar/doctype/processing instructions: daar verstopt gedoe zich in
  if (/<!|<\?/.test(s)) return null;
  if (/on[a-z]+\s*=|javascript:|href|data:|url\s*\(\s*['"]?\s*http/i.test(s)) return null;
  for (const m of s.matchAll(/<\s*\/?\s*([a-zA-Z][\w:-]*)/g)) {
    if (!TOEGESTANE_TAGS.has(m[1].toLowerCase())) return null;
  }
  return s;
}

export type KeuzeKaartje = { naam: string; svg: string };

/** Haalt alle KEUZES-BEELD-regels uit een assistent-bericht. Ongeldige
 * regels (kapotte of afgekeurde svg) verdwijnen wél uit de tekst maar
 * leveren geen kaartje op. */
export function parseKeuzesBeeld(tekst: string): { schoon: string; kaartjes: KeuzeKaartje[] } {
  const kaartjes: KeuzeKaartje[] = [];
  const schoon = tekst
    .replace(/^[ \t]*KEUZES-BEELD:[ \t]*(.+)$/gm, (_, rest: string) => {
      const scheiding = rest.indexOf("::");
      if (scheiding > 0 && kaartjes.length < MAX_KAARTJES) {
        const naam = rest.slice(0, scheiding).trim().slice(0, MAX_NAAM_TEKENS);
        const svg = saneerSvg(rest.slice(scheiding + 2));
        if (naam && svg) kaartjes.push({ naam, svg });
      }
      return "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { schoon, kaartjes };
}
