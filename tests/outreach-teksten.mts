import assert from "node:assert/strict";
import { maakOutreachMail, standaardSjabloon } from "../lib/outreach";

/**
 * De ingebouwde mails zijn het vangnet: er staan geen sjablonen in de database
 * en de scan schrijft alleen mail 1. Mail 2 en 3 komen dus altijd hiervandaan.
 *
 * Daar stond nog in dat de klant de kopie "eerst werkend, gratis" te zien
 * krijgt, terwijl dat gratis voorproefje er juist uit moest. En mail 2 noemde
 * een prijs, wat botst met de prijs die Jos per site in mail 1 zet.
 */

const p = {
  id: 1,
  bedrijf: "Van der Veen Schilderwerken",
  website: "vanderveenschilderwerken.nl",
  prijs: null,
  observatie: null,
} as Parameters<typeof maakOutreachMail>[1];

// 1. Geen gratis voorproefje, nergens
for (const n of [1, 2, 3] as const) {
  const html = maakOutreachMail(n, p).html;
  const tekst = standaardSjabloon(n).tekst;
  for (const [waar, inhoud] of [["mail", html], ["sjabloon", tekst]] as const) {
    assert.ok(!/gratis/i.test(inhoud), `${waar} ${n} belooft nog iets gratis`);
    assert.ok(!/eerst werkend/i.test(inhoud), `${waar} ${n} belooft nog een voorproefje`);
  }
}

// 2. Geen prijzen in mail 2 en 3; mail 1 noemt ze wel
for (const n of [2, 3] as const) {
  const html = maakOutreachMail(n, p).html;
  const tekst = standaardSjabloon(n).tekst;
  for (const [waar, inhoud] of [["mail", html], ["sjabloon", tekst]] as const) {
    assert.ok(!/€|euro per maand|\b150\b|\b19\b/.test(inhoud), `${waar} ${n} noemt een prijs`);
  }
}
assert.match(maakOutreachMail(1, p).html, /150 euro/, "mail 1 noemt geen prijs meer");
assert.match(maakOutreachMail(1, p).html, /19 euro per maand/, "mail 1 noemt het maandbedrag niet");

// 3. Een eigen prijs komt in mail 1 terecht, in plaats van het vanaf-bedrag
const metPrijs = maakOutreachMail(1, { ...p, prijs: "€400" } as typeof p).html;
assert.match(metPrijs, /€400/, "een eigen prijs komt niet in de mail");
assert.ok(!/vanaf 150 euro/.test(metPrijs), "het vanaf-bedrag staat er nog naast");

// 4. Elke mail eindigt met een vraag of een afsluiting, niet met een eis
for (const n of [1, 2] as const) {
  assert.match(maakOutreachMail(n, p).html, /Zal ik laten zien/, `mail ${n} nodigt niet uit`);
}

// 5. Drie verschillende onderwerpen, alle drie in kleine letters
const onderwerpen = [1, 2, 3].map((n) => maakOutreachMail(n as 1 | 2 | 3, p).onderwerp);
assert.equal(new Set(onderwerpen).size, 3, "twee mails delen hetzelfde onderwerp");
for (const o of onderwerpen) {
  assert.equal(o[0], o[0].toLowerCase(), `onderwerp begint met een hoofdletter: "${o}"`);
  assert.ok(!/^(re:|fwd:)/i.test(o), `onderwerp doet alsof er al contact was: "${o}"`);
}

// 6. Jos' eigen regel: geen lange streepjes in wat de deur uitgaat
for (const n of [1, 2, 3] as const) {
  assert.ok(!maakOutreachMail(n, p).html.includes("—"), `lang streepje in mail ${n}`);
  assert.ok(!standaardSjabloon(n).tekst.includes("—"), `lang streepje in sjabloon ${n}`);
}

console.log("outreach-teksten: ok");
