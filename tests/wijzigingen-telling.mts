/**
 * De wijzigingen-teller: elke beurt die echt iets verandert telt, óók binnen
 * een openstaand concept. Aanleiding 19-09: een dag testen op Groene Golf
 * stond op "1 van 30", omdat alleen het openen van een nieuw concept telde —
 * een nooit gepubliceerd concept was zo een onbeperkte gratis maand.
 * Bronchecks, zelfde stijl als tests/herstel-rem.mts.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const route = await readFile("app/api/chat/route.ts", "utf8");

// 1. De oude vrijstelling voor vervolg-beurten in een open concept is weg.
assert.ok(
  !/if \(openConcept \|\| site\.isDemo\) \{\s*\/\/ vervolg/.test(route),
  "vervolg-beurten in een open concept tellen nog steeds niet mee",
);

// 2. De vrijstellingen die er wél horen te zijn: demo en "Overal doorvoeren".
const telBlok = route.slice(route.indexOf("geen telling") - 400, route.indexOf("geen telling") + 100);
assert.ok(/site\.isDemo \|\| bericht\.trim\(\) === "Overal doorvoeren"/.test(telBlok), "demo- en doorvoer-vrijstelling ontbreken");

// 3. En de telling zelf staat er nog (verhogen of eerste rij aanmaken).
assert.ok(/wijzigingen: sql`\$\{usage\.wijzigingen\} \+ 1`/.test(route), "verhogen van de teller ontbreekt");
assert.ok(/insert\(usage\)/.test(route), "eerste usage-rij van de maand ontbreekt");

console.log("wijzigingen-telling: elke echte wijziging telt, demo en doorvoeren niet");
