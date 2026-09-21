import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isDubbel, maakRegister, onthoud, schoonDomein, schoonNummer } from "../lib/dubbel-check";

/**
 * De scan draait buiten WordSwap (Cowork) en levert dagelijks bedrijven aan.
 * Die landen in de OUTREACH, niet bij de leads: outreach is koud en massaal,
 * een lead is iemand die gereageerd heeft. Zou de scan meteen leads maken, dan
 * verzuipen de mensen met wie echt een gesprek loopt.
 *
 * Het gevaarlijkste dat hier kan gebeuren is iemand twee keer benaderen, of
 * een koude mail sturen naar iemand met wie al iets loopt. Daar gaat deze
 * test over.
 */

// 1. Schrijfwijzen van een domein vallen samen
for (const v of ["https://www.Bedrijf.NL/contact", "bedrijf.nl", "WWW.BEDRIJF.nl/", "http://bedrijf.nl?x=1"])
  assert.equal(schoonDomein(v), "bedrijf.nl", `domein niet genormaliseerd: ${v}`);

// 2. En van een telefoonnummer. Dit is precies hoe Cowork ze aanlevert.
for (const v of ["06 45 68 65 33", "+31 6 45686533", "0645686533", "0031645686533", "06-45686533"])
  assert.equal(schoonNummer(v), "645686533", `nummer niet genormaliseerd: ${v}`);
// Te kort telt niet mee, anders matcht half Nederland op elkaar
assert.equal(schoonNummer("1234"), "");
assert.equal(schoonNummer(null), "");

// 3. Herkennen op alle drie de sleutels, met de reden erbij
const register = maakRegister([
  { website: "https://www.bestaat.nl/", email: "INFO@bestaat.nl", telefoon: "06 12 34 56 78" },
]);
assert.deepEqual(isDubbel({ website: "bestaat.nl" }, register), { dubbel: true, reden: "website" });
assert.deepEqual(isDubbel({ email: "info@bestaat.nl" }, register), { dubbel: true, reden: "e-mailadres" });
assert.deepEqual(isDubbel({ telefoon: "+31612345678" }, register), { dubbel: true, reden: "telefoonnummer" });
assert.deepEqual(isDubbel({ website: "iemandanders.nl" }, register), { dubbel: false });

// 4. Hetzelfde bedrijf onder een ander mailadres, maar met hetzelfde nummer:
//    dat is waarom één sleutel niet genoeg is
assert.ok(isDubbel({ website: "anderedomein.nl", email: "contact@anders.nl", telefoon: "06-12345678" }, register).dubbel);

// 5. Binnen één ronde niet twee keer dezelfde: de eerste telt meteen mee
const leeg = maakRegister([]);
const kandidaat = { website: "nieuw.nl", email: "info@nieuw.nl", telefoon: "0612300000" };
assert.equal(isDubbel(kandidaat, leeg).dubbel, false);
onthoud(kandidaat, leeg);
assert.equal(isDubbel({ website: "www.nieuw.nl" }, leeg).dubbel, true, "tweede regel in dezelfde ronde glipt erdoor");

// 6. De ingang landt in de outreach, niet bij de leads
const route = await readFile(new URL("../app/api/scan-prospects/route.ts", import.meta.url), "utf8");
assert.match(route, /db[\s\S]{0,20}\.insert\(prospects\)/, "de scan schrijft niet in de outreach");
assert.ok(!/\.insert\(leads\)/.test(route), "de scan maakt rechtstreeks leads aan");
assert.match(route, /SCAN_TOKEN/, "de ingang staat open zonder sleutel");
assert.match(route, /status: 401/, "geen weigering zonder geldige sleutel");
// Kijkt over beide lijsten
assert.match(route, /from\(leads\)/, "de dubbelcheck kijkt niet naar de leads");
assert.match(route, /from\(prospects\)/, "de dubbelcheck kijkt niet naar de outreach");
// Zonder mailadres: bellen in plaats van mailen
assert.match(route, /niet_mailen/, "bedrijven zonder mailadres komen in de mailstroom terecht");

// 7. Reageren maakt er een lead van, met de reactie in de tijdlijn
const promotie = await readFile(new URL("../lib/prospect-promotie.ts", import.meta.url), "utf8");
assert.match(promotie, /\.insert\(leads\)/, "een reactie levert geen lead op");
assert.match(promotie, /\.insert\(leadPost\)/, "de reactie komt niet in de tijdlijn");
assert.match(promotie, /richting === "in"/, "eigen verzonden mail zou als reactie tellen");
assert.match(promotie, /leadId: nieuweLead\.id/, "de prospect wordt niet aan zijn lead gekoppeld");

// 8. En het draait mee in de ronde die er al is
const ronde = await readFile(new URL("../lib/leads-bijwerken.ts", import.meta.url), "utf8");
assert.match(ronde, /promoveerReagerendeProspects/, "promotie draait niet mee in de leadronde");


// 9. Hun veldnamen worden geaccepteerd zonder dat er iets omgebouwd hoeft.
//    Dit is letterlijk het voorbeeld dat de scan-kant aanleverde.
{
  const route = await readFile(new URL("../app/api/scan-prospects/route.ts", import.meta.url), "utf8");
  for (const veld of ["tel", "contact", "aanleiding", "onderwerp", "mailtekst", "kans"])
    assert.ok(new RegExp(`\\b${veld}\\??:`).test(route), `veld "${veld}" wordt niet geaccepteerd`);
  // en onze eigen namen blijven werken
  for (const veld of ["telefoon", "contactpersoon", "bevindingen"])
    assert.ok(new RegExp(`\\b${veld}\\??:`).test(route), `eigen veld "${veld}" is verdwenen`);
  // aanleiding mag een lijst of één regel zijn
  assert.match(route, /alsLijst/, "een losse regel als aanleiding valt om");
  // de meegeleverde mail wordt klaargezet
  assert.match(route, /insert\(prospectMails\)/, "de concept-mail wordt niet bewaard");
  assert.match(route, /nummer: 1/, "de concept-mail staat niet als eerste mail klaar");
}

console.log("outreach-scan: ok");
