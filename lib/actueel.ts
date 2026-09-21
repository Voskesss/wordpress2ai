/**
 * Actueel-sync: nieuwsartikelen van een externe feed als STATISCHE pagina's op
 * een klantsite zetten.
 *
 * Waarom: kantoren nemen vaak een nieuwsdienst af (bv. Accountantsportal) die
 * normaal via een WordPress-plugin publiceert. Zonder WordPress halen wij de
 * feed periodiek zelf op en genereren we er gewone HTML-pagina's van, in de
 * huisstijl van de site. Dat leest alleen — de bron van de klant wordt nooit
 * aangeraakt.
 *
 * Vormgeving hoort bij de SITE, niet bij deze motor: elke klantrepo heeft
 * `sjablonen/actueel-artikel.html` en `sjablonen/actueel-overzicht.html` met
 * {{plaatshouders}}, plus `sjablonen/actueel.json` voor de paden. Zo werkt
 * dezelfde sync voor elke klant, met elk zijn eigen ontwerp.
 */
import { leesBestand, lijstBestanden, pushBestanden } from "./github";

export type FeedArtikel = {
  slug: string;
  titel: string;
  samenvatting: string;
  inhoudHtml: string;
  datumIso: string;
  auteur: string;
  afbeeldingUrl: string | null;
};

export type ActueelInstellingen = {
  /** Map waarin artikelpagina's komen; "" = in de wortel (zoals WordPress vaak doet). */
  artikelPad: string;
  /** Map van de overzichtspagina, bv. "actueel". */
  overzichtPad: string;
  /** Map voor de artikelafbeeldingen. */
  afbeeldingPad: string;
  /** Hoeveel artikelen op de overzichtspagina. */
  maxOverzicht: number;
  /** Hoeveel artikelen in het gedeelde blok (bv. op de homepage). 0 = geen blok. */
  maxHome: number;
  /** Vaste rubrieknaam bij een artikel (feeds leveren die meestal niet mee). */
  categorie: string;
  /** Hoeveel "gerelateerde berichten" onder een artikel. 0 = geen. */
  maxGerelateerd: number;
};

const STANDAARD: ActueelInstellingen = {
  artikelPad: "",
  overzichtPad: "actueel",
  afbeeldingPad: "afbeeldingen",
  maxOverzicht: 60,
  maxHome: 0,
  categorie: "",
  maxGerelateerd: 0,
};

const MAANDEN = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

export function nlDatum(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MAANDEN[d.getMonth()]} ${d.getFullYear()}`;
}

/** HTML-tekst naar platte tekst (voor meta-omschrijvingen). */
export function platteTekst(html: string, maxLengte = 160): string {
  const tekst = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&euml;/g, "ë")
    .replace(/\s+/g, " ")
    .trim();
  if (tekst.length <= maxLengte) return tekst;
  return tekst.slice(0, maxLengte - 1).replace(/\s+\S*$/, "") + "…";
}

export function ontsnapHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Een titel/bestandsnaam naar een veilige slug. */
export function slugify(tekst: string): string {
  return tekst
    .toLowerCase()
    .replace(/[àáâäã]/g, "a").replace(/[èéêë]/g, "e").replace(/[ìíîï]/g, "i")
    .replace(/[òóôöõ]/g, "o").replace(/[ùúûü]/g, "u").replace(/ç/g, "c").replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

/**
 * Haalt de feed op. Accountantsportal levert onder /js een JSON-array in een
 * JS-variabele (hun RSS/Atom/XML gaven ten tijde van bouwen een serverfout);
 * echte RSS/Atom-feeds worden ook herkend. Alleen lezen, nooit schrijven.
 */
export async function haalFeedArtikelen(feedUrl: string): Promise<FeedArtikel[]> {
  const res = await fetch(feedUrl, {
    headers: { "User-Agent": "WordSwap actueel-sync (+https://wordswap.nl)" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Feed gaf status ${res.status} (${feedUrl})`);
  const tekst = await res.text();

  if (/^\s*(var|const|let)\s+\w+\s*=/.test(tekst)) return uitJsFeed(tekst);
  if (/<rss|<feed|<\?xml/i.test(tekst)) return uitXmlFeed(tekst);
  throw new Error("Onbekend feedformaat");
}

