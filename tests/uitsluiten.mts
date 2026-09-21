import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GROEPEN, UITGESLOTEN_STATUS, uitgesloten } from "../lib/uitsluiten";

/**
 * Advocaten, notarissen, accountants en zorgpraktijken gaan niet mee in de
 * koude bulk. Niet omdat het niet mag, maar omdat reageren voor hen gratis is
 * en omdat ze een geheimhoudingsplicht hebben die je niet per koude mail
 * bespreekt.
 *
 * Uitgesloten is niet weggegooid: ze blijven op het scherm staan met de reden
 * erbij, en met de hand op "nieuw" zetten kan altijd.
 */

// 1. De kantoren die in de lijst stonden worden allemaal gevonden
for (const [bedrijf, website] of [
  ["DrechtRecht Mediation & Advocatuur", "drechtrecht.nl"],
  ["Julicher & Meijer Advocaten", "julicher-meijer.nl"],
  ["Advocatenkantoor Van Wessel", "advocatenkantoorvanwessel.nl"],
  ["Advocatenpraktijk Bos", "advocatenpraktijkbos.nl"],
  ["Lina Advocaten", "lina-advocaten.nl"],
  ["Balkenende Advocatuur & Mediation", "hetkantoorkatwijk.nl"],
  ["Benschop & Figee Notarissen", "notarissengo.nl"],
  ["Houben Advocaat en Mediator", "advocaathouben.nl"],
  ["Jessica Jansen Advocatuur", "jjadvocatuur.nl"],
  ["Advocatenkantoor Apistola B.V.", "apistola.nl"],
  ["Bruggeman Advocatuur", "bruggemanadvocatuur.nl"],
] as const) {
  assert.equal(uitgesloten(bedrijf, website)?.sleutel, "juridisch", `gemist: ${bedrijf}`);
}

// 2. Ook als het woord alleen in het domein zit, met of zonder streepje
assert.ok(uitgesloten("Kantoor Katwijk", "notariskatwijk.nl"), "woord in het domein wordt gemist");
assert.ok(uitgesloten("Van Dijk", "vandijk-advocaten.nl"), "een streepje in het domein blokkeert de treffer");

// 2c. Een mediationbureau is geen advocatenkantoor en mag gewoon gemaild
// worden. Een kantoor dat allebei doet valt wel af op het woord advocatuur.
assert.equal(uitgesloten("MediationBuro Limburg", "mbl-limburg.nl"), null);
assert.equal(uitgesloten("Mediation Noord", "mediationnoord.nl"), null);
assert.ok(uitgesloten("Balkenende Advocatuur & Mediation", "hetkantoorkatwijk.nl"));

// 3. De andere groepen
assert.equal(uitgesloten("Tandartspraktijk De Bron", "debron.nl")?.sleutel, "zorg");
assert.equal(uitgesloten("Jansen Accountants", "jansen.nl")?.sleutel, "financieel");

// 4. Gewone bedrijven blijven gewoon meedoen
for (const [bedrijf, website] of [
  ["Hoveniersbedrijf De Wildt", "hovenierdewildt.nl"],
  ["Administratiekantoor Stuy", "administratiekantoorstuy.nl"],
  ["Bakkerij De Korenbloem", "korenbloem.nl"],
  ["Le Jardin Hoveniers", "lejardinhoveniers.nl"],
  ["Advocatenwijk Interieur", "interieurzaak.nl"],
] as const) {
  assert.equal(uitgesloten(bedrijf, website), null, `onterecht uitgesloten: ${bedrijf}`);
}

// 5. Elke groep legt uit waarom, in mensentaal en zonder lange streepjes
for (const g of GROEPEN) {
  assert.ok(g.reden.length > 60, `te korte reden bij ${g.sleutel}`);
  assert.ok(!g.reden.includes("—"), `lang streepje in de reden bij ${g.sleutel}`);
  assert.ok(g.woorden.length > 0, `groep ${g.sleutel} heeft geen woorden`);
}

// 6. Versturen kan niet, ook niet als de status met de hand blijft staan
const acties = await readFile(new URL("../app/admin/acties.ts", import.meta.url), "utf8");
const fn = acties.slice(acties.indexOf("export async function verstuurOutreach"));
assert.ok(
  fn.slice(0, fn.indexOf("api.resend.com")).includes("UITGESLOTEN_STATUS"),
  "een uitgesloten prospect kan alsnog gemaild worden"
);

// 7. Beide ingangen zetten hem meteen apart
for (const bestand of ["../app/api/scan-prospects/route.ts", "../app/admin/acties.ts"]) {
  const inhoud = await readFile(new URL(bestand, import.meta.url), "utf8");
  assert.ok(inhoud.includes("uitgesloten("), `${bestand} controleert de beroepsgroep niet`);
}

// 8. En de scan zet er geen conceptmail voor klaar
const scan = await readFile(new URL("../app/api/scan-prospects/route.ts", import.meta.url), "utf8");
assert.ok(
  scan.includes("magMailen && !groep && g.onderwerp"),
  "er wordt nog een conceptmail klaargezet voor een uitgesloten bedrijf"
);

// 9. De status die we gebruiken staat op één plek
assert.equal(UITGESLOTEN_STATUS, "uitgesloten");

console.log("uitsluiten: ok");
