/**
 * Overleggen zoals Jos het bedoelt (26-09): eerst zeggen wat je gaat doen,
 * dan doen; en de wachtmelding belooft niets dat niet waargemaakt wordt.
 * De oude melding zei bij een lange beurt eeuwig "over 1 minuten rond ik af"
 * terwijl de nabewerking daar dwars doorheen liep.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const route = await readFile(new URL("../app/api/chat/route.ts", import.meta.url), "utf8");
const chat = await readFile(new URL("../app/portal/Chat.tsx", import.meta.url), "utf8");

// 1. Plan-zin: eerst zeggen wat je gaat doen, vóór de eerste werkstap
assert.ok(/ZEG EERST WAT JE GAAT DOEN/.test(route), "de plan-zin-regel is verdwenen uit de chatprompt");
assert.ok(/vóór je eerste werkstap/.test(route), "de plan-zin hoort vóór de eerste werkstap te komen");

// 2. De hoofd-agent heeft de harde tijdkap (niet alleen de nacontroles)
assert.ok(
  /maxDuurMs: Math\.max\(60_000, \(maxDuurS - 80\) \* 1000\)/.test(route),
  "de hoofd-agent mist de harde tijdkap (maxDuurMs)",
);

// 3. Wachtmelding: nooit meer "1 minuten", en na de bouwgrens een eerlijke afrond-tekst
assert.ok(!/minuten rond ik af/.test(chat), "de oude belofte-tekst (x minuten rond ik af) staat er weer in");
assert.ok(/een minuut/.test(chat) && /aan het afronden/.test(chat), "de eerlijke afrond-tekst na de bouwgrens ontbreekt");
assert.ok(/wachtSec < PORTAAL_BEURT_S/.test(chat), "de belofte-tekst stopt niet meer bij de bouwgrens");

// 4. De stopknop zegt "Stop" met een woord, niet alleen een rood vierkantje
assert.ok(/Stop\n\s*<\/>|<\/svg>\s*Stop/.test(chat), "het woord Stop staat niet meer op de stopknop");

console.log("plan-en-wachttekst: ok");