function uitJsFeed(tekst: string): FeedArtikel[] {
  const json = tekst
    .replace(/^\s*(var|const|let)\s+\w+\s*=\s*/, "")
    .replace(/;\s*$/, "");
  const ruw = JSON.parse(json) as Record<string, unknown>[];
  return ruw.map((r) => {
    const link = String(r.link ?? "");
    const enclosures = (r.enclosures ?? []) as { url?: string }[];
    return {
      slug: slugVanLink(link, String(r.title ?? "")),
      titel: String(r.title ?? "").trim(),
      samenvatting: String(r.description ?? "").trim(),
      inhoudHtml: String(r.content ?? "").trim(),
      datumIso: String(r.publication_date_iso ?? new Date().toISOString()),
      auteur: String(r.author ?? "").trim(),
      afbeeldingUrl: enclosures[0]?.url ?? null,
    };
  });
}

function uitXmlFeed(xml: string): FeedArtikel[] {
  const items = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/g)].map((m) => m[0]);
  const veld = (blok: string, naam: string) => {
    const m = blok.match(new RegExp(`<${naam}\\b[^>]*>([\\s\\S]*?)</${naam}>`, "i"));
    if (!m) return "";
    return m[1]
      .replace(/^\s*<!\[CDATA\[/, "")
      .replace(/\]\]>\s*$/, "")
      .trim();
  };
  return items.map((blok) => {
    const link = veld(blok, "link") || (blok.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? "");
    const titel = veld(blok, "title");
    const inhoud = veld(blok, "content:encoded") || veld(blok, "content") || veld(blok, "description");
    return {
      slug: slugVanLink(link, titel),
      titel,
      samenvatting: platteTekst(veld(blok, "description") || inhoud, 200),
      inhoudHtml: inhoud,
      datumIso: new Date(
        veld(blok, "pubDate") || veld(blok, "published") || veld(blok, "updated") || Date.now()
      ).toISOString(),
      auteur: veld(blok, "dc:creator") || veld(blok, "author"),
      afbeeldingUrl: blok.match(/<enclosure[^>]*url="([^"]+)"/i)?.[1] ?? null,
    };
  });
}

/**
 * Slug uit de feed-link. Accountantsportal zet er een datumprefix voor
 * ("2026-09-titel-van-artikel"); WordPress publiceerde die artikelen zonder
 * die prefix, dus die halen we eraf om de bestaande URL's te behouden.
 */
