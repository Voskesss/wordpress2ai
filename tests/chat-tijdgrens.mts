/**
 * Hoeveel tijd krijgt een chatbeurt? Het WhatsApp-kanaal geeft een kortere
 * tijd mee zodat er altijd nog iets opgeleverd kan worden; het portaal geeft
 * niets mee en hoort de volle tijd te krijgen.
 *
 * Hier ging het mis: een ontbrekend formulierveld komt binnen als null, en
 * Number(null) is 0 — niet NaN. Daardoor viel elke portaalbeurt mét bijlage
 * terug op de ondergrens van 120 seconden en brak hij al na 40 seconden af met
 * de melding dat de tijdslimiet was bereikt. Een bericht zonder bijlage gaat
 * als JSON en had er geen last van, dus het leek willekeurig.
 * Draaien: node --import tsx tests/chat-tijdgrens.mts
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { grensVan, KORTSTE_BEURT_S } from "../lib/chat-tijd";

const bron = await readFile("app/api/chat/route.ts", "utf8");
const VOL = Number(bron.match(/export const maxDuration = (\d+)/)?.[1]);
assert.ok(VOL >= 300, "de volle tijd van een beurt moet ruim zijn");

// Niets meegegeven = de volle tijd. Alle manieren waarop "niets" binnenkomt:
assert.equal(grensVan(undefined, VOL), VOL, "JSON zonder veld");
assert.equal(grensVan(null, VOL), VOL, "formulier zonder veld — hier ging het mis");
assert.equal(grensVan("", VOL), VOL, "leeg formulierveld");
assert.equal(grensVan("onzin", VOL), VOL, "onleesbare waarde");

// Wel meegegeven: overnemen, maar binnen veilige grenzen
assert.equal(grensVan("600", VOL), 600, "WhatsApp geeft zijn eigen tijd mee");
assert.equal(grensVan(600, VOL), 600);
assert.equal(grensVan("50", VOL), KORTSTE_BEURT_S, "te kort wordt opgetrokken");
assert.equal(grensVan(99999, VOL), VOL, "te lang wordt afgetopt");

// Wat dat betekent voor het moment waarop de beurt zichzelf stopt
const stoptNa = (w: unknown) => Math.max(30, grensVan(w, VOL) - 80);
assert.ok(stoptNa(null) > 600, "een portaalbeurt met bijlage moet ruim de tijd krijgen");
assert.ok(stoptNa("600") > 400 && stoptNa("600") < 600, "WhatsApp stopt ruim vóór zijn eigen grens");

// En de route moet die grens ook echt toepassen op beide manieren van insturen
assert.match(bron, /grensVan\(form\.get\("maxDuurS"\), maxDuration\)/, "formulier-route");
assert.match(bron, /grensVan\(\(body as \{ maxDuurS\?: unknown \}\)\.maxDuurS, maxDuration\)/, "JSON-route");

console.log(
  `PASS chat-tijdgrens: zonder opgave de volle ${VOL} s (ook bij een ontbrekend of leeg formulierveld), een meegegeven tijd wordt overgenomen binnen veilige grenzen, en een portaalbeurt met bijlage stopt pas na ${stoptNa(null)} s in plaats van 40.`,
);
