import assert from "node:assert/strict";
import {
  GEEN_SPAM,
  interpreteerSpamAntwoord,
  veldenAlsTekst,
} from "../lib/formulier-spam";

// Duidelijk oordeel van het model wordt overgenomen, met reden voor het portaal
assert.deepEqual(
  interpreteerSpamAntwoord('{"spam":true,"reden":"Aangeboden SEO-dienst"}'),
  { spam: true, reden: "Aangeboden SEO-dienst" },
);
assert.deepEqual(interpreteerSpamAntwoord('{"spam":false}'), {
  spam: false,
  reden: null,
});

// Praat het model eromheen, dan pakken we alsnog alleen de JSON
assert.equal(
  interpreteerSpamAntwoord('Dit lijkt me spam: {"spam":true,"reden":"massabericht"}').spam,
  true,
);

// Alles wat geen helder "spam: true" is, telt als geen spam: een echte
// aanvraag mag nooit stilletjes verdwijnen
for (const antwoord of [
  "",
  "geen json",
  '{"spam":"ja"}',
  '{"reden":"x"}',
  '{"spam":null}',
  "{kapotte json",
]) {
  assert.equal(interpreteerSpamAntwoord(antwoord).spam, false, antwoord);
}

// Zonder reden toch een leesbare vermelding in het portaal
assert.equal(
  interpreteerSpamAntwoord('{"spam":true}').reden,
  "Herkend als massaspam",
);
// Een eindeloze reden wordt afgekapt
assert.equal(
  interpreteerSpamAntwoord(`{"spam":true,"reden":"${"x".repeat(500)}"}`).reden!
    .length,
  200,
);

// Veldtekst blijft binnen het budget, ook bij een gigantisch bericht
const lang = veldenAlsTekst({ naam: "Jan", bericht: "x".repeat(10_000) });
assert.ok(lang.length <= 2000);
assert.ok(lang.startsWith("naam: Jan"));

// De terugvalwaarde laat alles door en registreert geen kosten
assert.equal(GEEN_SPAM.spam, false);
assert.equal(GEEN_SPAM.kostenUsd, 0);

console.log("✓ formulier-spam");
