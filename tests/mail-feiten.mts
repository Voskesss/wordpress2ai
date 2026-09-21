import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { WORDSWAP_FEITEN } from "../lib/wordswap-feiten";

/**
 * De Verbeter-knop kende één zin over WordSwap. Vroeg Jos "noem de prijs",
 * dan verzon het model er een. Ondertussen stonden er drie verschillende
 * verhalen in het systeem: 150 euro in de code, 250 euro in de mails die de
 * scan aanleverde, en "no cure no pay" in de AI-instructie.
 *
 * Nu staan de feiten op één plek. Deze test bewaakt dat het er één blijft.
 */

// 1. De feiten noemen het juiste bedrag en nergens het oude
assert.ok(WORDSWAP_FEITEN.includes("150 euro"), "het eenmalige bedrag staat niet in de feiten");
assert.ok(WORDSWAP_FEITEN.includes("19 euro per maand"), "het maandbedrag staat niet in de feiten");
assert.ok(!WORDSWAP_FEITEN.includes("250"), "het oude bedrag van 250 euro staat nog in de feiten");

// 2. Het model mag niets verzinnen wat er niet staat
assert.ok(/verzin nooit/i.test(WORDSWAP_FEITEN), "de feiten verbieden verzinnen niet");

// 3. Jos' eigen grenzen staan erin
assert.ok(/domein/i.test(WORDSWAP_FEITEN), "de domeingrens ontbreekt");
assert.ok(/drukwerk/i.test(WORDSWAP_FEITEN), "de fotogrens ontbreekt");

// 4. Geen lange streepjes: deze tekst stuurt de schrijfstijl van de mails aan
assert.ok(!WORDSWAP_FEITEN.includes("—"), "lang streepje in de feiten");

// 5. Beide varianten van de Verbeter-knop krijgen de feiten mee
const route = await readFile(new URL("../app/api/admin/mail-verbeter/route.ts", import.meta.url), "utf8");
assert.equal(
  (route.match(/\$\{WORDSWAP_FEITEN\}/g) ?? []).length,
  2,
  "niet allebei de instructies (losse mail en acquisitie) krijgen de feiten mee"
);

// 6. Geen tweede prijsverhaal meer in de instructie zelf
assert.ok(!/no cure no pay/i.test(route), "de instructie belooft nog iets wat nergens anders staat");
assert.ok(!/\b250\b/.test(route), "het oude bedrag staat nog in de instructie");

// 7. De code zelf noemt ook nergens meer 250 als prijs
for (const bestand of ["../lib/outreach.ts", "../db/schema.ts", "../app/admin/outreach/page.tsx"]) {
  const inhoud = await readFile(new URL(bestand, import.meta.url), "utf8");
  assert.ok(!/€\s?250|250 euro/.test(inhoud), `het oude bedrag staat nog in ${bestand}`);
}

console.log("mail-feiten: ok");
