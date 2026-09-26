/**
 * Wens Jos 26-09: in de foto-, video- en audiobank stond de oudste bovenaan.
 * Nu is nieuwste-eerst de standaard (R2 kent de uploaddatum) en zit er in
 * elke bank een volgorde-keuze voor wie liever op naam zoekt.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

// 1. R2 geeft de uploaddatum mee en de media-lijsten sorteren erop
const r2 = await readFile("lib/r2.ts", "utf8");
assert.ok(/uploaded: o\.uploaded \?\? ""/.test(r2), "de R2-lijst geeft de uploaddatum niet mee");
const media = await readFile("lib/media.ts", "utf8");
assert.equal(
  (media.match(/\.sort\(\(a, b\) => b\.uploaded\.localeCompare\(a\.uploaded\)\)/g) ?? []).length,
  2,
  "audio en video horen allebei op uploaddatum te sorteren, nieuwste eerst",
);

// 2. De videobank-route zet media-video's (gedateerd, nieuwste eerst) boven
// de oudere video's die nog in de site zelf staan, zonder alfabetische
// hersortering die de datumvolgorde weer sloopt
const vroute = await readFile("app/api/videobank/route.ts", "utf8");
assert.ok(/Number\(a\.bron === "site"\) - Number\(b\.bron === "site"\)/.test(vroute), "de videobank-route bewaart de nieuwste-eerst-volgorde niet");
assert.ok(!/a\.pad\.localeCompare\(b\.pad\)/.test(vroute), "de alfabetische hersortering is terug (die zette de oudste bovenaan)");

// 3. Elke bank heeft de volgorde-keuze, met nieuwste eerst als standaard
for (const [pad, wat] of [
  ["app/portal/Fotobank.tsx", "fotobank"],
  ["app/portal/VideoBank.tsx", "videobank"],
  ["app/portal/AudioBank.tsx", "audiobank"],
] as const) {
  const bron = await readFile(pad, "utf8");
  assert.ok(/const \[opNaam, setOpNaam\] = useState\(false\)/.test(bron), `nieuwste-eerst is niet de standaard in de ${wat}`);
  assert.ok(/Nieuwste eerst/.test(bron) && /Op naam \(A-Z\)/.test(bron), `de volgorde-keuze ontbreekt in de ${wat}`);
  assert.ok(/localeCompare/.test(bron), `op naam sorteren doet niets in de ${wat}`);
}

console.log("Banken-volgorde: nieuwste standaard bovenaan, op naam als keuze");
