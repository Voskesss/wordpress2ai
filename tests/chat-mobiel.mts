import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * Op een telefoon stond de chatkolom op `justify-end` samen met
 * `overflow-y-auto`. Die combinatie is stuk: de browser meldt dan dat er
 * niets te scrollen valt (scrollHeight gelijk aan clientHeight) terwijl de
 * bovenkant van de inhoud buiten beeld hangt. Gemeten in een proefopstelling:
 * het bovenste blok zat 150 pixels boven de rand en was niet te bereiken.
 * Met `mt-auto` op het eerste blok staat alles nog steeds onderaan, klopt de
 * scrollhoogte wel en is de bovenkant gewoon bereikbaar.
 *
 * Daarnaast ontbrak elke rem op horizontaal schuiven, waardoor één element
 * dat een paar pixels te breed is het hele gesprek opzij liet schuiven.
 *
 * De computerweergave is bewust niet aangeraakt.
 */

const chat = await readFile(new URL("../app/portal/Chat.tsx", import.meta.url), "utf8");

const start = chat.indexOf(": mobielChat");
const mobiel = chat.slice(start, chat.indexOf(": isMobiel", start));
assert.ok(mobiel.length > 50, "de mobiele tak van de chatkolom is niet meer te vinden");

// De klassenregel zelf, niet het commentaar eromheen (daar staat het woord
// justify-end nog in als uitleg van wat er mis was).
const klassen = mobiel.match(/"flex min-h-0[^"]*"/)?.[0];
assert.ok(klassen, "de klassenregel van de mobiele chatkolom is niet te vinden");

// 1. De kapotte combinatie is weg op mobiel
assert.ok(!klassen.includes("justify-end"), "de mobiele chatkolom staat weer op justify-end en klemt dan de bovenkant");

// 2. En er is een rem op opzij schuiven
assert.ok(klassen.includes("overflow-x-hidden"), "zonder rem laat één te breed element het hele gesprek opzij schuiven");

// 3. Alles staat nog steeds onderaan, via het eerste blok
assert.ok(
  chat.includes('className={mobielChat ? "mt-auto" : "contents"}'),
  "zonder mt-auto op het eerste blok plakt het gesprek niet meer aan de onderkant",
);

// 4. De computerweergave houdt wat hij had
const split = chat.slice(chat.lastIndexOf("splitModus", start), start);
assert.ok(/justify-end/.test(split), "de computerweergave is meeveranderd, terwijl die niet geraakt mocht worden");

console.log("chat-mobiel: ok");
