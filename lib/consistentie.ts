/**
 * Consistentie-check ná een chatwijziging: puur mechanisch (geen AI). Als op
 * één pagina tekst of een foto is veranderd terwijl exact dezelfde tekst of
 * foto óók elders op de site staat (losse kopieën van hetzelfde blok, zoals
 * projectkaarten op home, overzicht én detailpagina), dan hoort daar een
 * deterministische melding van te komen zodat het nooit stilletjes half
 * gebeurt — tenzij de eigenaar bewust "alleen hier" wil.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { alleHtmlBestanden } from "./werkmap";

/** Zichtbare tekst uit HTML, genormaliseerd op witruimte. */
function kaleTekst(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Specifiek genoeg om op te zoeken: vanaf 12 tekens (korte koppen en
 * projectnamen tellen dus mee) én met echte letters erin, zodat losse
 * prijzen, getallen en datums geen ruis geven. */
const specifiek = (s: string, max: number) =>
  s.length >= 12 && s.length <= max && /\p{L}.*\p{L}.*\p{L}/u.test(s);

/** Tekstfragmenten die specifiek genoeg zijn om op te zoeken. Blok-gebaseerd
 * (per alinea/kop/lijstregel uit de HTML), zodat koppen en prijzen niet aan
 * een zin vastplakken en het fragment overal exact terug te vinden is. */
function fragmenten(html: string): string[] {
  const blokken = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .split(/<\/(?:p|h[1-6]|li|blockquote|figcaption|td|th|summary|dd|dt)>|<br\s*\/?\s*>/i)
    .map((b) => kaleTekst(b));
  const uit = new Set<string>();
  for (const blok of blokken) {
    if (specifiek(blok, 220)) uit.add(blok);
    // lange alinea's ook per zin, voor deelwijzigingen binnen een alinea
    for (const zin of blok.split(/(?<=[.!?…])\s+/)) {
      const s = zin.trim();
      if (specifiek(s, 220)) uit.add(s);
    }
  }
  return [...uit];
}

/** Hele tekstblokken (alinea/kop/lijstregel), voor de divergentie-check:
 * een blok dat op meerdere pagina's identiek stond en hier is veranderd —
 * óók door UITBREIDEN, waarbij de oude zin gewoon blijft staan — telt als
 * uit de pas gelopen kopie. */
function blokken(html: string): string[] {
  return [...new Set(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .split(/<\/(?:p|h[1-6]|li|blockquote|figcaption|td|th|summary|dd|dt)>|<br\s*\/?\s*>/i)
      .map((b) => kaleTekst(b))
      .filter((b) => specifiek(b, 400)),
  )];
}

/** Alle afbeeldingsverwijzingen (src, srcset-kandidaten en css-urls). */
function beeldPaden(html: string): Set<string> {
  const uit = new Set<string>();
  for (const m of html.matchAll(/(?:src|href)=["']([^"']+\.(?:webp|jpe?g|png|svg|gif|avif))["']/gi))
    uit.add(m[1]);
  for (const m of html.matchAll(/srcset=["']([^"']+)["']/gi))
    for (const deel of m[1].split(","))
      uit.add(deel.trim().split(/\s+/)[0]);
  for (const m of html.matchAll(/url\(["']?([^"')]+\.(?:webp|jpe?g|png|svg|gif|avif))["']?\)/gi))
    uit.add(m[1]);
  uit.delete("");
  return uit;
}

export const alsPagina = (pad: string) =>
  pad.startsWith("delen/")
    ? `een gedeeld blok (${pad.slice(6).replace(/\.html$/, "")})`
    : "/" + pad.replace(/index\.html$/, "").replace(/\.html$/, "");

export async function dubbelingsMeldingen(opties: {
  werkmap: string;
  gewijzigd: string[];
  /** Inhoud van het bestand vóór deze wijziging (null = nieuw bestand). */
  oudeInhoud: (pad: string) => Promise<string | null>;
}): Promise<string[]> {
  const { werkmap, gewijzigd, oudeInhoud } = opties;
  const gewijzigdeHtml = gewijzigd.filter((p) => p.endsWith(".html"));
  if (!gewijzigdeHtml.length) return [];

  // Nieuwe stand van de hele site één keer inlezen
  const allePaden = (await alleHtmlBestanden(werkmap)).filter((p) => !p.startsWith("wp2ai-"));
  const nieuw = new Map<string, string>();
  for (const p of allePaden)
    nieuw.set(p, await readFile(path.join(werkmap, p), "utf8").catch(() => ""));
  const nieuweTekst = new Map([...nieuw].map(([p, h]) => [p, " " + kaleTekst(h) + " "]));

  // Zoeken met woordgrenzen: "Kerststol-actie" mag niet meetellen binnen
  // "Kerststol-acties", anders is een hernoemde naam onzichtbaar.
  const telGrens = (tekst: string, stuk: string) => {
    const r = new RegExp(
      `(?<![\\p{L}\\p{N}])${stuk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`,
      "gu",
    );
    return (tekst.match(r) ?? []).length;
  };

  const tekstMeldingen = new Map<string, Set<string>>(); // fragment -> paden waar hij nog staat
  const beeldMeldingen = new Map<string, Set<string>>(); // beeldpad -> paden waar hij nog staat

  for (const pad of gewijzigdeHtml) {
    const oud = await oudeInhoud(pad);
    if (!oud) continue; // nieuw bestand: niets "achtergebleven"
    const na = nieuw.get(pad) ?? "";
    const naTekst = nieuweTekst.get(pad) ?? "";

    // 1. Tekst die hier (deels) is weggehaald/veranderd maar elders nog staat.
    // Op AANTALLEN vergelijken: staat de zin op deze pagina minder vaak dan
    // eerst, dan is er iets half doorgevoerd — ook als er op dezelfde pagina
    // nog een kopie staat (bv. een footer-regel).
    const oudeTekst = " " + kaleTekst(oud) + " ";
    const tel = (tekst: string, fragment: string) => tekst.split(fragment).length - 1;
    for (const fragment of fragmenten(oud)) {
      const voor = tel(oudeTekst, fragment);
      const na = tel(naTekst, fragment);
      if (na >= voor) continue; // niets van dit fragment verdwenen
      if (na > 0) {
        // Er staat er op deze pagina zelf ook nog één (bv. in de footer)
        if (!tekstMeldingen.has(fragment)) tekstMeldingen.set(fragment, new Set());
        tekstMeldingen.get(fragment)!.add(pad);
      }
      for (const [ander, tekst] of nieuweTekst) {
        if (ander === pad || gewijzigdeHtml.includes(ander)) continue;
        if (tekst.includes(fragment)) {
          if (!tekstMeldingen.has(fragment)) tekstMeldingen.set(fragment, new Set());
          tekstMeldingen.get(fragment)!.add(ander);
        }
      }
    }

    // 1b. Divergentie: een blok dat hier is veranderd — herschreven, hernoemd
    // of alleen maar uitgebreid — terwijl elders nog de OUDE versie staat.
    // Elk verdwenen oud blok wordt gepaard aan zijn nieuwe versie (grootste
    // gedeelde voor- en achterkant); elders zoeken we met woordgrenzen naar
    // het oude blok én naar de veranderde kern (op spatiegrenzen geknipt, zo
    // vangen we "Kerststol-actie" ook binnen een langere kop of alinea).
    // Melding alleen als de oude tekst er staat en de níéuwe niet: een pagina
    // die al is gelijkgetrokken bevat de oude zin nog als begin van de nieuwe
    // alinea, en die mag geen vals alarm geven.
    const oudeBlokkenHier = blokken(oud);
    const nieuweBlokkenHier = new Set(blokken(na));
    const oudeSet = new Set(oudeBlokkenHier);
    const nieuwAlleen = [...nieuweBlokkenHier].filter((b) => !oudeSet.has(b));
    for (const blok of oudeBlokkenHier) {
      if (nieuweBlokkenHier.has(blok)) continue; // blok hier ongewijzigd

      // Nieuwe tegenhanger zoeken: meeste gedeelde tekens aan begin + eind
      let paar: string | null = null;
      let paarP = 0;
      let paarS = 0;
      for (const kand of nieuwAlleen) {
        let p = 0;
        while (p < blok.length && p < kand.length && blok[p] === kand[p]) p++;
        let s = 0;
        const maxS = Math.min(blok.length, kand.length) - p;
        while (s < maxS && blok[blok.length - 1 - s] === kand[kand.length - 1 - s]) s++;
        if (p + s > paarP + paarS) {
          paar = kand;
          paarP = p;
          paarS = s;
        }
      }
      if (paar && paarP + paarS < blok.length / 2) paar = null; // te weinig overlap: geen tegenhanger

      // Waar zoeken we op: het hele oude blok, en (als die specifiek genoeg
      // is) de veranderde kern — teruggeknipt tot spatiegrenzen, zodat een
      // hernoemde naam heel blijft ("Kerststol-actie", niet "actie").
      const zoekParen: [string, string | null][] = [[blok, paar]];
      if (paar) {
        let p = paarP;
        while (p > 0 && !/\s/.test(blok[p - 1])) p--;
        let s = paarS;
        while (s > 0 && !/\s/.test(blok[blok.length - s])) s--;
        const oudKern = blok.slice(p, blok.length - s).trim();
        const nieuwKern = paar.slice(p, paar.length - s).trim();
        if (oudKern !== blok && specifiek(oudKern, 220))
          zoekParen.push([oudKern, nieuwKern || null]);
      }

      for (const [ander, tekst] of nieuweTekst) {
        if (ander === pad || gewijzigdeHtml.includes(ander)) continue;
        for (const [zoekOud, zoekNieuw] of zoekParen) {
          if (telGrens(tekst, zoekOud) === 0) continue;
          if (zoekNieuw && telGrens(tekst, zoekNieuw) > 0) continue; // daar al gelijkgetrokken
          if (!tekstMeldingen.has(zoekOud)) tekstMeldingen.set(zoekOud, new Set());
          tekstMeldingen.get(zoekOud)!.add(ander);
        }
      }
    }

    // 2. Foto's die hier zijn vervangen maar elders nog staan
    const beeldenNa = beeldPaden(na);
    for (const beeld of beeldPaden(oud)) {
      if (beeldenNa.has(beeld)) continue;
      for (const [ander, html] of nieuw) {
        if (ander === pad || gewijzigdeHtml.includes(ander)) continue;
        if (beeldPaden(html).has(beeld)) {
          if (!beeldMeldingen.has(beeld)) beeldMeldingen.set(beeld, new Set());
          beeldMeldingen.get(beeld)!.add(ander);
        }
      }
    }
  }

  const meldingen: string[] = [];
  for (const [fragment, paden] of [...tekstMeldingen].slice(0, 3)) {
    const lijst = [...paden].map(alsPagina);
    const kort = fragment.length > 70 ? fragment.slice(0, 67) + "..." : fragment;
    meldingen.push(
      `Let op: de tekst "${kort}" staat óók nog op ${lijst.slice(0, 3).join(" en ")}${lijst.length > 3 ? " en meer plekken" : ""}.`,
    );
  }
  for (const [beeld, paden] of [...beeldMeldingen].slice(0, 2)) {
    const lijst = [...paden].map(alsPagina);
    meldingen.push(
      `Let op: de foto die je hier verving (${path.basename(beeld)}) staat óók nog op ${lijst.slice(0, 3).join(" en ")}${lijst.length > 3 ? " en meer plekken" : ""}.`,
    );
  }
  return meldingen;
}
