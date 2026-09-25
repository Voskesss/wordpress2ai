import { parse } from "parse5";

/**
 * Wat de oude site aan zoekmachines en deelknoppen vertelde, en of de nieuwe
 * site dat nog steeds doet. De oude pagina IS de opdracht: alles wat Yoast of
 * een ander SEO-plugin maakte staat in de bewaarde HTML. Een manifest is altijd
 * een uittreksel waarvan je vooraf moet bedenken wat erin hoort; de oude pagina
 * is compleet van nature.
 *
 * Gemeten 24-09-2026 over ovbuRo, RoelArt en Vakbeursonline: titel, canonical,
 * omschrijving en og:title kwamen goed over, maar deelplaatje, deeltekst en
 * artikeldatum verdwenen stil. Er ging niets kapot, er was alleen iets minder.
 *
 * Een echte HTML-lezer (parse5), geen losse patronen: Yoast schrijft zijn tags
 * met ENKELE aanhalingstekens (<meta name='robots' ...>), en een eerste meting
 * met reguliere expressies meldde daardoor overal "ontbreekt".
 *
 * Pure functies zonder I/O, net als lib/verlies.ts.
 */

export type SeoKenmerken = {
  titel?: string;
  omschrijving?: string;
  canonical?: string;
  noindex: boolean;
  ogTitel?: string;
  ogOmschrijving?: string;
  ogAfbeelding?: string;
  gepubliceerd?: string;
  /** Een artikel (Article/BlogPosting in JSON-LD; og:type zegt niets, want
   * Yoast zet "article" op elke gewone pagina). Alleen
   * daar telt de publicatiedatum. Yoast zet ook op elke gewone pagina een
   * datum, en die is voor Google en bezoekers betekenisloos. */
  isArtikel: boolean;
};

export type SeoVerschil = {
  /** weg = stond er en is weg (fout); anders = staat er anders (Jos beslist) */
  soort: "weg" | "anders";
  veld: keyof typeof VELDEN;
  oud: string;
  nieuw?: string;
};

/** Welke velden we vergelijken, met een naam die Jos in een melding begrijpt. */
export const VELDEN = {
  titel: "titel",
  omschrijving: "omschrijving voor Google",
  canonical: "canonical",
  ogTitel: "deeltitel (og:title)",
  ogOmschrijving: "deeltekst (og:description)",
  ogAfbeelding: "deelplaatje (og:image)",
  gepubliceerd: "publicatiedatum",
} as const;

/** Bij deze velden telt alleen of ze er zijn: een betere deeltekst is geen verlies. */
const ALLEEN_AANWEZIG = new Set<keyof typeof VELDEN>(["ogTitel", "ogOmschrijving", "ogAfbeelding"]);

type Knoop = {
  nodeName: string;
  tagName?: string;
  attrs?: { name: string; value: string }[];
  childNodes?: Knoop[];
  content?: Knoop;
  value?: string;
};

const attr = (k: Knoop, naam: string) =>
  k.attrs?.find((a) => a.name.toLowerCase() === naam)?.value;

function tekstVan(k: Knoop): string {
  if (k.nodeName === "#text") return k.value ?? "";
  return (k.childNodes ?? []).map(tekstVan).join("");
}

function* alle(k: Knoop): Generator<Knoop> {
  yield k;
  for (const kind of k.childNodes ?? []) yield* alle(kind);
  if (k.content) yield* alle(k.content);
}

const schoon = (s: string | undefined) => {
  const t = s?.replace(/\s+/g, " ").trim();
  return t ? t : undefined;
};

const ARTIKELTYPEN = /^(Article|BlogPosting|NewsArticle|Report|ScholarlyArticle|TechArticle)$/;

