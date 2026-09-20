/**
 * De klant ziet wat hem écht begrenst: het aandeel van zijn maandruimte,
 * niet het aantal wijzigingen. Op 20-09 werd een testsite geblokkeerd bij
 * "8 van 30 wijzigingen" — de dollarrem zat vol terwijl de teller iets heel
 * anders beloofde. Plus: afgebroken beurten mogen geen ruimte opsouperen.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const verbruik = await readFile("lib/verbruik.ts", "utf8");
const guards = await readFile("lib/operation-guards.ts", "utf8");
const route = await readFile("app/api/chat/route.ts", "utf8");
const chat = await readFile("app/portal/Chat.tsx", "utf8");

// 1. Het verbruik komt uit het kostenlog, gedeeld door het maandbudget —
//    dezelfde twee getallen waarop de rem werkt.
assert.ok(/kostenMicroUsd/.test(verbruik) && /maandbudgetVoor/.test(verbruik), "verbruik wordt niet uit kosten en budget berekend");
assert.ok(/Math\.min\(100, Math\.round\(\(gebruiktUsd \/ budgetUsd\) \* 100\)\)/.test(verbruik), "percentage wordt niet netjes afgekapt");
assert.ok(/site\.isDemo\) return null/.test(verbruik), "de demo hoort geen budgetbalk te krijgen");

// 2. Afgebroken beurten laten geen spookreserveringen achter
assert.ok(/export async function herijkReservering\(/.test(guards), "herijking van reserveringen ontbreekt");
assert.ok(/scope !== `site:\$\{siteId\}`\) return/.test(guards), "herijking hoort de demo over te slaan (gedeelde site)");
assert.ok(
  route.indexOf("herijkReservering(scope, site.id, maand)") < route.indexOf("reserveAiBudget(scope"),
  "er wordt gereserveerd vóórdat de spoken zijn opgeruimd",
);

// 3. Het portaal toont een balk met percentage, geen bedragen
assert.ok(/van je maandruimte/.test(chat), "de balk legt niet uit wat het percentage betekent");
assert.ok(!/gebruiktUsd|budgetUsd|\$\{verbruikStand\.gebruikt/.test(chat), "er lekken bedragen naar de klant");
assert.ok(/verbruikStand\.procent >= 80/.test(chat), "de balk waarschuwt niet als de ruimte bijna op is");

// 4. De agent splitst grote klussen zelf
assert.ok(/GROTE KLUS\? KIES ZELF DE SLIMSTE VOLGORDE/.test(route), "de agent krijgt geen opdracht om te splitsen");
assert.ok(/vraag niet eerst of je mag splitsen/.test(route), "de agent zou om toestemming kunnen gaan vragen");

console.log("budgetbalk: percentage uit kosten/budget, geen spookreserveringen, geen bedragen, agent splitst zelf");
