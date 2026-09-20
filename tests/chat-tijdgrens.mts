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
import { grensVan, KORTSTE_BEURT_S, PORTAAL_BEURT_S } from "../lib/chat-tijd";

const bron = await readFile("app/api/chat/route.ts", "utf8");
const VOL = Number(bron.match(/export const maxDuration = (\d+)/)?.[1]);
assert.ok(VOL >= 300, "de volle tijd van een beurt moet ruim zijn");

// Niets meegegeven = de volle tijd. Alle manieren waarop "niets" binnenkomt:
assert.equal(grensVan(undefined, VOL), VOL, "JSON zonder veld");
assert.equal(grensVan(null, VOL), VOL, "formulier zonder veld — hier ging het mis");
assert.equal(grensVan("", VOL), VOL, "leeg formulierveld");
assert.equal(grensVan("onzin", VOL), VOL, "onleesbare waarde");

// Wel meegegeven: overnemen, maar binnen veilige grenzen
assert.equal(grensVan("300", VOL), 300, "WhatsApp geeft zijn eigen tijd mee");
assert.equal(grensVan(300, VOL), 300);
assert.equal(grensVan("50", VOL), KORTSTE_BEURT_S, "te kort wordt opgetrokken");
assert.equal(grensVan(99999, VOL), VOL, "te lang wordt afgetopt");

// Wat dat betekent voor het moment waarop de beurt zichzelf stopt
const stoptNa = (w: unknown) => Math.max(30, grensVan(w, PORTAAL_BEURT_S) - 80);
// Waar het ooit misging: een portaalbeurt met bijlage brak al na 40 seconden af
assert.ok(stoptNa(null) > 240, "een portaalbeurt met bijlage moet ruim de tijd krijgen");
assert.ok(stoptNa("300") > 180 && stoptNa("300") < 300, "WhatsApp stopt ruim vóór zijn eigen grens");

// En de route moet die grens ook echt toepassen op beide manieren van insturen
assert.match(bron, /grensVan\(form\.get\("maxDuurS"\), PORTAAL_BEURT_S\)/, "formulier-route");
assert.match(bron, /grensVan\(\(body as \{ maxDuurS\?: unknown \}\)\.maxDuurS, PORTAAL_BEURT_S\)/, "JSON-route");


// Portaalgrens (20-09): een beurt van negen minuten die nog niet klaar was.
// Het portaal rondt nu op tijd af in plaats van door te ploeteren tot de
// harde platformgrens, en zegt tijdens het wachten wanneer dat gebeurt.
{
  const { PORTAAL_BEURT_S } = await import("../lib/chat-tijd");
  assert.ok(PORTAAL_BEURT_S >= 240 && PORTAAL_BEURT_S <= 600, `portaalgrens ${PORTAAL_BEURT_S}s is niet realistisch`);
  const route = await readFile("app/api/chat/route.ts", "utf8");
  assert.ok(/let maxDuurS = PORTAAL_BEURT_S;/.test(route), "de portaalbeurt gebruikt de grens niet");
  assert.ok(
    !/grensVan\([^)]*, maxDuration\)/.test(route),
    "er wordt nog met de volle platformtijd gerekend in plaats van de portaalgrens",
  );
  const chat = await readFile("app/portal/Chat.tsx", "utf8");
  assert.ok(/wachtSec >= 120/.test(chat), "bij lang wachten komt er geen eerlijke melding");
  assert.ok(/PORTAAL_BEURT_S - wachtSec/.test(chat), "de melding noemt niet wanneer er wordt afgerond");
}

console.log(
  `PASS chat-tijdgrens: zonder opgave de volle ${VOL} s (ook bij een ontbrekend of leeg formulierveld), een meegegeven tijd wordt overgenomen binnen veilige grenzen, en een portaalbeurt met bijlage stopt pas na ${stoptNa(null)} s in plaats van 40.`,
);
