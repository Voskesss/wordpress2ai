import assert from "node:assert/strict";
import {
  ZOEKINDEX_BUDGET,
  ZOEKINDEX_PAD,
  ZOEK_DEEL,
  bouwZoekindex,
  padVanBestand,
  vulIngebouwdeDelenAan,
  zoekFragment,
} from "../lib/zoeken";

/**
 * De zoekindex is een afgeleid bestand dat de deploy maakt. Gaat daar iets mis,
 * dan merkt niemand het: de zoekfunctie blijft werken maar wijst naar de oude
 * situatie. Deze test bewaakt de eigenschappen waar dat van afhangt.
 */

const pagina = (pad: string, titel: string, tekst: string, extra = "") =>
  ({
    pad,
    data: `<!DOCTYPE html><html lang="nl"><head><title>${titel} - Site</title>${extra}</head>
<body><header><nav><a href="/">Menu-item dat overal staat</a></nav></header>
<main><h1>${titel}</h1><p>${tekst}</p>
<aside class="zijbalk"><form><label>Naam<input name="naam"></label></form></aside></main>
<footer><p>Voettekst met telefoonnummer 0612345678</p></footer></body></html>`,
  }) as const;

// 1. Alleen echte pagina's, met de kop als titel
{
  const { index } = bouwZoekindex([
    pagina("index.html", "Home", "Wij doen onderhoud aan voertuigen"),
    pagina("over-ons/index.html", "Over ons", "Ons verhaal"),
    { pad: "stijl.css", data: "body{}" },
    { pad: "delen/menu.html", data: "<nav>menu</nav>" },
  ]);
  assert.equal(index.length, 2);
  assert.deepEqual(
    index.map((p) => p.pad),
    ["/", "/over-ons/"],
    "Home hoort voorop en index.html wordt een map-pad",
  );
  assert.equal(index[0].titel, "Home");
}

// 2. noindex-pagina's blijven eruit: wat niet in Google hoort, hoort ook niet
//    in het zoekvak (bedankt-pagina's, 404, uit het menu gehaalde pagina's)
{
  const { index } = bouwZoekindex([
    pagina("index.html", "Home", "Tekst"),
    pagina("bedankt/index.html", "Bedankt", "Tekst", '<meta name="robots" content="noindex">'),
    pagina("404.html", "Niet gevonden", "Tekst", '<meta name="robots" content="noindex">'),
  ]);
  assert.deepEqual(
    index.map((p) => p.pad),
    ["/"],
  );
}

// 3. Menu, zijbalk en voettekst tellen niet mee. Anders matcht elke zoekopdracht
//    op elke pagina, want na het uitvouwen staan die overal in.
{
  const { index } = bouwZoekindex([pagina("index.html", "Home", "Bijzonder woord")]);
  assert.ok(index[0].tekst.includes("Bijzonder woord"));
  assert.ok(!index[0].tekst.includes("Menu-item"), "Menu hoort niet in de index");
  assert.ok(!index[0].tekst.includes("Voettekst"), "Voettekst hoort niet in de index");
  assert.ok(!index[0].tekst.includes("0612345678"), "Voettekst hoort niet in de index");
  assert.ok(!index[0].tekst.includes("Naam"), "Zijbalkformulier hoort niet in de index");
  assert.ok(!index[0].tekst.includes("<"), "Er mogen geen tags in de tekst staan");
}

// 4. Het bestand blijft klein, ook bij een archief van honderden pagina's:
//    een bezoeker haalt dit op zijn telefoon op zodra hij het zoekvak opent
{
  const veel = Array.from({ length: 600 }, (_, i) =>
    pagina(`artikel-${i}/index.html`, `Artikel ${i}`, "ruime lap tekst ".repeat(400)),
  );
  const { index, json } = bouwZoekindex(veel);
  assert.equal(index.length, 600);
  assert.ok(
    json.length < ZOEKINDEX_BUDGET * 1.2,
    `Index van ${Math.round(json.length / 1024)} kB is te groot voor een telefoon`,
  );
  assert.ok(index[0].tekst.length > 0, "Ook bij veel pagina's blijft er tekst over om op te zoeken");
}

// 5. Een kleine site krijgt juist ruime fragmenten
{
  const { index } = bouwZoekindex([pagina("index.html", "Home", "woord ".repeat(500))]);
  assert.ok(index[0].tekst.length > 1000, "Bij weinig pagina's mag er ruim tekst mee");
}

// 6. Geldige JSON, precies de velden waar het fragment op rekent
{
  const { json } = bouwZoekindex([pagina("index.html", "Home", "Tekst")]);
  const gelezen = JSON.parse(json);
  assert.deepEqual(Object.keys(gelezen[0]).sort(), ["pad", "tekst", "titel"]);
}

// 7. Paden
assert.equal(padVanBestand("index.html"), "/");
assert.equal(padVanBestand("over-ons/index.html"), "/over-ons/");
assert.equal(padVanBestand("404.html"), "/404.html");

// 8. Het fragment is compleet en haalt precies het pad op dat de deploy schrijft
{
  const f = zoekFragment();
  for (const stuk of ["ws-zoek-knop", "ws-zoekveld", "ws-zoekuitslag", "<style>", "<script>"])
    assert.ok(f.includes(stuk), `Fragment mist ${stuk}`);
  assert.ok(f.includes(`'/${ZOEKINDEX_PAD}'`), "Fragment haalt een ander pad op dan de deploy schrijft");
  assert.ok(f.includes('aria-expanded="false"'), "De knop hoort z'n toestand te melden");
  assert.ok(!f.includes("—"), "Geen lange streepjes in klantgerichte tekst");
}

// 9. Ingebouwd deel vult aan, maar een eigen versie van de klant wint altijd
{
  const leeg = vulIngebouwdeDelenAan(new Map());
  assert.ok(leeg.get(ZOEK_DEEL)?.includes("ws-zoek-knop"));

  const eigen = vulIngebouwdeDelenAan(new Map([[ZOEK_DEEL, "<div>eigen zoekvak</div>"]]));
  assert.equal(eigen.get(ZOEK_DEEL), "<div>eigen zoekvak</div>");
}


// 10. Een deel in een deel wordt uitgevouwen. Het zoekvak hoort in het menu, en
//     het menu is zelf een deel: met één ronde bleef die marker als commentaar
//     in de pagina staan.
{
  const { vouwUit } = await import("../lib/delen");
  const delen = vulIngebouwdeDelenAan(
    new Map([["menu", `<nav>menu<!--invoeg:${ZOEK_DEEL}--></nav>`]]),
  );
  const uit = vouwUit("<body><!--invoeg:menu--></body>", delen);
  assert.ok(uit.includes("ws-zoek-knop"), "Marker in een deel bleef staan");
  assert.ok(!uit.includes("<!--invoeg:"), "Er staat nog een marker in de pagina");
}

// 11. Een deel dat zichzelf invoegt loopt niet eindeloos door
{
  const { vouwUit } = await import("../lib/delen");
  const uit = vouwUit("<!--invoeg:lus-->", new Map([["lus", "x<!--invoeg:lus-->"]]));
  assert.ok(uit.length < 200, "Zelfverwijzend deel blijft groeien");
}

// 12. Een onbekende marker blijft staan: stil verdwijnen is erger dan opvallen
{
  const { vouwUit } = await import("../lib/delen");
  assert.equal(vouwUit("<!--invoeg:bestaatniet-->", new Map([["x", "y"]])), "<!--invoeg:bestaatniet-->");
}

console.log("zoeken: ok");
