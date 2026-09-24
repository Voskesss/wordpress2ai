/**
 * Eén foto, meerdere maten.
 *
 * Bij de migratie werd elke afbeelding omgezet naar WebP op 2000px breed. Dat
 * is goed voor de kwaliteit maar één maat voor iedereen: een telefoon van
 * 390px laadt dan een beeld met zes keer meer beeldpunten dan hij kan tonen.
 * Bij één foto valt dat weg, bij een raster van 174 werken is dat het verschil
 * tussen een snelle en een trage site. Gemeten bij rolandbroekhuis.nl:
 * 1,8 MB aan beeld op de homepage, 13 seconden voor de site bruikbaar was.
 *
 * De varianten worden bij de migratie geschreven, de srcset wordt bij de
 * UITROL toegevoegd. Bewust niet door de AI: die zou het een keer vergeten en
 * dan is het stil fout. Mechanisch bij het uitrollen kan dat niet.
 *
 * Zuivere functies, zodat ze zonder bestanden te testen zijn.
 */

/** Breedtes die we naast het origineel wegschrijven. 2000 houdt zijn eigen
 * naam, zodat bestaande verwijzingen in oude sites blijven werken. */
export const VARIANT_BREEDTES = [600, 1200] as const;
export const VOLLE_BREEDTE = 2000;

/** foto.webp + 600 -> foto-600.webp */
export function variantNaam(bestand: string, breedte: number): string {
  return bestand.replace(/\.webp$/i, `-${breedte}.webp`);
}

/**
 * Hoe groot het beeld op het scherm ongeveer wordt.
 *
 * Bewust ruim: kiest de browser te klein, dan is het beeld wazig en dat ziet
 * iedereen. Kiest hij te groot, dan is het alleen trager, en dat is precies de
 * situatie van nu. Te groot is dus niet erger dan niets doen, te klein wel.
 */
const SIZES = "(max-width: 800px) 100vw, 1200px";

const IMG = /<img\b[^>]*>/gi;

/**
 * Zet srcset op elke <img> die naar een afbeelding wijst waarvan we varianten
 * hebben. Laat alles met de rug naar zich toe staan:
 * - een img die al een srcset heeft blijft zoals hij is (handwerk wint)
 * - een bestand zonder varianten blijft zoals het is
 * - alles buiten /afbeeldingen/ blijft zoals het is (logo's, iconen)
 */
export function zetSrcset(html: string, bestaandeBestanden: Set<string>): string {
  return html.replace(IMG, (tag) => {
    if (/\bsrcset=/i.test(tag)) return tag;
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (!src || !/^\/afbeeldingen\/[^"']+\.webp$/i.test(src)) return tag;

    const zonderSlash = src.replace(/^\//, "");
    const beschikbaar = VARIANT_BREEDTES.filter((b) =>
      bestaandeBestanden.has(variantNaam(zonderSlash, b))
    );
    if (beschikbaar.length === 0) return tag;

    const kandidaten = [
      ...beschikbaar.map((b) => `${variantNaam(src, b)} ${b}w`),
      `${src} ${VOLLE_BREEDTE}w`,
    ].join(", ");
    return tag.replace(/<img\b/i, `<img srcset="${kandidaten}" sizes="${SIZES}"`);
  });
}