export function slugVanLink(link: string, titelAlsBackup = ""): string {
  const laatste = link.replace(/[/?#]+$/, "").split("/").pop() ?? "";
  const zonderDatum = laatste.replace(/^\d{4}-\d{2}-/, "");
  return zonderDatum ? slugify(zonderDatum) : slugify(titelAlsBackup);
}

/** {{plaatshouders}} in een sjabloon vervangen. Onbekende blijven staan (zichtbaar bij fouten). */
export function vulSjabloon(sjabloon: string, velden: Record<string, string>): string {
  return sjabloon.replace(/\{\{(\w+)\}\}/g, (heel, naam: string) =>
    naam in velden ? velden[naam] : heel
  );
}

/**
 * Eén artikelpagina bouwen uit het sjabloon van de site.
 *
 * `gerelateerd` vult het blok tussen <!--gerelateerd--> en <!--/gerelateerd-->;
 * die kaarten worden vastgezet op het moment dat het artikel gemaakt wordt, zodat
 * bestaande pagina's niet bij elke sync hoeven te worden herschreven.
 */
export function bouwArtikelPagina(
  sjabloon: string,
  artikel: FeedArtikel,
  inst: ActueelInstellingen,
  afbeeldingBestand: string | null,
  gerelateerd: { artikelen: FeedArtikel[]; beeldVoor: (slug: string) => string | null } = {
    artikelen: [],
    beeldVoor: () => null,
  }
): string {
  const afbeelding = afbeeldingBestand
    ? `/${inst.afbeeldingPad}/${afbeeldingBestand}`
    : "";

  // Blok met gerelateerde berichten invullen of in z'n geheel weglaten
  let met = sjabloon;
  const blok = met.match(/<!--gerelateerd-->([\s\S]*?)<!--\/gerelateerd-->/);
  if (blok) {
    const zichtbaar = gerelateerd.artikelen.slice(0, inst.maxGerelateerd);
    met = zichtbaar.length
      ? met.replace(
          /<!--gerelateerd-->[\s\S]*?<!--\/gerelateerd-->/,
          bouwOverzichtPagina(
            blok[1],
            zichtbaar,
            { ...inst, maxOverzicht: inst.maxGerelateerd },
            gerelateerd.beeldVoor
          )
        )
      : met.replace(/<!--gerelateerd-->[\s\S]*?<!--\/gerelateerd-->/, "");
  }

  return vulSjabloon(met, {
    titel: ontsnapHtml(artikel.titel),
    titel_plat: artikel.titel.replace(/"/g, "'"),
    omschrijving: ontsnapHtml(platteTekst(artikel.samenvatting || artikel.inhoudHtml)),
    inhoud: artikel.inhoudHtml,
    samenvatting: ontsnapHtml(artikel.samenvatting),
    datum: nlDatum(artikel.datumIso),
    datum_iso: artikel.datumIso.slice(0, 10),
    auteur: ontsnapHtml(artikel.auteur),
    slug: artikel.slug,
    pad: artikelUrl(artikel.slug, inst),
    categorie: ontsnapHtml(inst.categorie),
    afbeelding,
    // Hele blokken die alleen nodig zijn als er een afbeelding is
    afbeelding_blok: afbeelding
      ? `<img src="${afbeelding}" alt="${ontsnapHtml(artikel.titel)}" width="600" height="400" loading="lazy">`
      : "",
    overzicht_pad: `/${inst.overzichtPad}/`,
  });
}

export function artikelUrl(slug: string, inst: ActueelInstellingen): string {
  return inst.artikelPad ? `/${inst.artikelPad}/${slug}/` : `/${slug}/`;
}

function artikelBestandspad(slug: string, inst: ActueelInstellingen): string {
  return inst.artikelPad
    ? `${inst.artikelPad}/${slug}/index.html`
    : `${slug}/index.html`;
}

/**
 * Overzichtspagina bouwen. Het sjabloon bevat één kaart tussen
 * <!--kaart--> en <!--/kaart-->; die wordt per artikel herhaald.
 */
export function bouwOverzichtPagina(
  sjabloon: string,
  artikelen: FeedArtikel[],
  inst: ActueelInstellingen,
  afbeeldingVoor: (slug: string) => string | null
): string {
  const kaartMatch = sjabloon.match(/<!--kaart-->([\s\S]*?)<!--\/kaart-->/);
  if (!kaartMatch) throw new Error("Overzichtssjabloon mist <!--kaart--> … <!--/kaart-->");
  const kaartSjabloon = kaartMatch[1];
  const kaarten = artikelen
    .slice(0, inst.maxOverzicht)
    .map((a) => {
      const best = afbeeldingVoor(a.slug);
      const afbeelding = best ? `/${inst.afbeeldingPad}/${best}` : "";
      return vulSjabloon(kaartSjabloon, {
        titel: ontsnapHtml(a.titel),
        samenvatting: ontsnapHtml(platteTekst(a.samenvatting || a.inhoudHtml, 180)),
        datum: nlDatum(a.datumIso),
        datum_iso: a.datumIso.slice(0, 10),
        pad: artikelUrl(a.slug, inst),
        afbeelding,
        afbeelding_blok: afbeelding
          ? `<img src="${afbeelding}" alt="${ontsnapHtml(a.titel)}" width="600" height="400" loading="lazy">`
          : "",
      });
    })
    .join("\n");
  return sjabloon.replace(/<!--kaart-->[\s\S]*?<!--\/kaart-->/, kaarten);
}

/**
 * Artikel-URL's in sitemap.xml zetten. Bestaande regels blijven staan; alleen
 * wat er nog niet in stond wordt toegevoegd (dus veilig om elke sync te doen).
 */
export function vulSitemapAan(sitemap: string, paden: string[]): string {
  const ontbreekt = paden.filter((p) => !sitemap.includes(`<loc>https://VERVANG.nl${p}</loc>`));
  if (!ontbreekt.length) return sitemap;
  const regels = ontbreekt
    .map((p) => `  <url><loc>https://VERVANG.nl${p}</loc><priority>0.5</priority></url>`)
    .join("\n");
  return sitemap.replace("</urlset>", `${regels}\n</urlset>`);
}

/** Compacte lijst (nieuwste eerst) voor de vorige/volgende-navigatie op artikelpagina's. */
export function bouwIndex(
  artikelen: FeedArtikel[],
  inst: ActueelInstellingen
): { pad: string; titel: string }[] {
  return artikelen.map((a) => ({ pad: artikelUrl(a.slug, inst), titel: a.titel }));
}

/** Eerste URL uit de lijst die een geldig antwoord geeft. */
async function haalEersteBestaande(urls: string[]): Promise<Response | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) return res;
    } catch {
      // volgende proberen
    }
  }
  return null;
}

