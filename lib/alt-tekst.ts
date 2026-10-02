/** Alt-tekst (omschrijving) van één aangewezen foto zelf aanpassen, zonder
 * AI (wens Jos 02-10). We zoeken de <img> op zijn bestandsnaam én zijn
 * huidige omschrijving, zodat alleen precies die foto verandert, ook als
 * dezelfde foto elders een andere omschrijving heeft. Puur tekstwerk, los
 * van de route, zodat de test door het echte pad loopt. */

const ONTSNAP: Record<string, string> = { "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" };

/** Voor in een attribuut tussen dubbele aanhalingstekens. */
export function alsAttribuut(tekst: string): string {
  return tekst.replace(/[&"<>]/g, (t) => ONTSNAP[t]);
}

/** Entiteiten terug naar tekst, zodat "&amp;" en "&" als gelijk gelden. */
function ontcijfer(tekst: string): string {
  return tekst
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

const normaal = (t: string) => ontcijfer(t).replace(/\s+/g, " ").trim();

/** Bestandsnaam uit een src, zonder map, query of host:
 * "https://x.nl/afbeeldingen/a.webp?v=2" → "a.webp". */
export function bestandsnaamVan(src: string): string {
  return decodeURIComponent(src.replace(/[?#].*$/, "").split("/").pop() ?? "");
}

function attribuut(tag: string, naam: string): string | null {
  const m = tag.match(new RegExp(`\\s${naam}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"));
  return m ? m[2] : null;
}

/** Hoort deze <img>-tag bij de aangewezen foto (zelfde bestand, zelfde
 * huidige omschrijving)? Een lege oude omschrijving telt ook als "geen alt". */
function isDeFoto(tag: string, src: string, oudeAlt: string): boolean {
  const eigenSrc = attribuut(tag, "src");
  if (!eigenSrc || bestandsnaamVan(eigenSrc) !== bestandsnaamVan(src)) return false;
  return normaal(attribuut(tag, "alt") ?? "") === normaal(oudeAlt);
}

/** Hoe vaak staat de aangewezen foto (met deze omschrijving) in de HTML? */
export function telFoto(html: string, src: string, oudeAlt: string): number {
  return (html.match(/<img\b[^>]*>/gi) ?? []).filter((t) => isDeFoto(t, src, oudeAlt)).length;
}

/** Zet de nieuwe omschrijving op elke <img> die de aangewezen foto is. */
export function vervangAltTekst(html: string, src: string, oudeAlt: string, nieuweAlt: string): { html: string; aantal: number } {
  let aantal = 0;
  const nieuw = alsAttribuut(nieuweAlt.replace(/\s+/g, " ").trim());
  const uit = html.replace(/<img\b[^>]*>/gi, (tag) => {
    if (!isDeFoto(tag, src, oudeAlt)) return tag;
    aantal++;
    return /\salt\s*=\s*(["'])[\s\S]*?\1/i.test(tag)
      ? tag.replace(/\salt\s*=\s*(["'])[\s\S]*?\1/i, ` alt="${nieuw}"`)
      : tag.replace(/^<img\b/i, `<img alt="${nieuw}"`);
  });
  return { html: uit, aantal };
}
