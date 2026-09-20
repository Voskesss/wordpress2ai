import assert from "node:assert/strict";
import { GALERIJ_DREMPEL, galerijSlug, kiesGalerijPaginas, maakGalerijFragment } from "../lib/galerij";

// Slugs: pad → bestandsnaam voor delen/galerij-<slug>.html
assert.equal(galerijSlug("/"), "home");
assert.equal(galerijSlug("/portugal/"), "portugal");
assert.equal(galerijSlug("/waddenzee/over-de-waddenzee/"), "waddenzee-over-de-waddenzee");

const foto = (n: number) => `https://oud.nl/wp-content/uploads/dsc${n}.jpg`;
const mediaMap: Record<string, string> = {};
for (let n = 1; n <= 40; n++) mediaMap[foto(n)] = `/afbeeldingen/dsc${n}.webp`;
mediaMap["https://oud.nl/logo.png"] = "/afbeeldingen/logo.webp";
mediaMap["https://oud.nl/hero.jpg"] = "/afbeeldingen/hero.webp";

const logo = { src: "https://oud.nl/logo.png", alt: "Logo" };
const album = (van: number, tot: number) => Array.from({ length: tot - van + 1 }, (_, i) => ({ src: foto(van + i), alt: "" }));

const perPagina = {
  "/": [logo, { src: "https://oud.nl/hero.jpg", alt: "(achtergrond)" }, ...album(1, 3)],
  "/molens/": [logo, ...album(1, 20), { src: foto(1), alt: "dubbel" }],
  "/waddenzee/": [logo, ...album(21, 40), { src: "https://oud.nl/icoon.svg", alt: "icoon" }],
  "/contact/": [logo],
};

const galerijen = kiesGalerijPaginas(perPagina, mediaMap, { "/molens/": "Molens" });

// Alleen pagina's met genoeg foto's; het logo (op elke pagina) en achtergronden tellen niet mee
assert.deepEqual(galerijen.map((g) => g.pad), ["/molens/", "/waddenzee/"]);
const molens = galerijen[0];
assert.equal(molens.slug, "molens");
assert.equal(molens.fotos.length, 20); // dubbele foto 1 telt één keer, logo weg
assert.ok(molens.fotos.every((f) => f.bestand !== "/afbeeldingen/logo.webp"));
// Lege alt krijgt een bruikbare fallback met de paginatitel
assert.equal(molens.fotos[0].alt, "Molens 1");
// svg-iconen en niet-gedownloade beelden doen niet mee
assert.equal(galerijen[1].fotos.length, 20);
assert.ok(GALERIJ_DREMPEL <= 20);

// Het fragment: elke foto lazy, met alt, klikbaar naar het grote bestand; tekst netjes ontsnapt
const html = maakGalerijFragment([
  { bestand: "/afbeeldingen/a.webp", alt: 'Zonsondergang "Lauwersmeer"' },
  { bestand: "/afbeeldingen/b.webp", alt: "Molen & sloot" },
]);
assert.equal((html.match(/<img /g) ?? []).length, 3); // 2 foto's + de vergroting
assert.equal((html.match(/loading="lazy"/g) ?? []).length, 2);
assert.ok(html.includes('alt="Zonsondergang &quot;Lauwersmeer&quot;"'));
assert.ok(html.includes('alt="Molen &amp; sloot"'));
assert.ok(html.includes('href="/afbeeldingen/a.webp"'));
assert.ok(html.includes("<dialog"));
assert.ok(html.startsWith("<!-- Fotogalerij"));

console.log("galerij: alle checks geslaagd");
