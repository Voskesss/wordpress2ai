/**
 * De tijdgrens van de chat-agent is een echte kap (les EVC, 26-09).
 *
 * maxDuurMs werd alleen tussen beurten gecontroleerd: één hangende aanroep of
 * traag gereedschap liep er dwars doorheen. Bij EVC Autotechniek bleef de chat
 * daardoor minutenlang op "Ik loop de vaste afspraken na..." staan, hield de
 * zombiebeurt het werkslot vast en kon Jos geen versie meer terugzetten. De
 * kap koppelt maxDuurMs nu aan een AbortSignal.timeout, zodat ook een
 * hangende aanroep na de grens wordt afgebroken.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const agent = await readFile(new URL("../lib/chat-agent.ts", import.meta.url), "utf8");

// 1. De kap bestaat en hangt aan maxDuurMs
assert.ok(
  /AbortSignal\.any\(\[\.\.\.\(opties\.signal \? \[opties\.signal\] : \[\]\), AbortSignal\.timeout\(opties\.maxDuurMs \+ 10_000\)\]\)/.test(agent),
  "de harde tijdkap (AbortSignal.timeout aan maxDuurMs) is verdwenen uit de chat-agent",
);

// 2. Het bestaande signaal van de aanroeper blijft ook zonder maxDuurMs werken
assert.ok(agent.includes(": opties.signal },") || agent.includes(": opties.signal }"), "zonder maxDuurMs moet het gewone signaal doorgegeven blijven");

// 3. De zachte controle tussen beurten blijft bestaan (kap is vangnet, geen vervanging)
assert.ok(
  /opties\.maxDuurMs && Date\.now\(\) - startMs >= opties\.maxDuurMs/.test(agent),
  "de tussentijdse maxDuurMs-controle is weggehaald",
);

console.log("agent-tijdkap: ok");
