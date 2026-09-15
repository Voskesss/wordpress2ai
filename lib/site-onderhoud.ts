import { readFile } from "node:fs/promises";
import path from "node:path";
import { alleHtmlBestanden, CONTROLE_MAP } from "@/lib/werkmap";

/** Nabewerking bij publiceren: sitemap.xml en llms.txt kloppend maken met de
 * pagina's die er nu echt zijn. Dit gebeurt bewust NIET tijdens de chatbeurt —
 * de eigenaar wacht daar op zichtbaar resultaat, niet op administratie.
 * Volledig deterministisch (geen AI): pagina's toevoegen/verwijderen op basis
 * van de bestanden, met titel en metabeschrijving van de pagina zelf. */

type Pagina = {
  /** URL-pad met slash vooraan en achteraan, bv. "/" of "/project/treinbeleving/" */
  urlPad: string;
  titel: string;
  beschrijving: string | null;
};

function urlPadVoor(bestand: string): string {
  const p = bestand.replace(/index\.html?$/i, "").replace(/\.html?$/i, "/");
  return "/" + p.replace(/^\/+/, "");
}

function kaal(s: string) {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function leesPaginas(werkmap: string): Promise<Pagina[]> {
  const bestanden = (await alleHtmlBestanden(werkmap)).filter(
    (b) => !b.startsWith("delen/") && !b.startsWith(`${CONTROLE_MAP}/`),
  );
  const paginas: Pagina[] = [];
  for (const bestand of bestanden.sort()) {
    const html = (
      await readFile(path.join(werkmap, bestand), "utf8")
    ).slice(0, 300_000);
    // Pagina's die zelf zeggen dat ze niet vindbaar horen te zijn (404,
    // bedankt-pagina's) horen ook niet in sitemap of llms.txt.
    if (
      /<meta[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html) ||
      /<meta[^>]*content=["'][^"']*noindex[^"']*["'][^>]*name=["']robots["']/i.test(html)
    )
      continue;
    const ruweTitel = kaal(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
    // "Treinbeleving | ovbuRo" → "Treinbeleving"
    const titel = ruweTitel.split(/\s*\|\s*|\s+—\s+|\s+–\s+/)[0].trim();
    const beschrijving =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] ??
      html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1] ??
      null;
    paginas.push({
      urlPad: urlPadVoor(bestand),
      titel: titel || urlPadVoor(bestand),
      beschrijving: beschrijving ? kaal(beschrijving).slice(0, 200) : null,
    });
  }
  return paginas;
}

/** Basis-URL (bv. "https://VERVANG.nl" of het echte domein) uit bestaande inhoud. */
function basisUit(inhoud: string): string | null {
  return inhoud.match(/https?:\/\/[^/\s"'<)]+/)?.[0] ?? null;
}

function sitemapBijwerken(bestaand: string, paginas: Pagina[]): string | null {
  // Basis uit de eerste <loc> halen — niet uit de xmlns-regel bovenaan
  const basis = bestaand.match(/<loc>\s*(https?:\/\/[^/\s<]+)/)?.[1] ?? null;
  if (!basis) return null;
  const gewenst = paginas.map((p) => `${basis}${p.urlPad}`);
  const bestaandeBlokken = [...bestaand.matchAll(/<url>[\s\S]*?<\/url>/g)].map((m) => m[0]);
  const blokVoor = new Map<string, string>();
  for (const blok of bestaandeBlokken) {
    const loc = blok.match(/<loc>\s*([^<\s]+)\s*<\/loc>/)?.[1];
    if (loc) blokVoor.set(loc, blok);
  }
  // Bestaande volgorde behouden; nieuwe pagina's achteraan; verdwenen eruit.
  const volgorde = [
    ...[...blokVoor.keys()].filter((u) => gewenst.includes(u)),
    ...gewenst.filter((u) => !blokVoor.has(u)),
  ];
  const regels = volgorde.map(
    (u) => blokVoor.get(u) ?? `<url><loc>${u}</loc></url>`,
  );
  const nieuw = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${regels.map((r) => `  ${r}`).join("\n")}\n</urlset>\n`;
  return nieuw === bestaand ? null : nieuw;
}

function llmsBijwerken(bestaand: string, paginas: Pagina[]): string | null {
  const kop = bestaand.match(/^## Pagina'?s\s*$/im);
  if (!kop || kop.index === undefined) return null;
  const basis = basisUit(bestaand.slice(kop.index));
  if (!basis) return null;
  const begin = kop.index + kop[0].length;
  const rest = bestaand.slice(begin);
  // De lijst loopt tot de volgende kop of het einde van het bestand
  const eindeLijst = rest.search(/\n#{1,6} /);
  const lijst = eindeLijst === -1 ? rest : rest.slice(0, eindeLijst);
  const regels = lijst.split("\n");
  const urlVan = (regel: string) => regel.match(/\]\(([^)]+)\)/)?.[1]?.replace(/\/?$/, "/");
  const gewenst = new Map(paginas.map((p) => [`${basis}${p.urlPad}`, p]));
  // Bestaande regels (met hun handgeschreven beschrijving) behouden zolang de
  // pagina bestaat; verdwenen pagina's eruit.
  const behouden = regels.filter((r) => {
    if (!/^\s*- \[/.test(r)) return true; // lege regels e.d. laten staan
    const u = urlVan(r);
    return u !== undefined && gewenst.has(u);
  });
  const alGenoemd = new Set(regels.map(urlVan).filter(Boolean));
  const nieuwe = paginas
    .filter((p) => !alGenoemd.has(`${basis}${p.urlPad}`))
    .map(
      (p) =>
        `- [${p.titel}](${basis}${p.urlPad})${p.beschrijving ? `: ${p.beschrijving}` : ""}`,
    );
  let nieuweLijst = behouden.join("\n");
  if (nieuwe.length) nieuweLijst = `${nieuweLijst.replace(/\s+$/, "")}\n${nieuwe.join("\n")}\n`;
  const nieuw =
    bestaand.slice(0, begin) +
    nieuweLijst +
    (eindeLijst === -1 ? "" : rest.slice(eindeLijst));
  return nieuw === bestaand ? null : nieuw;
}

/** Geeft de bij te werken bestanden terug (leeg = alles klopt al). Werkt alleen
 * met overzichten die al bestaan; sites zonder sitemap/llms blijven ongemoeid. */
export async function werkOverzichtenBij(
  werkmap: string,
): Promise<{ pad: string; inhoud: Buffer }[]> {
  const paginas = await leesPaginas(werkmap);
  if (!paginas.length) return [];
  const uit: { pad: string; inhoud: Buffer }[] = [];
  for (const [bestand, bijwerken] of [
    ["sitemap.xml", sitemapBijwerken],
    ["llms.txt", llmsBijwerken],
  ] as const) {
    const bestaand = await readFile(path.join(werkmap, bestand), "utf8").catch(
      () => null,
    );
    if (bestaand === null) continue;
    const nieuw = bijwerken(bestaand, paginas);
    if (nieuw !== null) uit.push({ pad: bestand, inhoud: Buffer.from(nieuw) });
  }
  return uit;
}
