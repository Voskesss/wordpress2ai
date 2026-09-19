/**
 * Niet-geplaatste uploads horen bij een openstaand concept op BEIDE takken
 * bewaard te worden: main (blijft ook na weggooien van het concept) én de
 * conceptbranch (daar kijken de fotobank en de volgende beurt naar).
 * Aanleiding 19-09: "hij hoort in mijn fotobank" — maar de foto stond alleen
 * op main en was in het open concept onvindbaar.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const route = await readFile("app/api/chat/route.ts", "utf8");
const blok = route.slice(route.indexOf("alleenOngebruikteUploads ="), route.indexOf("alleenOngebruikteUploads =") + 2200);
const pushes = blok.split("Meegestuurd bestand bewaard (nog niet geplaatst)").length - 1;
assert.ok(pushes >= 2, `verwacht bewaren op main én conceptbranch, zag ${pushes} push(es)`);
assert.ok(/if \(openConcept\?\.branch\)/.test(blok), "bewaren op de conceptbranch is niet aan het open concept gebonden");

console.log("fotobank-bewaren: uploads gaan naar main én de open conceptbranch");
