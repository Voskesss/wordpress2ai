import assert from "node:assert/strict";
import {
  GEEN_SPAM,
  interpreteerSpamAntwoord,
  veldenAlsTekst,
} from "../lib/formulier-spam";

// De drie standen van het model worden overgenomen, met reden voor het portaal
assert.deepEqual(
  interpreteerSpamAntwoord('{"spam":"zeker","reden":"Aangeboden SEO-dienst"}'),
  { stand: "zeker", reden: "Aangeboden SEO-dienst" },
);
assert.deepEqual(
  interpreteerSpamAntwoord('{"spam":"waarschijnlijk","reden":"Generiek verkooppraatje"}'),
  { stand: "waarschijnlijk", reden: "Generiek verkooppraatje" },
);
assert.deepEqual(interpreteerSpamAntwoord('{"spam":"geen"}'), {
  stand: null,
  reden: null,
});

// Praat het model eromheen, dan pakken we alsnog alleen de JSON
assert.equal(
  interpreteerSpamAntwoord('Dit lijkt me spam: {"spam":"zeker","reden":"massabericht"}').stand,
  "zeker",
);

// Alles wat geen helder oordeel is, telt als geen spam: een echte aanvraag
// mag nooit stilletjes verdwijnen
for (const antwoord of [
  "",
  "geen json",
  '{"spam":true}', // het oude boolean-antwoord telt niet meer als oordeel
  '{"spam":"ja"}',
  '{"spam":"misschien"}',
  '{"reden":"x"}',
  '{"spam":null}',
  "{kapotte json",
]) {
  assert.equal(interpreteerSpamAntwoord(antwoord).stand, null, antwoord);
}

// Zonder reden toch een leesbare vermelding in het portaal
assert.equal(
  interpreteerSpamAntwoord('{"spam":"zeker"}').reden,
  "Herkend als massaspam",
);
// Een eindeloze reden wordt afgekapt
assert.equal(
  interpreteerSpamAntwoord(`{"spam":"zeker","reden":"${"x".repeat(500)}"}`).reden!
    .length,
  200,
);

// Veldtekst blijft binnen het budget, ook bij een gigantisch bericht
const lang = veldenAlsTekst({ naam: "Jan", bericht: "x".repeat(10_000) });
assert.ok(lang.length <= 2000);
assert.ok(lang.startsWith("naam: Jan"));

// De terugvalwaarde laat alles door en registreert geen kosten
assert.equal(GEEN_SPAM.stand, null);
assert.equal(GEEN_SPAM.kostenUsd, 0);

console.log("✓ formulier-spam");
