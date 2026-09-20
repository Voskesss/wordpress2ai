/**
 * Twee dingen uit Jos' test van 20-09:
 * 1. De banken toonden niet het echte formaat: elke video/foto werd in een
 *    liggend vakje gesneden (object-cover), dus je zag niet of iets staand
 *    was — en de AI zette een staande video vervolgens ook nog stilzwijgend
 *    afgesneden in een liggend kader.
 * 2. "Op een pagina zetten" vanuit een bank overschreef de tekst die je al
 *    getypt had ("wil je deze video daar en daar plaatsen" → weg).
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

// 1a. Videobank: echte verhouding zichtbaar + afmetingen-label
const vb = await readFile("app/portal/VideoBank.tsx", "utf8");
assert.ok(!/className="[^"]*object-cover/.test(vb), "de videobank snijdt video's nog af met object-cover");
assert.ok(/object-contain/.test(vb), "de videobank toont niet de echte verhouding (object-contain ontbreekt)");
assert.ok(/onLoadedMetadata/.test(vb), "de videobank leest de echte afmetingen niet uit");
assert.ok(/staand/.test(vb) && /liggend/.test(vb), "het staand/liggend-label ontbreekt in de videobank");

// 1b. Fotobank: zelfde behandeling
const fb = await readFile("app/portal/Fotobank.tsx", "utf8");
assert.ok(!/className="[^"]*object-cover/.test(fb), "de fotobank snijdt foto's nog af met object-cover");
assert.ok(/naturalWidth/.test(fb), "de fotobank leest de echte afmetingen niet uit");
assert.ok(/staand/.test(fb) && /liggend/.test(fb), "het staand/liggend-label ontbreekt in de fotobank");

// 1c. De AI kent de verhouding vóór het plaatsen, houdt het stramien van de
// site aan (consistentie gaat voor, tenzij de eigenaar anders vraagt) en
// zegt het eerlijk als er wordt bijgesneden — bank én meegestuurd.
const route = await readFile("app/api/chat/route.ts", "utf8");
assert.ok(/LET OP DE VERHOUDING/.test(route), "de verhoudingsregel in de VIDEOBANK-context ontbreekt");
assert.equal(
  (route.match(/consistentie gaat voor/gi) ?? []).length,
  2,
  "de consistentie-regel (kaders aanhouden tenzij anders gevraagd) ontbreekt bij de videobank- of meegestuurd-context",
);
assert.equal(
  (route.match(/niet doen alsof alles past/gi) ?? []).length,
  2,
  "de eerlijkheidsregel (zeggen dát er wordt bijgesneden) ontbreekt bij de videobank- of meegestuurd-context",
);

// 2. Banken bewaren getypte tekst: setInvoer met functievorm die v hergebruikt
const chat = await readFile("app/portal/Chat.tsx", "utf8");
for (const [bank, start] of [
  ["documentenbank", "Zet een downloadlink naar"],
  ["videobank", "Zet de video ${pad} op"],
  ["audiobank", "Zet de audio ${pad} op"],
] as const) {
  const i = chat.indexOf(start);
  assert.ok(i > 0, `de ${bank}-invoerregel is niet gevonden`);
  const blok = chat.slice(Math.max(0, i - 300), i);
  assert.ok(
    /setInvoer\(\(v\) =>/.test(blok) && blok.includes("v.trim()"),
    `de ${bank} overschrijft nog getypte tekst in plaats van het pad erachter te zetten`,
  );
}

console.log("banken-weergave: echte formaten zichtbaar, verhoudingsregel voor de AI, en getypte tekst blijft staan");
