import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { WORDSWAP_FEITEN } from "../lib/wordswap-feiten";
import { GROEPEN } from "../lib/uitsluiten";

/**
 * De briefing die Cowork krijgt en de feiten die onze eigen AI krijgt moeten
 * hetzelfde verhaal vertellen. Toen dat niet zo was stonden er drie prijzen
 * tegelijk in het systeem: 150 in de code, 250 in de klaarstaande mails en
 * "no cure no pay" in de AI-instructie.
 */

const brief = await readFile(new URL("../docs/cowork-briefing.md", import.meta.url), "utf8");

// 1. Dezelfde bedragen als in onze eigen feiten
for (const bedrag of ["150 euro", "19 euro", "39 euro", "15 euro"]) {
  assert.ok(brief.includes(bedrag), `${bedrag} ontbreekt in de briefing`);
}
assert.ok(!/\b250\b/.test(brief), "het oude bedrag van 250 euro staat in de briefing");
assert.ok(WORDSWAP_FEITEN.includes("150 euro"), "de feiten en de briefing lopen uit elkaar");

// 2. Elke uitgesloten groep staat erin, zodat Cowork ze niet aanlevert
const klein = brief.toLowerCase();
for (const g of GROEPEN) {
  assert.ok(klein.includes(g.label.toLowerCase()), `groep ${g.label} staat niet in de briefing`);
  // Niet elk woord hoeft erin (enkelvoud dekt het meervoud), wel genoeg om
  // te herkennen waar de groep over gaat.
  const genoemd = g.woorden.filter((w) => klein.includes(w)).length;
  assert.ok(genoemd >= 3, `groep ${g.label}: maar ${genoemd} van de woorden staan in de briefing`);
}

// 3. De vormregels die het vaakst misgingen staan er expliciet in
for (const [zoek, waarom] of [
  ["ondertekening", "de dubbele ondertekening"],
  ["achternaam", "de achternaam in koude post"],
  ["lange streepjes", "de lange streepjes"],
  ["bevestigd", "de eis van een bevestigde bevinding"],
] as const) {
  assert.ok(brief.toLowerCase().includes(zoek), `de briefing zegt niets over ${waarom}`);
}

// 4. De briefing houdt zich zelf aan de streepjesregel
assert.ok(!brief.includes("—"), "lang streepje in de briefing");

// 5. De velden die de ingang echt accepteert staan erin
const route = await readFile(new URL("../app/api/scan-prospects/route.ts", import.meta.url), "utf8");
for (const veld of ["mailbaar", "bevindingen", "contactpersoon", "mailtekst", "onderwerp", "kans"]) {
  assert.ok(route.includes(veld), `het veld ${veld} bestaat niet meer in de ingang`);
  assert.ok(brief.includes(`\`${veld}\``), `het veld ${veld} staat niet in de briefing`);
}

// 6. De grenzen staan erin: dit is waar een koude mail een klant kost
for (const [zoek, waarom] of [
  ["webshop", "de webshop-grens"],
  ["ledeninlog", "de ledeninlog-grens"],
  ["nieuwsbrief", "de nieuwsbrief-grens"],
  ["occasions", "de gekoppelde voorraad"],
] as const) {
  assert.ok(klein.includes(zoek), `de briefing zegt niets over ${waarom}`);
}

// 7. De onderdelen die wij niet bouwen staan ook echt als grens in de briefing.
//    lib/verlies.ts is de waarheid over wat een oude site had en wij niet doen.
const verlies = await readFile(new URL("../lib/verlies.ts", import.meta.url), "utf8");
for (const naam of ["webshop", "ledeninlog", "reacties"]) {
  assert.ok(verlies.includes(`naam: "${naam}"`), `${naam} is geen onderdeel meer in lib/verlies.ts`);
  assert.ok(klein.includes(naam), `${naam} ontbreekt in de briefing`);
}

// 8. Gekoppelde voorraad mag pas beloofd worden als het gebouwd is
assert.ok(
  /noem het niet in een mail|beloof het niet/i.test(brief),
  "de briefing verbiedt het beloven van een voorraadkoppeling niet"
);

console.log("cowork-briefing: ok");
