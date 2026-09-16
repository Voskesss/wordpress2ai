/**
 * Eenmalig: het bestaande nieuwsarchief van een gemigreerde WordPress-site
 * omzetten naar statische artikelpagina's, met dezelfde sjablonen die de
 * dagelijkse actueel-sync gebruikt.
 *
 *   npx tsx scripts/actueel-archief.mts <repo-naam> [--schrijf]
 *
 * Zonder --schrijf is het een droge loop (toont alleen wat het zou doen).
 * Leest uit ~/wordswap-klanten/<repo>-bron/oud-ontwerp/*.html (de snapshot van
 * de live site) en schrijft in ~/wordswap-klanten/<repo>/.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  bouwArtikelPagina,
  bouwIndex,
  bouwOverzichtPagina,
  nlDatum,
  platteTekst,
  slugify,
  vulSitemapAan,
  type ActueelInstellingen,
  type FeedArtikel,
} from '../lib/actueel';

const repo = process.argv[2];
const schrijf = process.argv.includes('--schrijf');
if (!repo) { console.error('Gebruik: actueel-archief.mts <repo-naam> [--schrijf]'); process.exit(1); }

const basis = path.join(os.homedir(), 'wordswap-klanten');
const siteMap = path.join(basis, repo);
const bronMap = path.join(basis, `${repo}-bron`, 'oud-ontwerp');
if (!fs.existsSync(bronMap)) { console.error(`Bronmap niet gevonden: ${bronMap}`); process.exit(1); }

const inst: ActueelInstellingen = JSON.parse(
  fs.readFileSync(path.join(siteMap, 'sjablonen/actueel.json'), 'utf8')
);
const artikelSjabloon = fs.readFileSync(path.join(siteMap, 'sjablonen/actueel-artikel.html'), 'utf8');
const overzichtSjabloon = fs.readFileSync(path.join(siteMap, 'sjablonen/actueel-overzicht.html'), 'utf8');

/** Alle beschikbare afbeeldingen, op basisnaam, zodat we ze kunnen koppelen. */
const beelden = new Set(
  fs.readdirSync(path.join(siteMap, inst.afbeeldingPad)).filter((f) => f.endsWith('.webp'))
);

function jsonLd(html: string): Record<string, unknown>[] {
  const blokken = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  const uit: Record<string, unknown>[] = [];
  for (const b of blokken) {
    try {
      const data = JSON.parse(b[1]);
      const graph = (data['@graph'] ?? [data]) as Record<string, unknown>[];
      uit.push(...graph);
    } catch { /* stuk JSON-LD overslaan */ }
  }
  return uit;
}

/** De artikeltekst zoals de paginabouwer hem plaatste. */
function haalInhoud(html: string): string {
  const start = html.search(/class="[^"]*elementor-widget-theme-post-content[^"]*"/);
  if (start === -1) return '';
  const naStart = html.indexOf('<div class="elementor-widget-container">', start);
  if (naStart === -1) return '';
  let i = naStart + '<div class="elementor-widget-container">'.length;
  let diepte = 1;
  const tags = /<(\/?)div\b[^>]*>/g;
  tags.lastIndex = i;
  let m: RegExpExecArray | null;
  while ((m = tags.exec(html))) {
    diepte += m[1] ? -1 : 1;
    if (diepte === 0) break;
  }
  const inhoud = html.slice(i, m ? m.index : undefined);
  // Alleen tekstopmaak behouden; builder-resten en scripts eruit
  return inhoud
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/ class="[^"]*"/g, '')
    .replace(/ style="[^"]*"/g, '')
    .replace(/<div[^>]*>|<\/div>/g, '')
    // WordPress' "lees verder"-anker en de lege alinea eromheen
    .replace(/<p>\s*<span id="more-\d+"><\/span>\s*<\/p>/g, '')
    .replace(/<span id="more-\d+"><\/span>/g, '')
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Beeld zoeken in afbeeldingen/. Bij de migratie zijn lange bestandsnamen
 * afgekapt, dus na een exacte match proberen we een prefix-match.
 */
function zoekBeeld(basisnaam: string, slug: string): string | null {
  for (const kandidaat of [`${basisnaam}.webp`, `${slug}.webp`]) {
    if (beelden.has(kandidaat)) return kandidaat;
  }
  for (const naam of [basisnaam, slug]) {
    if (naam.length < 20) continue;
    const kort = naam.slice(0, 40);
    const treffer = [...beelden].find(
      (b) => b.startsWith(kort) && naam.startsWith(b.replace(/\.webp$/, '').replace(/-+$/, ''))
    );
    if (treffer) return treffer;
  }
  return null;
}