/** Zoekt datePublished en artikeltypen in JSON-LD, ook diep in een Yoast-@graph. */
function uitJsonLd(json: string): { datum?: string; artikel: boolean } {
  const uit: { datum?: string; artikel: boolean } = { artikel: false };
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return uit;
  }
  const stapel = [data];
  while (stapel.length) {
    const x = stapel.pop();
    if (Array.isArray(x)) stapel.push(...x);
    else if (x && typeof x === "object") {
      const o = x as Record<string, unknown>;
      const typen = ([] as unknown[]).concat(o["@type"] ?? []);
      const artikel = typen.some((t) => typeof t === "string" && ARTIKELTYPEN.test(t));
      if (artikel) uit.artikel = true;
      const w = o.datePublished;
      // De datum van het artikel zelf gaat voor die van de WebPage eromheen
      if (typeof w === "string" && w.trim() && (artikel || !uit.datum)) uit.datum = w.trim();
      stapel.push(...Object.values(o));
    }
  }
  return uit;
}

export function leesSeo(html: string): SeoKenmerken {
  const uit: SeoKenmerken = { noindex: false, isArtikel: false };
  const meta = new Map<string, string>();
  for (const k of alle(parse(html) as unknown as Knoop)) {
    if (k.tagName === "title" && uit.titel === undefined) uit.titel = schoon(tekstVan(k));
    else if (k.tagName === "meta") {
      const naam = (attr(k, "name") ?? attr(k, "property") ?? "").toLowerCase();
      const inhoud = attr(k, "content");
      if (naam && inhoud !== undefined && !meta.has(naam)) meta.set(naam, inhoud);
    } else if (k.tagName === "link") {
      const rel = (attr(k, "rel") ?? "").toLowerCase().split(/\s+/);
      if (rel.includes("canonical") && uit.canonical === undefined) uit.canonical = schoon(attr(k, "href"));
    } else if (k.tagName === "script" && (attr(k, "type") ?? "").toLowerCase() === "application/ld+json") {
      const ld = uitJsonLd(tekstVan(k));
      if (ld.artikel) uit.isArtikel = true;
      uit.gepubliceerd ??= ld.datum;
    }
  }
  uit.omschrijving = schoon(meta.get("description"));
  uit.noindex = /noindex/i.test(meta.get("robots") ?? "");
  uit.ogTitel = schoon(meta.get("og:title"));
  uit.ogOmschrijving = schoon(meta.get("og:description"));
  uit.ogAfbeelding = schoon(meta.get("og:image"));
  uit.gepubliceerd ??= schoon(meta.get("article:published_time"));
  return uit;
}

/** Het pad uit een (canonical-)URL, of undefined als het geen URL is. */
export function padVan(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url, "https://x.invalid").pathname;
  } catch {
    return undefined;
  }
}

/** Alleen de dag telt: tijdzone en seconden verschillen per plugin. */
const dag = (s: string) => s.slice(0, 10);

/** "Contact - VGK Adviseurs" en "Contact" zijn dezelfde titel: WordPress
 * plakt de sitenaam erachter, wij soms niet (of andersom). */
function zelfdeTitel(a: string, b: string): boolean {
  if (a === b) return true;
  const [kort, lang] = a.length < b.length ? [a, b] : [b, a];
  return lang.startsWith(kort) && /^\s+[-–—|·•]\s+\S/.test(lang.slice(kort.length));
}

/**
 * Vergelijkt oud met nieuw. Drie uitkomsten, anders blokkeert de poort straks
 * op verbeteringen en gaat iemand hem omzeilen:
 *   stond er, is weg          → "weg" (fout)
 *   stond er, is anders       → "anders" (tonen, Jos beslist)
 *   stond er niet, nu wel     → niets: dat is winst
 */
