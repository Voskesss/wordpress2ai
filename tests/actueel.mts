/** Test voor de actueel-sync: feed lezen, slugs, sjablonen en sitemap.
 * Draaien: node --import tsx tests/actueel.mts (geen database of netwerk nodig). */
import assert from "node:assert/strict";
import {
  bouwArtikelPagina,
  bouwOverzichtPagina,
  nlDatum,
  platteTekst,
  bouwIndex,
  slugVanLink,
  vulSitemapAan,
  vulSjabloon,
  type ActueelInstellingen,
  type FeedArtikel,
} from "../lib/actueel";

const inst: ActueelInstellingen = {
  artikelPad: "",
  overzichtPad: "actueel",
  afbeeldingPad: "afbeeldingen",
  maxOverzicht: 2,
  maxHome: 0,
  categorie: "Financieel Nieuws",
  maxGerelateerd: 2,
};

const artikel: FeedArtikel = {
  slug: "nieuwe-regels-2027",
  titel: 'Nieuwe regels & "afspraken" 2027',
  samenvatting: "Wat er verandert.",
  inhoudHtml: "<p>Eerste alinea.</p><p>Tweede alinea.</p>",
  datumIso: "2026-09-15T09:30:00.000Z",
  auteur: "Redactie",
  afbeeldingUrl: null,
};

// Slug: de datumprefix van de feed eraf, zodat bestaande WordPress-URL's blijven werken
assert.equal(
  slugVanLink("https://x.nl/feed/item/abc/2026-09-thuiswerkdrempel-in-duitsland"),
  "thuiswerkdrempel-in-duitsland"
);
assert.equal(slugVanLink("https://x.nl/nieuws/gewoon-bericht/"), "gewoon-bericht");
assert.equal(slugVanLink("", "Titel Met Hoofdletters!"), "titel-met-hoofdletters");

// Datum en samenvatting
assert.equal(nlDatum("2026-09-15T09:30:00.000Z"), "15 september 2026");
assert.equal(platteTekst("<p>Hallo&nbsp;daar</p>"), "Hallo daar");
assert.ok(platteTekst("<p>" + "lang ".repeat(60) + "</p>", 40).length <= 40);

// Sjabloon: onbekende plaatshouders blijven staan (zo vallen fouten op)
assert.equal(vulSjabloon("{{a}} en {{b}}", { a: "x" }), "x en {{b}}");

// Artikelpagina: titel ontsnapt in HTML, inhoud onaangetast
const pagina = bouwArtikelPagina(
  "<title>{{titel}}</title><main>{{afbeelding_blok}}{{inhoud}}</main><a href='{{overzicht_pad}}'>terug</a>",
  artikel,
  inst,
  null
);
assert.ok(pagina.includes("Nieuwe regels &amp; &quot;afspraken&quot; 2027"), "titel moet ontsnapt zijn");
assert.ok(pagina.includes("<p>Eerste alinea.</p>"), "inhoud moet blijven staan");
assert.ok(!pagina.includes("<img"), "zonder afbeelding geen img-tag");
assert.ok(pagina.includes("href='/actueel/'"), "terug-link naar het overzicht");

// Met afbeelding
const metBeeld = bouwArtikelPagina("{{afbeelding_blok}}", artikel, inst, "foto.webp");
assert.ok(metBeeld.includes('src="/afbeeldingen/foto.webp"'));

// Overzicht: kaart per artikel, maximum gerespecteerd
const drie: FeedArtikel[] = [
  { ...artikel, slug: "a", titel: "A" },
  { ...artikel, slug: "b", titel: "B" },
  { ...artikel, slug: "c", titel: "C" },
];
const overzicht = bouwOverzichtPagina(
  "<div><!--kaart--><article><a href='{{pad}}'>{{titel}}</a></article><!--/kaart--></div>",
  drie,
  inst,
  () => null
);
assert.equal((overzicht.match(/<article>/g) ?? []).length, 2, "maxOverzicht moet gelden");
assert.ok(overzicht.includes("href='/a/'") && overzicht.includes(">A<"));
assert.ok(!overzicht.includes("<!--kaart-->"), "de kaart-markers horen weg te zijn");

// Sitemap: toevoegen is idempotent
const leeg = `<?xml version="1.0"?>\n<urlset>\n  <url><loc>https://VERVANG.nl/</loc></url>\n</urlset>\n`;
const een = vulSitemapAan(leeg, ["/a/", "/b/"]);
assert.ok(een.includes("https://VERVANG.nl/a/") && een.includes("https://VERVANG.nl/b/"));
const twee = vulSitemapAan(een, ["/a/", "/b/"]);
assert.equal(twee, een, "tweede keer mag niets toevoegen");
assert.equal((twee.match(/<loc>https:\/\/VERVANG\.nl\/a\/<\/loc>/g) ?? []).length, 1);

