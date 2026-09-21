import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { zonderAfsluiting } from "../lib/outreach";

/**
 * Onder elke outreachmail komt automatisch "Groet," plus de handtekening met
 * logo. De scan leverde teksten aan die zelf ook al eindigden op
 * "Jos Klijnhout / WordSwap", dus stond de afzender er drie keer onder, met
 * een achternaam die in koude post niet hoort: dat leest als een brief van
 * een instantie, niet als een mens.
 */

// 1. De slotregels gaan eraf, de inhoud blijft staan
const met = `Hallo,

Ik zag dat jullie site al een tijd stilstaat.

Antwoord gerust op deze mail, of bel me op 026 234 0122.

Jos Klijnhout
WordSwap`;
const uit = zonderAfsluiting(met);
assert.ok(uit.includes("026 234 0122"), "de inhoud mag niet meegeknipt worden");
assert.ok(!uit.includes("Klijnhout"), "de achternaam staat nog in de tekst");
assert.ok(!/\bWordSwap\s*$/.test(uit), "het bedrijf staat nog als slotregel onderaan");

// 2. Ook de losse varianten
for (const slot of ["Groet,\nJos", "Met vriendelijke groet,\nJos Klijnhout", "mvg\nJos", "Groeten,\nJos\nWordSwap"]) {
  assert.equal(zonderAfsluiting(`Tekst.\n\n${slot}`), "Tekst.", `niet geknipt: ${JSON.stringify(slot)}`);
}

// 3. Een naam midden in de tekst blijft: daar gaat het over iemand
assert.ok(
  zonderAfsluiting("Jos kijkt even mee.\n\nTot dan.").includes("Jos kijkt"),
  "een naam in de lopende tekst mag niet verdwijnen"
);
// 4. Een regel die op de naam lijkt maar inhoud is blijft ook staan
assert.ok(zonderAfsluiting("Bel Jos op 06").includes("Bel Jos op 06"));

// 5. De handtekening onder koude post gaat op de voornaam
const mailer = await readFile(new URL("../lib/mailer.ts", import.meta.url), "utf8");
assert.ok(
  /export const HANDTEKENING = handtekening\(true, "Jos"\);/.test(mailer),
  "de outreach-handtekening gebruikt niet de voornaam"
);
assert.ok(
  mailer.includes('naam = "Jos Klijnhout"'),
  "klantpost en leadpost horen de volledige naam te houden"
);

// 6. Jos' eigen regel: geen lange streepjes in wat de deur uit gaat
const tekening = mailer.slice(mailer.indexOf("export function handtekening"), mailer.indexOf("export const HANDTEKENING"));
assert.ok(!tekening.includes("—"), "lang streepje in de handtekening van elke mail");

// 7. De mail zelf knipt het slot ook weg
const outreach = await readFile(new URL("../lib/outreach.ts", import.meta.url), "utf8");
assert.ok(
  outreach.includes("const alineas = zonderAfsluiting(tekst)"),
  "de HTML-mail knipt de dubbele ondertekening niet weg"
);

console.log("outreach-ondertekening: ok");