export function vergelijkSeo(oud: SeoKenmerken, nieuw: SeoKenmerken): SeoVerschil[] {
  const uit: SeoVerschil[] = [];
  for (const veld of Object.keys(VELDEN) as (keyof typeof VELDEN)[]) {
    const o = oud[veld];
    if (typeof o !== "string" || !o) continue;
    // Of een datum telt, bepaalt de OUDE pagina; de nieuwe mag hem ook
    // zonder JSON-LD geven (article:published_time, zoals actueel-sync doet).
    if (veld === "gepubliceerd" && !oud.isArtikel) continue;
    const n = nieuw[veld];
    if (typeof n !== "string" || !n) {
      uit.push({ soort: "weg", veld, oud: o });
      continue;
    }
    let gelijk: boolean;
    // Het domein wordt anders (VERVANG.nl, workers.dev): van een canonical telt het pad.
    if (ALLEEN_AANWEZIG.has(veld)) gelijk = true;
    else if (veld === "canonical") gelijk = padVan(o) === padVan(n);
    else if (veld === "gepubliceerd") gelijk = dag(o) === dag(n);
    else if (veld === "titel") gelijk = zelfdeTitel(o, n);
    else gelijk = o === n;
    if (!gelijk) uit.push({ soort: "anders", veld, oud: o, nieuw: n });
  }
  return uit;
}

/**
 * Diensten van derden die een bezoeker ziet of die meten. Regel Jos 25-09:
 * gelijkenis gaat vóór cookie-vrij. Een Maps-kaart die een link werd maakt de
 * kopie zichtbaar een andere site, en een verdwenen meetcode geeft een gat in
 * de statistieken. Een formulier dat stil wegvalt (Van den Berg: het
 * ActiveCampaign-boekjeformulier op Gratis, 25-09) is hetzelfde soort verlies.
 * Onzichtbare wissels tellen als gelijk: youtube.com mag
 * youtube-nocookie.com worden, Vimeo mag ?dnt=1 krijgen.
 */
export const DERDEN = {
  "google-tag": "Google Tag Manager/Analytics",
  "meta-pixel": "Facebook/Meta-pixel",
  "google-maps": "Google Maps-kaart",
  youtube: "YouTube-video",
  vimeo: "Vimeo-video",
  instagram: "Instagram-blok",
  activecampaign: "ActiveCampaign (tracking of formulier)",
  formulier: "formulier",
} as const;
export type Derde = keyof typeof DERDEN;

export function derdenVan(html: string): Set<Derde> {
  const uit = new Set<Derde>();
  for (const k of alle(parse(html) as unknown as Knoop)) {
    if (k.tagName === "script") {
      const bron = `${attr(k, "src") ?? ""} ${tekstVan(k)}`;
      if (/googletagmanager\.com|gtag\(/.test(bron)) uit.add("google-tag");
      if (/connect\.facebook\.net|fbq\(\s*['"]init/.test(bron)) uit.add("meta-pixel");
      if (/instagram\.com\/embed/.test(bron)) uit.add("instagram");
      if (/diffuser\.js|vgo\(\s*['"]setAccount|activehosted\.com/.test(bron)) uit.add("activecampaign");
    } else if (k.tagName === "iframe") {
      // Lazy-load-plugins zetten de echte bron in een data-attribuut
      const src = ["src", "data-src", "data-wpfc-original-src", "data-lazy-src"].map((a) => attr(k, a) ?? "").join(" ");
      if (/google\.[a-z.]+\/maps/.test(src)) uit.add("google-maps");
      if (/youtube(-nocookie)?\.com\/embed|templates\/youtube\.html#/.test(src)) uit.add("youtube");
      if (/player\.vimeo\.com/.test(src)) uit.add("vimeo");
      if (/instagram\.com/.test(src)) uit.add("instagram");
    } else if (k.tagName === "blockquote" && /instagram-media/.test(attr(k, "class") ?? "")) {
      uit.add("instagram");
    } else if (k.tagName === "form") {
      // Zoekvakken tellen niet: die bouwen we anders (lib/zoeken.ts)
      const soort = `${attr(k, "role") ?? ""} ${attr(k, "class") ?? ""}`;
      if (!/search|zoek/i.test(soort)) uit.add("formulier");
    } else if (k.tagName === "div" && /(^|\s)_form_\d+(\s|$)/.test(attr(k, "class") ?? "")) {
      // ActiveCampaign-insluitcode: het formulier verschijnt pas in de browser
      uit.add("formulier");
    }
  }
  return uit;
}
