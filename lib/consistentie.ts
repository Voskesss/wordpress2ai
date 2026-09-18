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

/** Tekstfragmenten die specifiek genoeg zijn om op te zoeken (geen losse woorden). */
function fragmenten(html: string): string[] {
  const tekst = kaleTekst(html);
  return [...new Set(
    tekst
      .split(/(?<=[.!?;:…])\s+|\s{3,}/)
      .map((z) => z.trim())
      .filter((z) => z.length >= 25 && z.length <= 220),
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

const alsPagina = (pad: string) =>
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

  const tekstMeldingen = new Map<string, Set<string>>(); // fragment -> paden waar hij nog staat
  const beeldMeldingen = new Map<string, Set<string>>(); // beeldpad -> paden waar hij nog staat

  for (const pad of gewijzigdeHtml) {
    const oud = await oudeInhoud(pad);
    if (!oud) continue; // nieuw bestand: niets "achtergebleven"
    const na = nieuw.get(pad) ?? "";
    const naTekst = nieuweTekst.get(pad) ?? "";

    // 1. Tekst die hier is weggehaald/veranderd maar elders nog staat
    for (const fragment of fragmenten(oud)) {
      if (naTekst.includes(fragment)) continue; // staat hier gewoon nog
      for (const [ander, tekst] of nieuweTekst) {
        if (ander === pad || gewijzigdeHtml.includes(ander)) continue;
        if (tekst.includes(fragment)) {
          if (!tekstMeldingen.has(fragment)) tekstMeldingen.set(fragment, new Set());
          tekstMeldingen.get(fragment)!.add(ander);
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
