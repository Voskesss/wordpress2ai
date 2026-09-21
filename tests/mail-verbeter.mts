import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * De Verbeter-knop leek willekeurig te haperen. Hij deed dat niet: de route
 * was de enige AI-route in het project zonder tijdslimiet en draaide dus op
 * de standaardtijd van het platform. Gemeten: de aanwijzing "korter" was in
 * 4,5 seconde klaar en werkte, een aanwijzing van een paar zinnen duurde
 * 11,5 seconde en werd afgekapt.
 *
 * Het afkappen gaf geen JSON maar een foutpagina terug, en de melding op het
 * scherm was "probeer het nog eens". Daardoor leek het aan de tekst te liggen.
 */

const route = await readFile(new URL("../app/api/admin/mail-verbeter/route.ts", import.meta.url), "utf8");
const vak = await readFile(new URL("../app/admin/outreach/MailBewerker.tsx", import.meta.url), "utf8");

// 1. De route krijgt de tijd die het model nodig heeft
const m = route.match(/export const maxDuration = (\d+)/);
assert.ok(m, "de route heeft geen tijdslimiet en wordt door het platform afgekapt");
assert.ok(Number(m[1]) >= 30, `tijdslimiet van ${m[1]}s is te krap voor een herschrijving`);

// 2. Elke andere route die het model aanroept heeft er ook een
for (const bestand of ["../app/api/admin/intake-check/route.ts", "../app/api/admin/prospect-scan/route.ts"]) {
  const inhoud = await readFile(new URL(bestand, import.meta.url), "utf8");
  assert.match(inhoud, /export const maxDuration/, `${bestand} mist een tijdslimiet`);
}

// 3. Een storing bij het model geeft een leesbaar antwoord, geen kale fout
assert.ok(route.includes("} catch (e) {"), "een storing bij het model wordt niet opgevangen");
assert.ok(route.includes('status: 502'), "een storing geeft geen nette foutcode terug");

// 4. Het scherm zegt wat er is in plaats van "probeer het nog eens"
assert.ok(vak.includes("content-type"), "het scherm controleert niet of er wel JSON terugkomt");
assert.ok(vak.includes("duurde te lang"), "een afkapping wordt niet als zodanig gemeld");
assert.ok(
  !/Herschrijven lukte niet — probeer/.test(vak),
  "de oude, misleidende melding staat er nog"
);

// 5. Jos' eigen regel: geen lange streepjes op zijn scherm
assert.ok(!vak.includes("—"), "lang streepje in het bewerkvak");

// 6. De prompt zelf is niet per ongeluk ingesprongen: wat in een template
//    literal staat komt letterlijk in de instructie aan het model terecht.
assert.ok(
  route.includes("\nHuidige onderwerpregel: ${onderwerp}"),
  "de prompttekst is ingesprongen geraakt en gaat zo naar het model"
);

console.log("mail-verbeter: ok");
