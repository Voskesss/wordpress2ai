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
    if (blok.length >= 25 && blok.length <= 220) uit.add(blok);
    // lange alinea's ook per zin, voor deelwijzigingen binnen een alinea
    for (const zin of blok.split(/(?<=[.!?…])\s+/)) {
      const s = zin.trim();
      if (s.length >= 25 && s.length <= 220) uit.add(s);
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
      .filter((b) => b.length >= 25 && b.length <= 400),
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
  // Blokken per pagina (lui berekend), voor de divergentie-check hieronder
  const blokkenPer = new Map<string, Set<string>>();
  const blokkenVan = (p: string) => {
    let s = blokkenPer.get(p);
    if (!s) {
      s = new Set(blokken(nieuw.get(p) ?? ""));
      blokkenPer.set(p, s);
    }
    return s;
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

    // 1b. Divergentie: een blok dat hier is veranderd (ook alleen maar
    // uitgebreid) terwijl de OUDE versie elders nog letterlijk staat.
    // Op HELE blokken vergelijken, niet als substring: na "overal doorvoeren"
    // is de oude zin nog steeds het begin van de nieuwe alinea op elke pagina,
    // en als substring zou dat overal een vals alarm geven.
    const nieuweBlokkenHier = new Set(blokken(na));
    for (const blok of blokken(oud)) {
      if (nieuweBlokkenHier.has(blok)) continue; // blok hier ongewijzigd
      for (const ander of nieuweTekst.keys()) {
        if (ander === pad || gewijzigdeHtml.includes(ander)) continue;
        if (blokkenVan(ander).has(blok)) {
          if (!tekstMeldingen.has(blok)) tekstMeldingen.set(blok, new Set());
          tekstMeldingen.get(blok)!.add(ander);
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
