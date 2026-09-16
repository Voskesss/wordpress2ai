/** Test voor de directe foto-acties (verwijderen en een plek opschuiven).
 * Draaien: node --import tsx tests/foto-ordenen.mts — geen database of AI nodig. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { vindFotoInReeks, verwijderKaart, wisselKaarten } from "../lib/foto-ordenen";

const raster = `<div class="galerij">
  <figure class="kaart"><img src="afbeeldingen/een.webp" alt="Een"><figcaption>Een</figcaption></figure>
  <figure class="kaart"><img src="afbeeldingen/twee.webp" alt="Twee"><figcaption>Twee</figcaption></figure>
  <figure class="kaart"><img src="afbeeldingen/drie.webp" alt="Drie"><figcaption>Drie</figcaption></figure>
</div>`;

// 1) Vindt de foto en zijn plek in de reeks
const gevonden = vindFotoInReeks(raster, "afbeeldingen/twee.webp");
assert.ok(gevonden);
assert.equal(gevonden.kaarten.length, 3, "drie kaarten in de reeks");
assert.equal(gevonden.index, 1, "tweede foto");

// 2) Verwijderen haalt de hele kaart weg, niet alleen de foto
const na = verwijderKaart(raster, gevonden.kaarten[1]);
assert.ok(!na.includes("twee.webp") && !na.includes(">Twee<"), "kaart helemaal weg");
assert.ok(na.includes("een.webp") && na.includes("drie.webp"), "buren blijven staan");
assert.equal((na.match(/<figure/g) ?? []).length, 2);
assert.ok(!/\n\s*\n/.test(na), "geen lege regel achtergelaten");

// 3) Een plek naar voren wisselt met de buurman en laat de rest ongemoeid
const gewisseld = wisselKaarten(raster, gevonden.kaarten[1], gevonden.kaarten[0]);
const volgorde = [...gewisseld.matchAll(/src="afbeeldingen\/([a-z]+)\.webp"/g)].map((m) => m[1]);
assert.deepEqual(volgorde, ["twee", "een", "drie"]);
assert.equal(gewisseld.length, raster.length, "niets verloren of bijgekomen");

// 4) Losse foto (geen reeks): alleen de foto zelf
const los = `<section><p>Hallo</p><img src="afbeeldingen/solo.webp" alt="Solo"></section>`;
const alleen = vindFotoInReeks(los, "afbeeldingen/solo.webp");
assert.ok(alleen);
assert.equal(alleen.kaarten.length, 1, "geen reeks");
assert.ok(!verwijderKaart(los, alleen.kaarten[0]).includes("solo.webp"));

// 5) Onbekende foto geeft niets terug
assert.equal(vindFotoInReeks(raster, "afbeeldingen/bestaat-niet.webp"), null);

// 6) Echte klantpagina: tegels met foto's worden als reeks herkend
const echt = await readFile(
  "/Users/josklijnhout/wordswap-klanten/ovburo/projecten/index.html",
  "utf8",
);
const eersteSrc = echt.match(/<img[^>]+src="([^"]+)"/)?.[1];
assert.ok(eersteSrc, "testpagina heeft een foto");
const echtGevonden = vindFotoInReeks(echt, eersteSrc);
assert.ok(echtGevonden, "foto gevonden op de echte pagina");
const naEcht = verwijderKaart(echt, echtGevonden.kaarten[echtGevonden.index]);
assert.ok(naEcht.length < echt.length, "er is iets weggehaald");
assert.ok(
  (naEcht.match(/<img/g) ?? []).length === (echt.match(/<img/g) ?? []).length - 1,
  "precies één foto minder",
);

console.log(
  `PASS: reeks herkend (${echtGevonden.kaarten.length} kaarten op de echte projectenpagina), verwijderen haalt de hele kaart weg, wisselen behoudt de rest, losse foto en onbekende foto correct afgehandeld.`,
);
