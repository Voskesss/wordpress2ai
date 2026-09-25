/**
 * Het vertrekpakket is de site, niet de bron (les 25-09, RoelArt).
 *
 * De websitedownload in het portaal was een redirect naar de rauwe GitHub-zip:
 * pagina's met onuitgevouwen <!--invoeg:-->-markers (13x menu/footer/topbalk
 * bij RoelArt) en het placeholder-domein. Elders neergezet was dat een site
 * zonder menu. Deze test voert het echte pakket-pad uit met een nagebouwde
 * repo en controleert dat de klant een werkende site plus handleiding krijgt.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { verwerkVertrek, maakVertrekMd, schoonDomein } from "../lib/vertrek";

const B = (s: string) => Buffer.from(s);
const repo = [
  {
    pad: "index.html",
    data: B(`<!DOCTYPE html><html><head><title>Voorbeeld</title><link rel="canonical" href="https://VERVANG.nl/"></head>
<body><!--invoeg:topbalk--><!--invoeg:menu-->
<img src="/afbeeldingen/hero.webp" alt="hero">
<form method="POST" action="https://wordswap.nl/api/formulier"><input name="naam"></form>
<!--invoeg:footer--></body></html>`),
  },
  { pad: "over/index.html", data: B(`<html><head><title>Over ons</title></head><body><!--invoeg:menu--><p>Tekst over ons.</p></body></html>`) },
  { pad: "delen/menu.html", data: B(`<nav id="hoofdmenu"><a href="/">Home</a></nav>`) },
  { pad: "delen/topbalk.html", data: B(`<div id="topbalk">Bel ons</div>`) },
  { pad: "delen/footer.html", data: B(`<footer id="voet">Voorbeeld BV</footer>`) },
  { pad: "afbeeldingen/hero.webp", data: B("nepbeeld") },
  { pad: "afbeeldingen/hero-600.webp", data: B("nepbeeld-klein") },
  { pad: "sitemap.xml", data: B(`<urlset><url><loc>https://VERVANG.nl/</loc></url></urlset>`) },
];

const uit = verwerkVertrek(repo, { domein: "voorbeeld.nl", repo: "voorbeeld" });
const per = new Map(uit.map((b) => [b.pad, b.data.toString("utf8")]));

// 1. Alle markers uitgevouwen, op elke pagina, en de inhoud staat er echt
for (const pad of ["index.html", "over/index.html"]) {
  const html = per.get(pad)!;
  assert.ok(!/<!--\s*invoeg:/i.test(html), `${pad}: er staat nog een onuitgevouwen invoeg-marker in`);
  assert.ok(html.includes('id="hoofdmenu"'), `${pad}: het menu is niet ingevoegd`);
}
assert.ok(per.get("index.html")!.includes('id="voet"'), "de footer is niet ingevoegd");

// 2. De delen-map gaat niet mee (pagina's zijn al uitgevouwen)
assert.ok(![...per.keys()].some((p) => p.startsWith("delen/")), "de delen-map zit nog in het pakket");

// 3. Het echte domein is ingevuld, ook in de sitemap
assert.ok(per.get("index.html")!.includes("https://voorbeeld.nl/"), "canonical staat nog op het placeholder-domein");
assert.ok(!per.get("sitemap.xml")!.includes("VERVANG.nl"), "sitemap staat nog op het placeholder-domein");

// 4. Beeldvarianten: srcset gezet zoals de deploy dat doet
assert.ok(/srcset=/.test(per.get("index.html")!), "srcset ontbreekt op het beeld met varianten");

// 5. Zoekindex meegeleverd (het zoekvak leest /zoekindex.json)
assert.ok(per.has("zoekindex.json"), "zoekindex.json ontbreekt in het pakket");

// 6. De handleiding: bovenin het pakket, met domein, AI-prompt en de formulier-pagina
const md = per.get("VERTREK.md")!;
assert.equal(uit[0].pad, "VERTREK.md", "VERTREK.md staat niet vooraan in het pakket");
assert.ok(md.includes("voorbeeld.nl"), "VERTREK.md noemt het eigen domein niet");
assert.ok(md.includes("ChatGPT") && md.includes("één vraag tegelijk"), "de AI-prompt ontbreekt in VERTREK.md");
assert.ok(md.includes("- /") && md.includes("formspree"), "de formulier-pagina's of de formulier-oplossing ontbreken");
assert.ok(md.includes("MX-records"), "de waarschuwing om e-mailinstellingen met rust te laten ontbreekt");

// 7. Klanttaal: nooit lange streepjes in VERTREK.md (huisstijlregel)
assert.ok(!md.includes("—"), "VERTREK.md bevat een lang streepje");

// 8. Zonder formulieren en zonder domein: eerlijke andere tekst
const kaal = maakVertrekMd({ domein: null, formulierPaginas: [], heeftActueel: false });
assert.ok(kaal.includes("geen formulieren"), "de tekst zonder formulieren klopt niet");
assert.ok(kaal.includes("jouw domein"), "zonder domein hoort er 'jouw domein' te staan");
assert.equal(schoonDomein("https://www.roelart.nl/"), "www.roelart.nl");
assert.equal(schoonDomein("iets.workers.dev"), null);

// 9. De route gebruikt het pakket en stuurt niet meer door naar de rauwe repo-zip
const route = await readFile(new URL("../app/api/portal/meenemen/website/route.ts", import.meta.url), "utf8");
assert.ok(route.includes("verwerkVertrek"), "de route bouwt het vertrekpakket niet");
assert.ok(!route.includes("NextResponse.redirect"), "de route stuurt weer door naar de rauwe repo-zip");

console.log("vertrek: ok");
