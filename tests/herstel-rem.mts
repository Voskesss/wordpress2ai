/**
 * Bewaakt de rem op reparatiebeurten (mobielcontrole ×2 en afspraken-poort):
 * elke automatische herstelbeurt moet een stappen- én tijdslimiet meekrijgen,
 * anders kan zo'n "korte" beurt minutenlang doorploeteren binnen zijn budget
 * (gezien op dev, 19-09: 314 s op "goed staat op een telefoon").
 * Bronchecks, zelfde stijl als tests/vangnet-basis.mts.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const route = await readFile("app/api/chat/route.ts", "utf8");
const agent = await readFile("lib/chat-agent.ts", "utf8");

// 1. Elke automatische herstelbeurt (herkenbaar aan budgetUsd: 0.15) heeft
//    maxBeurten én maxDuurMs. We knippen de route op draaiChatAgent-aanroepen
//    en bekijken alleen het optiesblok tot de sluitende "});".
const aanroepen = route.split("draaiChatAgent(").slice(1).map((s) => s.slice(0, s.indexOf("});")));
const herstelAanroepen = aanroepen.filter((blok) => blok.includes("budgetUsd: 0.15"));
assert.ok(herstelAanroepen.length >= 3, `verwacht minstens 3 herstelbeurten, zag ${herstelAanroepen.length}`);
for (const blok of herstelAanroepen) {
  assert.ok(blok.includes("maxBeurten:"), `herstelbeurt zonder maxBeurten:\n${blok.slice(0, 200)}`);
  assert.ok(blok.includes("maxDuurMs:"), `herstelbeurt zonder maxDuurMs:\n${blok.slice(0, 200)}`);
}

// 2. De agent gebruikt die limieten ook echt.
assert.ok(
  /max_iterations:\s*Math\.min\(opties\.maxBeurten/.test(agent),
  "chat-agent geeft maxBeurten niet door aan max_iterations",
);
assert.ok(
  /opties\.maxDuurMs && Date\.now\(\) - startMs >= opties\.maxDuurMs/.test(agent),
  "chat-agent kent geen wandkloklimiet (maxDuurMs) tussen de stappen",
);

// 3. Beide mobielcontroles wachten op tijdsruimte, net als de afspraken-poort.
assert.ok(
  (route.match(/restVoorHerstelS\(\) >= 120/g) ?? []).length >= 2,
  "mobielcontroles missen de tijdsruimte-bewaking (restVoorHerstelS)",
);

console.log("herstel-rem: alle limieten aanwezig");