/** Beelden die in geen enkele vorm in de repo staan; die halen we van de live site. */
const ontbrekend: { slug: string; url: string }[] = [];

const artikelen: FeedArtikel[] = [];
const bestanden = fs.readdirSync(bronMap).filter((f) => f.endsWith('.html'));

for (const bestand of bestanden) {
  const html = fs.readFileSync(path.join(bronMap, bestand), 'utf8');
  const knopen = jsonLd(html);
  const artikel = knopen.find((k) => /Article/.test(String(k['@type'] ?? '')));
  if (!artikel) continue; // geen bericht, maar een gewone pagina

  const slug = slugify(bestand.replace(/\.html$/, ''));
  const inhoudHtml = haalInhoud(html);
  if (!inhoudHtml || inhoudHtml.length < 120) {
    console.warn(`  overgeslagen (geen inhoud gevonden): ${bestand}`);
    continue;
  }

  // Afbeelding: uit de JSON-LD-naam, gekoppeld aan wat al in afbeeldingen/ staat
  const beeldKnoop = knopen.find((k) => String(k['@type'] ?? '') === 'ImageObject');
  const beeldUrl = String(beeldKnoop?.contentUrl ?? beeldKnoop?.url ?? '').replace(/\\\//g, '/');
  const beeldBasis = beeldUrl ? path.basename(beeldUrl).replace(/\.[a-z]+$/i, '') : '';
  const beeld = zoekBeeld(beeldBasis, slug);
  if (!beeld && beeldUrl) ontbrekend.push({ slug, url: beeldUrl });

  const omschrijving =
    (html.match(/<meta name="description" content="([^"]*)"/) ?? [])[1] ?? '';

  artikelen.push({
    slug,
    titel: String(artikel.headline ?? '').trim(),
    samenvatting: omschrijving || platteTekst(inhoudHtml, 200),
    inhoudHtml,
    datumIso: new Date(String(artikel.datePublished ?? Date.now())).toISOString(),
    auteur: '',
    afbeeldingUrl: beeld,
  });
}

// Al eerder via de feed binnengekomen berichten behouden: die staan niet in de
// snapshot, maar hun pagina's bestaan wel. Zo is dit script veilig te herhalen.
const archiefPad = path.join(siteMap, 'sjablonen/actueel-archief.json');
if (fs.existsSync(archiefPad)) {
  const eerder = JSON.parse(fs.readFileSync(archiefPad, 'utf8')) as {
    slug: string; titel: string; samenvatting: string; datumIso: string; afbeelding: string | null;
  }[];
  const uitSnapshot = new Set(artikelen.map((a) => a.slug));
  const behouden = eerder.filter((e) => !uitSnapshot.has(e.slug));
  for (const e of behouden) {
    artikelen.push({
      slug: e.slug, titel: e.titel, samenvatting: e.samenvatting,
      inhoudHtml: '', datumIso: e.datumIso, auteur: '', afbeeldingUrl: e.afbeelding,
    });
  }
  if (behouden.length) console.log(`eerder via de feed binnengekomen, behouden: ${behouden.length}`);
}

artikelen.sort((a, b) => b.datumIso.localeCompare(a.datumIso));
console.log(`gevonden artikelen: ${artikelen.length}`);
console.log(`met afbeelding: ${artikelen.filter((a) => a.afbeeldingUrl).length}`);
if (artikelen.length) {
  console.log(`nieuwste: ${nlDatum(artikelen[0].datumIso)} — ${artikelen[0].titel}`);
  const o = artikelen[artikelen.length - 1];
  console.log(`oudste:   ${nlDatum(o.datumIso)} — ${o.titel}`);
}

console.log(`beeld ontbreekt in de repo: ${ontbrekend.length}`);

if (!schrijf) { console.log('\n(droge loop — niets geschreven; gebruik --schrijf)'); process.exit(0); }

// Ontbrekende beelden alsnog van de live site halen (alleen lezen; de bron
// van de klant wordt niet aangeraakt) en als webp opslaan.
if (ontbrekend.length) {
  const sharp = (await import('sharp')).default;
  let gelukt = 0;
  for (const { slug, url } of ontbrekend) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const webp = await sharp(Buffer.from(await res.arrayBuffer()))
        .rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
      fs.writeFileSync(path.join(siteMap, inst.afbeeldingPad, `${slug}.webp`), webp);
      const artikel = artikelen.find((a) => a.slug === slug);
      if (artikel) artikel.afbeeldingUrl = `${slug}.webp`;
      gelukt++;
    } catch { /* beeld overslaan, artikel gaat door zonder */ }
  }
  console.log(`beelden alsnog opgehaald: ${gelukt} van ${ontbrekend.length}`);
}

