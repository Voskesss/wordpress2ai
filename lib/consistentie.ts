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

/** Zichtbare tekst uit HTML, genormaliseerd op witruimte en typografie
 * (rechte/krullende aanhalingstekens en streepjes tellen als hetzelfde,
 * anders glipt een kopie met nét andere leestekens erdoor). */
function kaleTekst(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/[’‘]|&#39;|&apos;/g, "'")
    .replace(/[“”„]|&quot;/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Onzichtbare tekst van een pagina: foto-omschrijvingen (alt), titels,
 * meta-omschrijvingen en gestructureerde gegevens — wat Google wél leest
 * maar een bezoeker niet ziet. */
function onzichtbareTekst(html: string): string {
  const stukken: string[] = [];
  for (const m of html.matchAll(/(?:alt|title|aria-label|content)=["']([^"']+)["']/gi))
    stukken.push(m[1]);
  const titel = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titel) stukken.push(titel[1]);
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi))
    stukken.push(m[1]);
  return " " + kaleTekst(`<x>${stukken.join(" | ")}</x>`) + " ";
}

/** Contactgegevens en andere harde feiten uit de RUWE html (dus ook uit
 * alt-teksten, tel:/mailto:-links en JSON-LD), genormaliseerd zodat
 * "038-1234567" en "038 123 45 67" hetzelfde nummer zijn. */
function gegevens(html: string): Map<string, { soort: string; toon: string }> {
  const uit = new Map<string, { soort: string; toon: string }>();
  const zet = (sleutel: string, soort: string, toon: string) => {
    if (!uit.has(sleutel)) uit.set(sleutel, { soort, toon });
  };
  for (const m of html.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g))
    zet(`mail|${m[0].toLowerCase()}`, "het e-mailadres", m[0]);
  for (const m of html.matchAll(/(?:\+31|0031|0)[\s\-().]{0,3}\d(?:[\s\-().]{0,3}\d){7,9}/g)) {
    const cijfers = m[0].replace(/\D/g, "").replace(/^(?:0031|31)/, "0");
    if (cijfers.length === 10 && cijfers.startsWith("0"))
      zet(`tel|${cijfers}`, "het telefoonnummer", m[0].trim());
  }
  for (const m of html.matchAll(/\bNL\d{2}\s?[A-Z]{4}(?:\s?\d{4}){2}\s?\d{2}\b/g))
    zet(`iban|${m[0].replace(/\s/g, "")}`, "het rekeningnummer", m[0]);
  for (const m of html.matchAll(/\b(\d{4})\s?([A-Z]{2})\b/g))
    zet(`pc|${m[1]}${m[2]}`, "de postcode", m[0]);
  return uit;
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

/** Eén vondst van het vangnet, machine-leesbaar: wat er oud is blijven staan,
 * wat (indien bekend) de nieuwe versie is, en op welke bestanden. Hiermee kan
 * "Overal doorvoeren" mechanisch, zonder dat de AI opnieuw hoeft te zoeken. */
export type VangnetVondst = {
  soort: "tekst" | "onzichtbaar" | "gegeven" | "beeld";
  /** Genormaliseerde oude tekst (of het beeldpad) zoals het vangnet hem vond */
  oud: string;
  /** De nieuwe tegenhanger, als het vangnet die kon paren; anders null */
  nieuw: string | null;
  /** Bestandspaden (relatief) waar de oude versie nog staat */
  paden: string[];
};

export async function dubbelingsMeldingen(opties: Parameters<typeof dubbelingsRapport>[0]): Promise<string[]> {
  return (await dubbelingsRapport(opties)).meldingen;
}

