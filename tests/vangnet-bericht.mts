/**
 * Hoe de vangnet-waarschuwing in het antwoord belandt. Hier zaten de duurste
 * fouten: niet in het vergelijken zelf, maar eromheen — een keuzeregel die
 * niet de laatste regel is (dan worden het kale tekst in plaats van knoppen),
 * twee keuzeregels onder elkaar, of een waarschuwing die wegvalt terwijl de
 * eigenaar er niet om vroeg.
 * Draaien: node --import tsx tests/vangnet-bericht.mts
 */
import assert from "node:assert/strict";
import { bouwVangnetAntwoord, vraagtAlleenHier } from "../lib/vangnet-bericht";

const MELDING = 'Let op: de tekst "Kerststol-actie" staat óók nog op /projecten.';
const laatsteRegel = (t: string) => t.trimEnd().split("\n").at(-1) ?? "";

// ── Wanneer onderdrukken we de waarschuwing? ──────────────────────────────
// De eigenaar zegt zelf dat het maar op één plek hoeft: dan is waarschuwen ruis.
for (const zin of [
  "pas dit alleen hier aan",
  "alleen op deze pagina graag",
  "verander alleen die kop, nergens anders",
  "alleen op de homepage",
  "deze plek alleen",
  "doe verder niets",
  "de rest laten staan",
])
  assert.ok(vraagtAlleenHier(zin), `moet onderdrukken: "${zin}"`);

// Maar een gewone opdracht mag nooit onderdrukt worden, ook niet als het woord
// "alleen" er toevallig in staat in een andere betekenis.
for (const zin of [
  "zet de nieuwe openingstijden erop",
  "vervang de foto op de over-ons-pagina",
  "maak een nieuwe pagina voor workshops",
  "we zijn voortaan alleen op afspraak open",
])
  assert.ok(!vraagtAlleenHier(zin), `mag niet onderdrukken: "${zin}"`);

// ── Zonder meldingen blijft het antwoord ongemoeid ────────────────────────
let uit = bouwVangnetAntwoord({ reply: "Ik heb de kop aangepast.", meldingen: [] });
assert.equal(uit.reply, "Ik heb de kop aangepast.");
assert.equal(uit.vraag, false);

// ── Met melding: waarschuwing plus keuzeregel als állerlaatste regel ──────
uit = bouwVangnetAntwoord({ reply: "Ik heb de kop aangepast.", meldingen: [MELDING] });
assert.equal(uit.vraag, true);
assert.match(uit.reply, /Kerststol-actie/);
assert.equal(
  laatsteRegel(uit.reply),
  "KEUZES: Overal doorvoeren | Het moest alleen hier",
  "de keuzeregel moet onderaan staan, anders worden het geen knoppen",
);

// ── De AI had zelf al keuzes bedacht: die vervallen, en er blijft er één ──
uit = bouwVangnetAntwoord({
  reply: "Zal ik hem ook in het menu zetten?\nKEUZES: Doe maar zoals jij voorstelt | Niet in het menu",
  meldingen: [MELDING],
});
assert.equal(
  (uit.reply.match(/^KEUZES:/gm) ?? []).length,
  1,
  "er mag maar één keuzeregel in het antwoord staan",
);
assert.ok(!uit.reply.includes("Niet in het menu"), "de oude keuzes zijn vervallen");
assert.equal(laatsteRegel(uit.reply), "KEUZES: Overal doorvoeren | Het moest alleen hier");

// ── De testomgeving zet er een regel onder: de keuzeregel blijft laatste ──
uit = bouwVangnetAntwoord({
  reply: "Ik heb de kop aangepast.",
  meldingen: [MELDING],
  debug: "basis=abc1234 gewijzigd=index.html meldingen=1",
});
assert.match(uit.reply, /\[vangnet: basis=abc1234/);
assert.equal(
  laatsteRegel(uit.reply),
  "KEUZES: Overal doorvoeren | Het moest alleen hier",
  "ook met een testregel eronder blijft de keuzeregel de laatste",
);

// Zonder melding maar mét testregel: geen keuzeregel, wel de testregel
uit = bouwVangnetAntwoord({ reply: "Klaar.", meldingen: [], debug: "onderdrukt door alleen-hier" });
assert.ok(!uit.reply.includes("KEUZES:"));
assert.match(uit.reply, /onderdrukt door alleen-hier/);

// ── Meerdere meldingen komen er allemaal in, elk op een eigen regel ───────
uit = bouwVangnetAntwoord({
  reply: "Aangepast.",
  meldingen: [MELDING, "Let op: het telefoonnummer staat óók nog op /contact."],
});
assert.equal((uit.reply.match(/⚠️/g) ?? []).length, 2);
assert.equal(laatsteRegel(uit.reply), "KEUZES: Overal doorvoeren | Het moest alleen hier");

console.log(
  "PASS vangnet-bericht: onderdrukking bij 'alleen hier' (en niet bij gewone opdrachten), antwoord ongemoeid zonder melding, keuzeregel altijd als laatste regel, eigen keuzes van de AI vervallen zodat er nooit twee staan, testregel verandert de volgorde niet, en meerdere meldingen komen er allemaal in.",
);