const beeldVoor = (slug: string) => artikelen.find((a) => a.slug === slug)?.afbeeldingUrl ?? null;

artikelen.forEach((a, i) => {
  // Berichten zonder inhoud komen uit een eerdere feed-sync: hun pagina bestaat
  // al en wordt niet overschreven, ze tellen alleen mee in de overzichten.
  if (!a.inhoudHtml) return;
  // Gerelateerd = de eerstvolgende oudere berichten; bij de oudste vullen we
  // aan vanaf het begin, zodat elk bericht doorverwijst.
  const buren = [...artikelen.slice(i + 1), ...artikelen.slice(0, i)];
  const html = bouwArtikelPagina(artikelSjabloon, a, inst, a.afbeeldingUrl, {
    artikelen: buren,
    beeldVoor,
  });
  const map = inst.artikelPad ? path.join(siteMap, inst.artikelPad, a.slug) : path.join(siteMap, a.slug);
  fs.mkdirSync(map, { recursive: true });
  fs.writeFileSync(path.join(map, 'index.html'), html);
});

const overzicht = bouwOverzichtPagina(overzichtSjabloon, artikelen, inst, (slug) => {
  return artikelen.find((a) => a.slug === slug)?.afbeeldingUrl ?? null;
});
fs.mkdirSync(path.join(siteMap, inst.overzichtPad), { recursive: true });
fs.writeFileSync(path.join(siteMap, inst.overzichtPad, 'index.html'), overzicht);

// Gedeeld blok met de laatste artikelen (voor <!--invoeg:actueel-blok-->)
const homeSjabloonPad = path.join(siteMap, 'sjablonen/actueel-home.html');
if (inst.maxHome && fs.existsSync(homeSjabloonPad)) {
  const blok = bouwOverzichtPagina(
    fs.readFileSync(homeSjabloonPad, 'utf8'),
    artikelen,
    { ...inst, maxOverzicht: inst.maxHome },
    (slug) => artikelen.find((a) => a.slug === slug)?.afbeeldingUrl ?? null
  );
  fs.writeFileSync(path.join(siteMap, 'delen/actueel-blok.html'), blok);
  console.log(`delen/actueel-blok.html geschreven (${inst.maxHome} artikelen)`);
}

// Archief-index: hiermee weet de dagelijkse sync wat er al is
const archief = artikelen.map((a) => ({
  slug: a.slug,
  titel: a.titel,
  samenvatting: platteTekst(a.samenvatting || a.inhoudHtml, 200),
  datumIso: a.datumIso,
  afbeelding: a.afbeeldingUrl,
}));
fs.writeFileSync(
  path.join(siteMap, 'sjablonen/actueel-archief.json'),
  JSON.stringify(archief, null, 1)
);

// Publieke index voor de vorige/volgende-navigatie op artikelpagina's
fs.writeFileSync(
  path.join(siteMap, inst.overzichtPad, 'index.json'),
  JSON.stringify(bouwIndex(artikelen, inst))
);

// Sitemap aanvullen met het overzicht en alle artikelen
const sitemapPad = path.join(siteMap, 'sitemap.xml');
if (fs.existsSync(sitemapPad)) {
  const paden = [
    `/${inst.overzichtPad}/`,
    ...artikelen.map((a) => (inst.artikelPad ? `/${inst.artikelPad}/${a.slug}/` : `/${a.slug}/`)),
  ];
  fs.writeFileSync(sitemapPad, vulSitemapAan(fs.readFileSync(sitemapPad, 'utf8'), paden));
  console.log(`sitemap aangevuld met ${paden.length} adressen`);
}

console.log(`\ngeschreven: ${artikelen.length} artikelpagina's + /${inst.overzichtPad}/ + archief-index`);