/** Afbeelding ophalen en naar webp omzetten; faalt zacht (artikel gaat door zonder beeld). */
export async function haalAfbeelding(
  url: string,
  slug: string
): Promise<{ pad: string; inhoud: Buffer } | null> {
  try {
    // Feeds leveren vaak een kleine variant met het formaat in de URL
    // (…/600x400/…). Een grotere versie geeft een scherper beeld; bestaat die
    // niet, dan gebruiken we gewoon wat de feed gaf.
    const res = await haalEersteBestaande([
      url.replace(/\/\d{3,4}x\d{3,4}\//, "/1200x800/"),
      url,
    ]);
    if (!res) return null;
    const ruw = Buffer.from(await res.arrayBuffer());
    const sharp = (await import("sharp")).default;
    const webp = await sharp(ruw)
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    return { pad: `${slug}.webp`, inhoud: webp };
  } catch {
    return null;
  }
}

async function leesTekst(repo: string, pad: string): Promise<string | null> {
  try {
    const inhoud = await leesBestand(repo, pad);
    return inhoud || null;
  } catch {
    return null; // bestaat niet
  }
}

export async function leesInstellingen(repo: string): Promise<ActueelInstellingen> {
  const ruw = await leesTekst(repo, "sjablonen/actueel.json");
  if (!ruw) return { ...STANDAARD };
  try {
    return { ...STANDAARD, ...(JSON.parse(ruw) as Partial<ActueelInstellingen>) };
  } catch {
    return { ...STANDAARD };
  }
}

export type SyncUitslag = {
  repo: string;
  gevonden: number;
  nieuw: string[];
  overgeslagen: number;
  fout?: string;
};

/**
 * Haalt de feed op en zet NIEUWE artikelen als pagina's in de repo. Bestaande
 * artikelen worden nooit overschreven — het archief blijft dus intact en de
 * sync kan zo vaak draaien als je wilt.
 *
 * Deployen doet de aanroeper (de push naar main triggert de gewone deploy).
 */
/**
 * Herkent hetzelfde bericht dat twee keer langskomt.
 *
 * Waarom dit nodig is: de ontdubbeling keek alleen of het bestand al bestond,
 * dus op het adres. Publiceert de bron hetzelfde bericht opnieuw met een iets
 * ander adres (een correctie, een minuut later), dan is dat voor ons een nieuw
 * artikel en krijgt de site twee pagina's met dezelfde titel. Google kiest er
 * dan zelf één en negeert de andere.
 *
 * Bij VGK gebeurde dat twee keer op 287 artikelen: om 09:30 en om 09:31.
 *
 * De regel: dezelfde titel op dezelfde dag is hetzelfde bericht. Datum erbij,
 * want een terugkerende kop als "Nieuwsbrief december" mag over een jaar wél
 * opnieuw.
 */
export function zelfdeBericht(titel: string, datumIso: string): string {
  const dag = (datumIso || "").slice(0, 10);
  const kop = titel.toLowerCase().replace(/\s+/g, " ").trim();
  return `${dag}|${kop}`;
}

/** Feed-artikelen zonder de berichten die we al hebben, en zonder dubbelen
 * binnen dezelfde ronde. De eerste versie wint: die heeft het nettere adres,
 * en dat is vaak ook het adres dat al ergens gedeeld is. */
export function ontdubbelArtikelen<T extends { titel: string; datumIso: string }>(
  artikelen: T[],
  alGehad: Iterable<{ titel: string; datumIso: string }>
): T[] {
  const gezien = new Set<string>();
  for (const a of alGehad) gezien.add(zelfdeBericht(a.titel, a.datumIso));
  const uit: T[] = [];
  for (const a of artikelen) {
    const sleutel = zelfdeBericht(a.titel, a.datumIso);
    if (gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    uit.push(a);
  }
  return uit;
}

export async function syncActueel(opties: {
  repo: string;
  feedUrl: string;
  /** Niet pushen, alleen rapporteren wat er zou gebeuren. */
  drogeloop?: boolean;
}): Promise<SyncUitslag> {
  const { repo, feedUrl, drogeloop } = opties;
  const uitslag: SyncUitslag = { repo, gevonden: 0, nieuw: [], overgeslagen: 0 };

  const inst = await leesInstellingen(repo);
  const artikelSjabloon = await leesTekst(repo, "sjablonen/actueel-artikel.html");
  const overzichtSjabloon = await leesTekst(repo, "sjablonen/actueel-overzicht.html");
  if (!artikelSjabloon || !overzichtSjabloon) {
    uitslag.fout =
      "Sjablonen ontbreken (sjablonen/actueel-artikel.html en sjablonen/actueel-overzicht.html)";
    return uitslag;
  }

  const artikelen = await haalFeedArtikelen(feedUrl);
  uitslag.gevonden = artikelen.length;
  if (!artikelen.length) return uitslag;

  // Wat staat er al? (bestaande artikelen nooit opnieuw bouwen)
  const bestaand = new Set(await lijstBestanden(repo));
  const eerderArchief = await leesArchief(repo, inst);
  // Twee zeven: het bestand bestaat al (zelfde adres), of we hadden dit bericht
  // al onder een ander adres (zelfde titel, zelfde dag).
  const nieuwe = ontdubbelArtikelen(
    artikelen.filter((a) => !bestaand.has(artikelBestandspad(a.slug, inst))),
    eerderArchief
  );
  uitslag.overgeslagen = artikelen.length - nieuwe.length;
  if (!nieuwe.length) return uitslag;

  const teSchrijven: { pad: string; inhoud: Buffer }[] = [];
  const beeldVoorSlug = new Map<string, string>();
  const archief = eerderArchief;

  // Nieuwste eerst, zodat "gerelateerde berichten" de dichtstbijzijnde oudere zijn
  const nieuwOpDatum = [...nieuwe].sort((a, b) => b.datumIso.localeCompare(a.datumIso));

  // Eerst alle beelden ophalen, dan pas de pagina's bouwen: anders missen
  // artikelen uit dezelfde run elkaars beeld bij "gerelateerde berichten".
  for (const artikel of nieuwOpDatum) {
    if (!artikel.afbeeldingUrl) continue;
    const beeld = await haalAfbeelding(artikel.afbeeldingUrl, artikel.slug);
    if (beeld) {
      beeldVoorSlug.set(artikel.slug, beeld.pad);
      teSchrijven.push({
        pad: `${inst.afbeeldingPad}/${beeld.pad}`,
        inhoud: beeld.inhoud,
      });
    }
  }

  for (const artikel of nieuwOpDatum) {
    const beeldBestand = beeldVoorSlug.get(artikel.slug) ?? null;
    const buren = [...nieuwOpDatum, ...archief]
      .filter((a) => a.slug !== artikel.slug && a.datumIso <= artikel.datumIso)
      .sort((a, b) => b.datumIso.localeCompare(a.datumIso));
    const html = bouwArtikelPagina(artikelSjabloon, artikel, inst, beeldBestand, {
      artikelen: buren,
      beeldVoor: (slug) =>
        beeldVoorSlug.get(slug) ?? archief.find((a) => a.slug === slug)?.afbeeldingUrl ?? null,
    });
    teSchrijven.push({
      pad: artikelBestandspad(artikel.slug, inst),
      inhoud: Buffer.from(html, "utf8"),
    });
    uitslag.nieuw.push(artikel.slug);
  }

  // Overzicht opnieuw opbouwen uit het archief (alle artikelen, nieuwste eerst)
  const alles = [
    ...nieuwe.map((a) => ({
      slug: a.slug,
      titel: a.titel,
      samenvatting: a.samenvatting,
      datumIso: a.datumIso,
      inhoudHtml: "",
      auteur: a.auteur,
      afbeeldingUrl: null,
    })),
    ...archief.filter((a) => !nieuwe.some((n) => n.slug === a.slug)),
  ].sort((a, b) => b.datumIso.localeCompare(a.datumIso));

  const overzicht = bouwOverzichtPagina(overzichtSjabloon, alles, inst, (slug) => {
    const uitNieuw = beeldVoorSlug.get(slug);
    if (uitNieuw) return uitNieuw;
    const uitArchief = archief.find((a) => a.slug === slug);
    return uitArchief?.afbeeldingUrl ?? null;
  });
  teSchrijven.push({
    pad: `${inst.overzichtPad}/index.html`,
    inhoud: Buffer.from(overzicht, "utf8"),
  });

  // Gedeeld blok met de laatste artikelen (pagina's tonen het met
  // <!--invoeg:actueel-blok-->, dat de deploy uitvouwt)
  const homeSjabloon = inst.maxHome
    ? await leesTekst(repo, "sjablonen/actueel-home.html")
    : null;
  if (homeSjabloon) {
    const blok = bouwOverzichtPagina(
      homeSjabloon,
      alles,
      { ...inst, maxOverzicht: inst.maxHome },
      (slug) =>
        beeldVoorSlug.get(slug) ??
        archief.find((a) => a.slug === slug)?.afbeeldingUrl ??
        null
    );
    teSchrijven.push({ pad: "delen/actueel-blok.html", inhoud: Buffer.from(blok, "utf8") });
  }

  // Archief bijwerken zodat de volgende sync weet wat er al is
  const nieuwArchief = alles.map((a) => ({
    slug: a.slug,
    titel: a.titel,
    samenvatting: platteTekst(a.samenvatting || a.inhoudHtml, 200),
    datumIso: a.datumIso,
    afbeelding:
      beeldVoorSlug.get(a.slug) ??
      archief.find((x) => x.slug === a.slug)?.afbeeldingUrl ??
      null,
  }));
  teSchrijven.push({
    pad: "sjablonen/actueel-archief.json",
    inhoud: Buffer.from(JSON.stringify(nieuwArchief, null, 1), "utf8"),
  });

  // Kleine publieke index: de artikelpagina's gebruiken hem voor hun
  // vorige/volgende-navigatie, zodat oudere pagina's ongewijzigd kunnen blijven.
  teSchrijven.push({
    pad: `${inst.overzichtPad}/index.json`,
    inhoud: Buffer.from(JSON.stringify(bouwIndex(alles, inst)), "utf8"),
  });

  // Nieuwe artikelen ook in de sitemap, anders vindt Google ze niet
  const sitemap = await leesTekst(repo, "sitemap.xml");
  if (sitemap) {
    const bijgewerkt = vulSitemapAan(
      sitemap,
      nieuwe.map((a) => artikelUrl(a.slug, inst))
    );
    if (bijgewerkt !== sitemap) {
      teSchrijven.push({ pad: "sitemap.xml", inhoud: Buffer.from(bijgewerkt, "utf8") });
    }
  }

  if (drogeloop) return uitslag;

  await pushBestanden(
    repo,
    teSchrijven,
    uitslag.nieuw.length === 1
      ? `Actueel: artikel "${nieuwe[0].titel}" toegevoegd`
      : `Actueel: ${uitslag.nieuw.length} nieuwe artikelen toegevoegd`
  );
  return uitslag;
}

/** Het archiefbestand uit de repo lezen (lijst van alle bekende artikelen). */
export async function leesArchief(
  repo: string,
  _inst: ActueelInstellingen
): Promise<FeedArtikel[]> {
  const ruw = await leesTekst(repo, "sjablonen/actueel-archief.json");
  if (!ruw) return [];
  try {
    const lijst = JSON.parse(ruw) as {
      slug: string;
      titel: string;
      samenvatting: string;
      datumIso: string;
      afbeelding: string | null;
    }[];
    return lijst.map((a) => ({
      slug: a.slug,
      titel: a.titel,
      samenvatting: a.samenvatting,
      inhoudHtml: "",
      datumIso: a.datumIso,
      auteur: "",
      afbeeldingUrl: a.afbeelding,
    }));
  } catch {
    return [];
  }
}
