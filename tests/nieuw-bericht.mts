/**
 * Nieuw bericht op een site met berichten (EVC 28-09): de AI maakte het
 * artikel en de overzichtspagina's, maar miste steeds het blokje "Actueel"
 * op de homepage (op productie én in de proefrit), en deed de extra's
 * (vorige/volgende) vóór het zichtbare werk. De huisregel legt de
 * werkwijze vast die alle plekken vindt: zoeken op het adres van het
 * nieuwste bestaande bericht.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const h = await readFile("lib/huisregels.ts", "utf8");
const i = h.indexOf("NIEUW BERICHT OP EEN SITE MET BERICHTEN");
assert.ok(i > 0, "de huisregel voor een nieuw bericht ontbreekt");
const regel = h.slice(i, h.indexOf("\n", i));
assert.ok(/zoek_tekst\s+op het adres van het nieuwste bestaande bericht/.test(regel), "de vind-alle-plekken-werkwijze (zoeken op het adres van het nieuwste bericht) ontbreekt");
assert.ok(/blokje "Actueel" of "Nieuws" op de homepage/.test(regel), "de homepage-valkuil wordt niet expliciet genoemd");
assert.ok(/eerst de pagina van het bericht zelf, dan de homepage, dan de overzichtspagina's, en pas als laatste extra's/.test(regel), "de volgorde (zichtbaar werk eerst, extra's als laatste) ontbreekt");
assert.ok(/in hetzelfde stramien als de bestaande berichten/.test(regel), "het stramien van de bestaande berichten aanhouden ontbreekt");
assert.ok(!regel.includes("—"), "lang streepje in de huisregel");

console.log("nieuw-bericht: werkwijze om alle vermeldingen te vinden, homepage eerst");
