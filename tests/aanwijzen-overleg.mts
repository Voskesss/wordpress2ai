/**
 * Twee lessen uit Jos' test van 20-09:
 * 1. Wat je AANWIJST moet zichtbaar bij je bericht staan — in de chatbubbel
 *    én in de opgeslagen geschiedenis. Anders lijkt het alsof de AI het niet
 *    ziet, en weet een vervolgbeurt echt niet meer waar het over ging.
 * 2. EEN VRAAG OM SUGGESTIES IS GEEN OPDRACHT: "heb je hier betere zinnen
 *    voor?" leverde direct een gewijzigde kop op in plaats van voorstellen
 *    met keuzeknoppen.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

// 1a. De chatbubbel toont de aanwijzing
const chat = await readFile("app/portal/Chat.tsx", "utf8");
assert.ok(
  /📍 Aangewezen:/.test(chat),
  "de chatbubbel toont niet wat er is aangewezen",
);
assert.ok(
  /gekozen\.tekst/.test(chat.slice(chat.indexOf("📍 Aangewezen:") - 400, chat.indexOf("📍 Aangewezen:") + 200)),
  "de aanwijs-regel gebruikt niet de tekst van het aangewezen element",
);

// 1b. De server bewaart de aanwijzing in de historie (voor vervolgbeurten)
const route = await readFile("app/api/chat/route.ts", "utf8");
const insert = route.slice(route.indexOf('rol: "klant"'), route.indexOf('rol: "klant"') + 800);
assert.ok(
  /📍 Aangewezen:/.test(insert) && /selectie/.test(insert),
  "de opgeslagen klantboodschap bevat de aanwijzing niet",
);

// 2. De suggestie-uitzondering op trede 1 van de beslisladder
assert.ok(
  /UITZONDERING OP TREDE 1/.test(route),
  "de regel 'een vraag om suggesties is geen opdracht' ontbreekt",
);
const suggestie = route.slice(route.indexOf("UITZONDERING OP TREDE 1"), route.indexOf("UITZONDERING OP TREDE 1") + 900);
assert.ok(/wijzig je nog NIETS/.test(suggestie), "de suggestie-regel verbiedt niet om alvast te wijzigen");
assert.ok(/twee of drie uitgewerkte voorstellen/.test(suggestie), "de suggestie-regel vraagt geen uitgewerkte voorstellen");
assert.ok(/KEUZES-regel/.test(suggestie), "de voorstellen komen niet als keuzeknoppen");
assert.ok(/Ik vertel het zelf/.test(suggestie), "de uitweg 'Ik vertel het zelf' ontbreekt");

console.log("aanwijzen-overleg: aanwijzing zichtbaar en bewaard, en een vraag om suggesties levert eerst overleg op");
