/**
 * Een tweede bestand mag nooit stil verdwijnen. Kies je audio terwijl een
 * video nog verwerkt wordt (of twee video's achter elkaar), dan werd het
 * tweede bestand genegeerd zonder één woord uitleg (20-09). Nu wacht het
 * netjes op zijn beurt, met een melding.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const chat = await readFile("app/portal/Chat.tsx", "utf8");

// 1. Geen stille afwijzingen meer
for (const [naam, patroon] of [
  ["video", /async function videoUploaden[\s\S]{0,200}?if \(videoBezig\) return;/],
  ["audio", /async function audioUploaden[\s\S]{0,200}?if \(audioBezig\) return;/],
  ["document", /async function documentUploaden[\s\S]{0,200}?if \(docBezig\) return;/],
] as const) {
  assert.ok(!patroon.test(chat), `${naam}-upload laat een tweede bestand nog stil vallen`);
}

// 2. Er wordt gewacht, met uitleg
assert.ok(/async function wachtOpVrij/.test(chat), "er is geen wachtrij voor uploads");
assert.ok(/deze pak ik er daarna meteen bij/.test(chat), "de eigenaar hoort niet dat zijn bestand in de rij staat");
for (const soort of ["videoBezigRef", "audioBezigRef", "docBezigRef"])
  assert.ok(chat.includes(`wachtOpVrij(${soort}`), `${soort} gebruikt de wachtrij niet`);

// 3. De paperclip blijft bruikbaar terwijl de chat werkt: een upload gaat
//    naar de banken en heeft niets met de lopende beurt te maken.
const knop = chat.slice(chat.indexOf("setBijlageMenu((v) => !v)") - 200, chat.indexOf("setBijlageMenu((v) => !v)") + 300);
assert.ok(!/disabled=\{bezig\}/.test(knop), "de bijlageknop is nog uitgeschakeld tijdens een beurt");

console.log("uploads-parallel: tweede bestand wacht netjes, paperclip blijft bruikbaar");
