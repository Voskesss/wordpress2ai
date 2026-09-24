import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * De bouwintake in de migratie-skill.
 *
 * Waarom hier een test op staat: welke bouwstenen een site krijgt werd per
 * klant in het moment besloten. Dat werkt zolang het vers in je hoofd zit.
 * Deze stap legt het vast, en een stap die ongemerkt uit de skill verdwijnt is
 * precies het soort stille verlies waar we vandaag al een paar keer op zijn
 * gestuit.
 */

const skill = await readFile(
  new URL("../.claude/skills/migreer-klant/SKILL.md", import.meta.url),
  "utf8"
);

// 1. De stap bestaat en staat VOOR het oogsten. Andersom heeft hij geen zin:
//    dan is de keuze al gemaakt voordat de vragen gesteld zijn.
const intake = skill.indexOf("## Stap 0B — Bouwintake");
const oogsten = skill.indexOf("## Stap 1B — Voorwerk vanaf de LIVE site");
assert.ok(intake > -1, "de bouwintake ontbreekt in de skill");
assert.ok(oogsten > -1, "de oogst-stap is hernoemd; controleer de volgorde met de hand");
assert.ok(intake < oogsten, "de bouwintake staat ná het oogsten in plaats van ervoor");

// 2. Het leidende principe. Zonder dit wordt het een vragenlijst die de klant
//    het gevoel geeft dat we niet gekeken hebben.
assert.ok(
  /vraag NOOIT wat je kunt zien/i.test(skill),
  "het principe 'eerst kijken, dan vragen' staat er niet in"
);

// 3. De zeven vragen. Elk raakt een beslissing die je niet uit een scan haalt.
for (const [kern, waarvoor] of [
  ["Wat voor bedrijf is dit", "bepaalt de modules"],
  ["Wat gaat de klant zelf doen", "bepaalt of je in modules investeert"],
  ["Wat moet er juist NIET mee", "anders zet je hun rommel over"],
  ["Wat komt er binnenkort bij", "bepaalt of iets extern moet"],
  ["Komen er gevoelige gegevens", "bepaalt de bewaarstand"],
  ["hoe scherp moet het", "bij beeldmakers dé vraag"],
  ["het vervelendst aan zijn site", "hier hoor je wat hij echt wil"],
] as [string, string][]) {
  assert.ok(skill.includes(kern), `vraag ontbreekt (${waarvoor}): ${kern}`);
}

// 4. Niet weten moet zichtbaar blijven. Een stille aanname is duurder dan een
//    open vraag; dat is de les van vandaag.
assert.ok(
  skill.includes('"niet gevraagd"'),
  "er staat niet dat een onbeantwoorde vraag letterlijk genoteerd moet worden"
);

// 5. Het resultaat wordt vastgelegd, anders zat de keuze alsnog alleen in het hoofd.
assert.ok(skill.includes("bouwintake.md"), "het resultaat wordt nergens weggeschreven");
assert.ok(/modulelijst/i.test(skill), "er komt geen modulelijst uit de intake");

// 6. Twee lessen van vandaag die geld gekost hebben, staan er als waarschuwing in.
assert.ok(
  /looptijd/i.test(skill) && /vernieuwt zichzelf/i.test(skill),
  "de les over certificaten met korte looptijd ontbreekt"
);
assert.ok(
  /ALTIJD mobiel/i.test(skill),
  "de les dat je mobiel moet meten (desktop 98, mobiel 53) ontbreekt"
);

console.log("bouwintake: ok");
