import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { STANDEN, UITLEG, klantZietBerichten, magBewaren, magMeelezen, stand } from "../lib/formulier-privacy";

/**
 * Een fysiopraktijk, een advocatenkantoor of een boekhouder krijgt altijd
 * dezelfde vraag: waar staan de gegevens van mijn klanten en wie kan erbij.
 * Zolang het antwoord "in onze database, en WordSwap leest mee" is, stopt dat
 * gesprek. Nu kan het per site strenger.
 *
 * De valkuil: de spamrem telt de rijen in formulier_inzendingen. Wordt er bij
 * "niets bewaren" helemaal niets weggeschreven, dan telt de rem niets meer en
 * is het formulier een open doorgeefluik voor mail vanaf ons adres. Daarom
 * blijft er een leeg regeltje staan: dát er een bericht was, niet wat erin
 * stond.
 */

// 1. De drie standen doen wat ze beloven
assert.deepEqual([...STANDEN], ["normaal", "geen-meelezen", "niet-bewaren"]);
assert.ok(magBewaren("normaal") && magMeelezen("normaal") && klantZietBerichten("normaal"));
assert.ok(magBewaren("geen-meelezen"), "bij geen-meelezen hoort het vangnet te blijven");
assert.ok(!magMeelezen("geen-meelezen"), "bij geen-meelezen mag WordSwap niet meekijken");
assert.ok(klantZietBerichten("geen-meelezen"), "de klant hoort zijn eigen berichten te blijven zien");
assert.ok(!magBewaren("niet-bewaren") && !magMeelezen("niet-bewaren") && !klantZietBerichten("niet-bewaren"));

// 2. Onzin en leeg vallen terug op normaal, nooit op iets strengers of losser
for (const rommel of [null, undefined, "", "uit", "geen-meelezen ", "NIET-BEWAREN"]) {
  assert.equal(stand(rommel as string), "normaal", `${JSON.stringify(rommel)} viel niet terug op normaal`);
}

// 3. Elke stand legt uit wat je ermee opgeeft, in mensentaal
for (const s of STANDEN) {
  assert.ok(UITLEG[s].label.length > 3, `${s} mist een label`);
  assert.ok(UITLEG[s].kort.length > 40, `${s} mist uitleg`);
  assert.ok(UITLEG[s].gevolg.length > 10, `${s} zegt niet wat je ermee opgeeft`);
  assert.ok(!UITLEG[s].kort.includes("—") && !UITLEG[s].gevolg.includes("—"), `lang streepje bij ${s}`);
}
assert.ok(/vangnet/i.test(UITLEG["niet-bewaren"].gevolg), "het verlies van het vangnet wordt niet genoemd");

// 4. Het eindpunt schrijft nog steeds een regel weg, ook als het niets bewaart
const route = await readFile(new URL("../app/api/formulier/route.ts", import.meta.url), "utf8");
assert.ok(route.includes("magBewaren(site?.formulierPrivacy)"), "het eindpunt kijkt niet naar de stand");
assert.ok(route.includes("velden: bewaren ? velden : {}"), "de inhoud wordt ook bij niet-bewaren weggeschreven");
assert.ok(route.includes("inhoudBewaard: bewaren"), "er wordt niet vastgelegd of de inhoud bewaard is");
assert.ok(
  route.includes("if (bewaren && bijlagen.length && blobToken)"),
  "bijlagen worden ook bij niet-bewaren nog opgeslagen"
);
// De insert mag nooit overgeslagen worden: zonder rij telt de spamrem niet meer
assert.ok(
  !/if \(!bewaren\) return|bewaren &&\s*\n?\s*await db\s*\n?\s*\.insert\(formulierInzendingen\)/.test(route),
  "de telregel voor de spamrem wordt overgeslagen, waarmee het formulier een open doorgeefluik wordt"
);

// 5. Mislukt de mail terwijl er niets bewaard wordt, dan hoort de bezoeker dat
assert.ok(route.includes("if (!bewaren && !weg)"), "een mislukte bezorging blijft stil terwijl het bericht weg is");
assert.match(route, /status: 502/, "de bezoeker krijgt geen foutmelding als zijn bericht verloren ging");

// 6. Daarvoor moet de mailfunctie wél zeggen of het gelukt is
const mail = await readFile(new URL("../lib/mail.ts", import.meta.url), "utf8");
const fn = mail.slice(mail.indexOf("export async function verstuurSiteMail"));
const eind = fn.indexOf("\nasync function");
assert.ok(fn.slice(0, eind).includes("Promise<boolean>"), "verstuurSiteMail zegt niet of de mail weg is");
assert.ok(fn.slice(0, eind).includes("if (!res?.ok)"), "een foutantwoord van Resend telt nog als geslaagd");

// 7. In het portaal wordt afgeschermd voor de beheerder, niet voor de klant
const portaal = await readFile(new URL("../app/portal/SiteExtra.tsx", import.meta.url), "utf8");
assert.ok(portaal.includes("beheerder && !magMeelezen(privacy)"), "de afscherming kijkt niet wie er kijkt");
assert.ok(
  portaal.includes("const alle = afgeschermd\n    ? []"),
  "de berichten worden nog opgehaald terwijl ze afgeschermd zijn"
);

console.log("formulier-privacy: ok");