export async function dubbelingsRapport(opties: {
  werkmap: string;
  gewijzigd: string[];
  /** Inhoud van het bestand vóór deze wijziging (null = nieuw bestand). */
  oudeInhoud: (pad: string) => Promise<string | null>;
}): Promise<{ meldingen: string[]; vondsten: VangnetVondst[] }> {
  const { werkmap, gewijzigd, oudeInhoud } = opties;
  const gewijzigdeHtml = gewijzigd.filter((p) => p.endsWith(".html"));
  if (!gewijzigdeHtml.length) return { meldingen: [], vondsten: [] };

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
      "giu", // hoofdletterongevoelig: "kerststol-actie" en "Kerststol-actie" zijn dezelfde kopie
    );
    return (tekst.match(r) ?? []).length;
  };

  // Onzichtbare tekst en gegevens per pagina, lui berekend
  const onzichtbaarPer = new Map<string, string>();
  const onzichtbaarVan = (p: string) => {
    let s = onzichtbaarPer.get(p);
    if (s === undefined) {
      s = onzichtbareTekst(nieuw.get(p) ?? "");
      onzichtbaarPer.set(p, s);
    }
    return s;
  };
  const gegevensPer = new Map<string, Map<string, { soort: string; toon: string }>>();
  const gegevensVan = (p: string) => {
    let g = gegevensPer.get(p);
    if (!g) {
      g = gegevens(nieuw.get(p) ?? "");
      gegevensPer.set(p, g);
    }
    return g;
  };

  const tekstMeldingen = new Map<string, Set<string>>(); // fragment -> paden waar hij nog staat
  const nieuwPer = new Map<string, string | null>(); // fragment -> nieuwe tegenhanger (als gepaard)
  const beeldMeldingen = new Map<string, Set<string>>(); // beeldpad -> paden waar hij nog staat
  const onzichtbaarMeldingen = new Map<string, Set<string>>(); // fragment -> paden (alt/titel/meta)
  const gegevensMeldingen = new Map<string, { soort: string; toon: string; paden: Set<string> }>();

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
        // Lagere drempel dan bij losse fragmenten: dit is een GEPAARDE
        // hernoeming (oud→nieuw uit dezelfde alinea), dus het signaal is
        // sterk. "Spoedcursus" (11 tekens) glipte anders onder de 12 door,
        // terwijl hij nog in vijf alt-teksten stond. Wel echte letters
        // eisen, zodat prijzen en getallen ("64"→"70") geen ruis geven.
        if (oudKern !== blok && oudKern.length >= 5 && oudKern.length <= 220 && /\p{L}.*\p{L}.*\p{L}/u.test(oudKern))
          zoekParen.push([oudKern, nieuwKern || null]);
      }

      for (const [ander, tekst] of nieuweTekst) {
        if (ander === pad || gewijzigdeHtml.includes(ander)) continue;
        for (const [zoekOud, zoekNieuw] of zoekParen) {
          if (telGrens(tekst, zoekOud) === 0) continue;
          if (zoekNieuw && telGrens(tekst, zoekNieuw) > 0) continue; // daar al gelijkgetrokken
          if (!tekstMeldingen.has(zoekOud)) tekstMeldingen.set(zoekOud, new Set());
          tekstMeldingen.get(zoekOud)!.add(ander);
          if (zoekNieuw) nieuwPer.set(zoekOud, zoekNieuw);
        }
      }

      // Ook in ONZICHTBARE tekst zoeken (alt-teksten, paginatitels,
      // meta-omschrijvingen, JSON-LD) — mét de eigen pagina, want een
      // hernoemde naam blijft het vaakst hangen in de alt-tekst van de foto
      // ernaast. Google leest die wél.
      for (const ander of nieuw.keys()) {
        if (ander !== pad && gewijzigdeHtml.includes(ander)) continue;
        const verborgen = onzichtbaarVan(ander);
        for (const [zoekOud, zoekNieuw] of zoekParen) {
          if (telGrens(verborgen, zoekOud) === 0) continue;
          if (zoekNieuw && telGrens(verborgen, zoekNieuw) > 0) continue;
          if (tekstMeldingen.get(zoekOud)?.has(ander)) continue; // al gemeld als gewone tekst
          if (!onzichtbaarMeldingen.has(zoekOud)) onzichtbaarMeldingen.set(zoekOud, new Set());
          onzichtbaarMeldingen.get(zoekOud)!.add(ander);
          if (zoekNieuw) nieuwPer.set(zoekOud, zoekNieuw);
        }
      }
    }

    // 1d. Contactgegevens en harde feiten: een telefoonnummer, e-mailadres,
    // rekeningnummer of postcode die hier is veranderd of weggehaald maar
    // elders (zichtbaar óf onzichtbaar) nog staat. Onder de 12-tekens-drempel
    // van de tekstchecks, dus een eigen patroon-gebaseerde controle — dit
    // zijn precies de feiten die op élke pagina kloppen moeten.
    const oudeGegevens = gegevens(oud);
    const nieuweGegevens = gegevens(na);
    for (const [sleutel, g] of oudeGegevens) {
      if (nieuweGegevens.has(sleutel)) continue; // hier niet verdwenen
      for (const ander of nieuw.keys()) {
        if (ander === pad || gewijzigdeHtml.includes(ander)) continue;
        if (!gegevensVan(ander).has(sleutel)) continue;
        if (!gegevensMeldingen.has(sleutel))
          gegevensMeldingen.set(sleutel, { ...g, paden: new Set() });
        gegevensMeldingen.get(sleutel)!.paden.add(ander);
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
  const vondsten: VangnetVondst[] = [];
  for (const [fragment, paden] of [...tekstMeldingen].slice(0, 3)) {
    const lijst = [...paden].map(alsPagina);
    const kort = fragment.length > 70 ? fragment.slice(0, 67) + "..." : fragment;
    meldingen.push(
      `Let op: de tekst "${kort}" staat óók nog op ${lijst.slice(0, 3).join(" en ")}${lijst.length > 3 ? " en meer plekken" : ""}.`,
    );
    vondsten.push({ soort: "tekst", oud: fragment, nieuw: nieuwPer.get(fragment) ?? null, paden: [...paden] });
  }
  for (const g of [...gegevensMeldingen.values()].slice(0, 3)) {
    const lijst = [...g.paden].map(alsPagina);
    meldingen.push(
      `Let op: ${g.soort} ${g.toon} staat óók nog op ${lijst.slice(0, 3).join(" en ")}${lijst.length > 3 ? " en meer plekken" : ""}.`,
    );
    vondsten.push({ soort: "gegeven", oud: g.toon, nieuw: null, paden: [...g.paden] });
  }
  for (const [fragment, paden] of [...onzichtbaarMeldingen].slice(0, 2)) {
    const lijst = [...paden].map((p) => (gewijzigdeHtml.includes(p) ? "deze pagina zelf" : alsPagina(p)));
    const kort = fragment.length > 70 ? fragment.slice(0, 67) + "..." : fragment;
    meldingen.push(
      `Let op: de oude tekst "${kort}" staat óók nog in onzichtbare tekst (een foto-omschrijving, paginatitel of zoekmachine-omschrijving) op ${lijst.slice(0, 3).join(" en ")}${lijst.length > 3 ? " en meer plekken" : ""}.`,
    );
    vondsten.push({ soort: "onzichtbaar", oud: fragment, nieuw: nieuwPer.get(fragment) ?? null, paden: [...paden] });
  }
  for (const [beeld, paden] of [...beeldMeldingen].slice(0, 2)) {
    const lijst = [...paden].map(alsPagina);
    meldingen.push(
      `Let op: de foto die je hier verving (${path.basename(beeld)}) staat óók nog op ${lijst.slice(0, 3).join(" en ")}${lijst.length > 3 ? " en meer plekken" : ""}.`,
    );
    vondsten.push({ soort: "beeld", oud: beeld, nieuw: null, paden: [...paden] });
  }
  return { meldingen, vondsten };
}
