import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * Eén omgevallen demo-klus hield twee uur lang alles tegen. De klus zelf was
 * dood, maar zijn hartslag ververste het slot elke tien seconden door, want
 * die zat in hetzelfde proces dat op de server warm bleef staan. Elke nieuwe
 * opdracht kreeg "er wordt nog gewerkt, wacht even", en een nieuw gesprek
 * hielp niet, want het slot is per persoon en niet per gesprek.
 *
 * Twee vangnetten: een absolute bovengrens op een slot, en de uurlijkse
 * demo-reset ruimt de sloten van de demo op.
 */

const guards = await readFile(new URL("../lib/operation-guards.ts", import.meta.url), "utf8");
const reset = await readFile(new URL("../app/api/demo-reset/route.ts", import.meta.url), "utf8");

// 1. Er is een bovengrens, en die past bij wat Vercel toestaat (800 s)
const grens = Number(guards.match(/const MAX_SLOT_SECONDEN = ([\d\s*]+);/)?.[1]?.replace(/\s/g, "") && eval(guards.match(/const MAX_SLOT_SECONDEN = ([\d\s*]+);/)![1]));
assert.ok(grens >= 900, `bovengrens van ${grens}s zou een echte beurt van 800 s kunnen afkappen`);
assert.ok(grens <= 30 * 60, `bovengrens van ${grens}s laat een zombie nog te lang staan`);

// 2. De hartslag telt zijn slagen en stopt zichzelf bij de grens
const hart = guards.slice(guards.indexOf("const hartslag = setInterval"), guards.indexOf("hartslag.unref"));
assert.ok(hart.includes("++slagen"), "de hartslag telt niet hoe lang hij al loopt");
assert.ok(hart.includes("clearInterval(hartslag)"), "de hartslag stopt zichzelf niet bij de grens");
assert.ok(
  hart.indexOf("MAX_SLOT_SECONDEN") < hart.indexOf("void db"),
  "de grens wordt pas gecontroleerd nadat het slot alweer ververst is"
);

// 3. Wie de grens raakt wordt ook gestopt, net als bij een weggehaald slot
assert.ok(hart.includes("opVerloren?.()"), "een klus voorbij de grens werkt gewoon door");

// 4. Het interval en de rekensom gebruiken dezelfde tik, anders klopt de grens niet
assert.ok(guards.includes("}, HARTSLAG_MS);"), "de hartslag tikt op een ander tempo dan waarmee gerekend wordt");
assert.ok(hart.includes("slagen * HARTSLAG_MS"), "de grens rekent niet met de echte tik");

// 5. De demo-reset haalt de sloten van de demo weg, vóór hij de rest wist
assert.ok(reset.includes("DELETE FROM operation_leases WHERE scope LIKE"), "de reset laat de sloten staan");
assert.ok(
  reset.indexOf("DELETE FROM operation_leases") < reset.indexOf("delete(changes)"),
  "de sloten gaan pas weg nadat de wijzigingen al gewist zijn"
);
// Alleen de sloten van déze demosite, nooit die van een klant
assert.ok(reset.includes("`site:${site.id}:%`"), "de reset ruimt sloten van andere sites op");

console.log("slot-bovengrens: ok");