// Een overzichtssjabloon zonder kaart-markers is een fout, geen stille lege pagina
assert.throws(() => bouwOverzichtPagina("<div></div>", drie, inst, () => null));

// Categorie komt uit de instellingen (feeds leveren die niet mee)
assert.ok(bouwArtikelPagina("<span>{{categorie}}</span>", artikel, inst, null).includes("Financieel Nieuws"));

// Gerelateerde berichten: blok gevuld, en zonder buren helemaal weg
const metGerelateerd = bouwArtikelPagina(
  "A<!--gerelateerd--><section><!--kaart--><i>{{titel}}</i><!--/kaart--></section><!--/gerelateerd-->B",
  artikel,
  inst,
  null,
  { artikelen: drie, beeldVoor: () => null }
);
assert.equal((metGerelateerd.match(/<i>/g) ?? []).length, 2, "maxGerelateerd moet gelden");
assert.ok(!metGerelateerd.includes("<!--gerelateerd-->"), "markers horen weg te zijn");
const zonderGerelateerd = bouwArtikelPagina(
  "A<!--gerelateerd--><section>X</section><!--/gerelateerd-->B",
  artikel,
  inst,
  null
);
assert.equal(zonderGerelateerd, "AB", "zonder buren vervalt het hele blok");

// Navigatie-index: nieuwste eerst, paden volgens de instellingen
const index = bouwIndex(drie, inst);
assert.deepEqual(index[0], { pad: "/a/", titel: "A" });
assert.equal(index.length, 3, "de index bevat alle artikelen, niet alleen de getoonde");

console.log(
  "PASS: feed-slugs, datum/samenvatting, sjabloonvulling, artikel- en overzichtspagina, sitemap-idempotentie."
);

// --- Hetzelfde bericht dat twee keer langskomt (21-09-2026)
// Bij VGK publiceerde de feed hetzelfde artikel om 09:30 en om 09:31, met een
// iets ander adres. De ontdubbeling keek alleen naar het bestandspad, dus er
// kwamen twee pagina's met dezelfde titel. Google koos er zelf één.
{
  const { ontdubbelArtikelen, zelfdeBericht } = await import("../lib/actueel");

  const a = { slug: "krijgt-u-een-levensverzekering-geschonken", titel: "Krijgt u een levensverzekering geschonken?", datumIso: "2025-07-08T09:30:00.000Z" };
  const b = { slug: "krijgt-u-een-levensverzekering-geschonken-2", titel: "Krijgt u een levensverzekering geschonken?", datumIso: "2025-07-08T09:31:00.000Z" };

  // Binnen één ronde: de eerste wint, want die heeft het nettere adres
  const uit = ontdubbelArtikelen([a, b], []);
  assert.equal(uit.length, 1, "dubbel bericht binnen één ronde niet herkend");
  assert.equal(uit[0].slug, a.slug, "de eerste versie hoort te winnen");

  // Tegen wat we al hebben: niets nieuws
  assert.deepEqual(ontdubbelArtikelen([b], [a]), [], "bericht dat we al hebben komt opnieuw binnen");

  // Verschillende berichten op dezelfde dag blijven allebei staan
  assert.equal(
    ontdubbelArtikelen([a, { ...b, titel: "Iets heel anders" }], []).length,
    2,
    "twee echte berichten op één dag mogen niet samengevoegd worden",
  );

  // Dezelfde kop op een andere dag mag wél opnieuw: denk aan "Nieuwsbrief december"
  assert.equal(
    ontdubbelArtikelen([{ ...a, datumIso: "2026-07-08T09:30:00.000Z" }], [a]).length,
    1,
    "een terugkerende kop hoort een jaar later gewoon te mogen",
  );

  // Hoofdletters en dubbele spaties maken niet uit
  assert.equal(
    zelfdeBericht("Krijgt u een  levensverzekering geschonken?", "2025-07-08T09:30:00.000Z"),
    zelfdeBericht("KRIJGT U EEN LEVENSVERZEKERING GESCHONKEN?", "2025-07-08T23:59:00.000Z"),
    "schrijfwijze of tijdstip hoort niet uit te maken",
  );

  console.log("actueel-ontdubbeling: ok");
}
