/**
 * Wat Google over een foto of document op de site leest. Een foto heeft een
 * omschrijving (alt-tekst) op elke plek waar hij staat; een document de tekst
 * van de link ernaartoe. Dirk-Jan vroeg waar hij kon zien "welke naam (voor
 * Google)" zijn foto's en bestanden hebben (02-10-2026): de bestandsnaam stond
 * in de banken, de omschrijving nergens.
 */

export type AltStand = {
  /** De verschillende omschrijvingen, meest gebruikte eerst */
  teksten: string[];
  /** Plekken zonder alt-attribuut: daar leest Google niets (fout) */
  zonder: number;
  /** Plekken met alt="": bewust leeg, voor een sierafbeelding (goed) */
  leeg: number;
};

const ontsnap = (t: string) =>
  t
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

/** Een verwijzing (src, srcset-deel of href) terugbrengen tot een pad in de site. */
export function padVanVerwijzing(ruw: string): string | null {
  let p = ruw.trim().split(/\s+/)[0] ?? "";
  if (!p || p.startsWith("data:") || p.startsWith("#") || p.startsWith("mailto:")) return null;
  p = p.replace(/^https?:\/\/[^/]+/i, "");
  p = p.split(/[?#]/)[0];
  try {
    p = decodeURI(p);
  } catch {
    /* laat staan */
  }
  return p.replace(/^\.?\/+/, "") || null;
}

const attribuut = (tag: string, naam: string): string | null => {
  const m = tag.match(new RegExp(`\\s${naam}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  return m ? (m[2] ?? m[3] ?? "") : null;
};

/** Per foto: welke omschrijvingen staan erbij, en waar ontbreekt hij. */
export function altTekstenPerBeeld(paginas: { inhoud: string }[]): Map<string, AltStand> {
  const tellers = new Map<string, { teksten: Map<string, number>; zonder: number; leeg: number }>();
  for (const { inhoud } of paginas) {
    for (const m of inhoud.matchAll(/<img\b[^>]*>/gi)) {
      const tag = m[0];
      const paden = new Set<string>();
      const src = attribuut(tag, "src");
      if (src) {
        const p = padVanVerwijzing(src);
        if (p) paden.add(p);
      }
      const srcset = attribuut(tag, "srcset");
      if (srcset)
        for (const deel of srcset.split(",")) {
          const p = padVanVerwijzing(deel);
          if (p) paden.add(p);
        }
      const alt = attribuut(tag, "alt");
      for (const p of paden) {
        const t = tellers.get(p) ?? { teksten: new Map(), zonder: 0, leeg: 0 };
        if (alt === null) t.zonder++;
        else if (!alt.trim()) t.leeg++;
        else {
          const tekst = ontsnap(alt).trim();
          t.teksten.set(tekst, (t.teksten.get(tekst) ?? 0) + 1);
        }
        tellers.set(p, t);
      }
    }
  }
  const uit = new Map<string, AltStand>();
  for (const [p, t] of tellers)
    uit.set(p, {
      teksten: [...t.teksten.entries()].sort((a, b) => b[1] - a[1]).map(([tekst]) => tekst),
      zonder: t.zonder,
      leeg: t.leeg,
    });
  return uit;
}

/** Per document: de teksten van de links ernaartoe (wat Google als naam ziet). */
export function linkTekstenPerDocument(paginas: { inhoud: string }[]): Map<string, string[]> {
  const uit = new Map<string, Set<string>>();
  for (const { inhoud } of paginas) {
    for (const m of inhoud.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
      const href = attribuut(` ${m[1]}`, "href");
      const p = href ? padVanVerwijzing(href) : null;
      if (!p || !/\.pdf$/i.test(p)) continue;
      const tekst = ontsnap(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim() || attribuut(` ${m[1]}`, "aria-label") || "";
      if (!tekst) continue;
      (uit.get(p) ?? uit.set(p, new Set()).get(p)!).add(tekst);
    }
  }
  return new Map([...uit].map(([p, s]) => [p, [...s]]));
}
