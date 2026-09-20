import assert from "node:assert/strict";
import {
  FORMULIER_NA_DAGEN,
  LAATSTE_NA_DAGEN,
  OPVOLGER_NA_DAGEN,
  maakFormulierBericht,
  maakLaatste,
  maakOpvolger,
  maakStap,
  volgendeStap,
} from "../lib/lead-opvolging";

const nu = new Date("2026-09-20T10:00:00Z");
const dagenTerug = (n: number) => new Date(nu.getTime() - n * 86_400_000);

// Zonder eerste mail doet de cadans niets: die eerste mail maakt Jos altijd zelf
assert.equal(volgendeStap({ aantalUit: 0, laatsteUit: null, heeftReactie: false, nu }), null);

// Een reactie stopt de opvolging, hoe oud de laatste mail ook is
assert.equal(volgendeStap({ aantalUit: 1, laatsteUit: dagenTerug(30), heeftReactie: true, nu }), null);

// Na mail 1: opvolger pas als de wachttijd voorbij is
assert.equal(volgendeStap({ aantalUit: 1, laatsteUit: dagenTerug(OPVOLGER_NA_DAGEN - 1), heeftReactie: false, nu }), null);
assert.equal(volgendeStap({ aantalUit: 1, laatsteUit: dagenTerug(OPVOLGER_NA_DAGEN), heeftReactie: false, nu }), "opvolger");

// Na de opvolger: laatste mail, en daarna de formulier-stap
assert.equal(volgendeStap({ aantalUit: 2, laatsteUit: dagenTerug(LAATSTE_NA_DAGEN - 1), heeftReactie: false, nu }), null);
assert.equal(volgendeStap({ aantalUit: 2, laatsteUit: dagenTerug(LAATSTE_NA_DAGEN), heeftReactie: false, nu }), "laatste");
assert.equal(volgendeStap({ aantalUit: 3, laatsteUit: dagenTerug(FORMULIER_NA_DAGEN), heeftReactie: false, nu }), "formulier");

// Na de formulier-stap houdt het op: niemand krijgt een vijfde bericht
assert.equal(volgendeStap({ aantalUit: 4, laatsteUit: dagenTerug(60), heeftReactie: false, nu }), null);

// Teksten: voornaam in de aanhef, website in het opvolg-onderwerp
{
  const m = maakOpvolger("Gerard Groenen", "gerardgroenen.nl");
  assert.ok(m.tekst.startsWith("Hallo Gerard,"));
  assert.ok(m.onderwerp.includes("gerardgroenen.nl"));
  assert.ok(m.tekst.includes("laat maar zien"));
}
{
  const m = maakLaatste("Gerard Groenen");
  assert.ok(m.tekst.includes("laatste berichtje"));
  assert.ok(m.tekst.includes("wordswap.nl"));
}
// De formuliertekst legt uit wáárom het via het formulier gaat (spamvermoeden) en noemt het mailadres
{
  const m = maakFormulierBericht("Gerard Groenen");
  assert.ok(m.tekst.includes("spamfolder"));
  assert.ok(m.tekst.includes("jos@wordswap.nl"));
  assert.ok(m.tekst.includes("contactformulier"));
}
// Zonder naam blijft de aanhef netjes algemeen
assert.ok(maakOpvolger(null, null).tekst.startsWith("Hallo,"));
assert.equal(maakStap("laatste", "Aad").onderwerp, maakLaatste("Aad").onderwerp);

console.log("lead-opvolging: alle checks geslaagd");
