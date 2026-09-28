/**
 * EVC 28-09: "zet bij actueel een nieuw stukje" leverde een artikel en
 * bijgewerkte overzichten op, maar niet de tegel in het Actueel-blok op de
 * homepage. Dat blok is een selectie (data-selectie="uitgelicht") en de
 * reeksregel zei: selecties pas na overleg wijzigen. Maar de eigenaar had
 * de plek zelf al genoemd; vragen was dus overbodig en de klus leek half.
 * Dezelfde regel legt nu ook de volgorde vast: zichtbaar werk eerst.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const h = await readFile("lib/huisregels.ts", "utf8");
const i = h.indexOf("- BERICHTEN- EN PROJECTREEKSEN:");
assert.ok(i >= 0, "de reeksregel is verdwenen");
const regel = h.slice(i, h.indexOf("\n", i));

// De bestaande bescherming van selecties blijft staan...
assert.ok(/wijzig je pas na antwoord/.test(regel), "selecties worden niet meer beschermd (overleg vóór wijzigen is weg)");
// ...maar een zelf genoemde plek IS het antwoord
assert.ok(/noemt de eigenaar zelf de plek \("zet het bij actueel"/.test(regel), "de uitzondering voor een zelf genoemde plek ontbreekt");
assert.ok(/zet het nieuwe item daar bovenaan zonder te vragen/.test(regel), "bij een genoemde plek wordt nog steeds eerst gevraagd");
assert.ok(/laat dan de oudste vallen en zeg in je antwoord welke dat was/.test(regel), "bij een vast aantal tegels is niet geregeld wat eruit gaat");
// Volgorde: zichtbaar werk eerst, extra's als laatste
assert.ok(/eerst de pagina van het item zelf, dan de plek die de eigenaar noemde, dan de overzichtspagina's, en pas als laatste de extra's/.test(regel), "de volgorde (zichtbaar werk eerst) ontbreekt");
// Er is maar één regel voor reeksen (geen dubbele, tegenstrijdige regel ernaast)
assert.equal((h.match(/NIEUW BERICHT OP EEN SITE MET BERICHTEN/g) ?? []).length, 0, "er staat een tweede, dubbele reeksregel naast de bestaande");

console.log("reeks-plek-genoemd: genoemde plek = antwoord, selecties verder beschermd, zichtbaar werk eerst");
