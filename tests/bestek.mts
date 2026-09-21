import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * Het ontwerp-bestek is er nooit geweest (gevonden 21-09-2026).
 *
 * lib/bouw.ts gaf page.evaluate() een functie mee. tsx draait daar doorheen en
 * esbuild wikkelt elke benoemde functie in __name(), dat in de browser niet
 * bestaat. De evaluate wierp dus altijd een ReferenceError, de catch eronder
 * slikte die stil in, en er is nooit één bestek-*.json geschreven. Terwijl de
 * bouwinstructie de AI wél naar dat bestek verwijst voor lettertypen, kleuren
 * en maten. Dat verklaart een hoop ontwerpafwijkingen.
 *
 * Deze test bewaakt dat het een string blijft en dat er geen TypeScript in
 * sluipt, want dat merk je pas in een echte migratie.
 */

const bron = await readFile(new URL("../lib/bouw.ts", import.meta.url), "utf8");

// 1. Het script is een string, geen functie
const m = bron.match(/const BESTEK_SCRIPT = `([\s\S]*?)`;\n/);
assert.ok(m, "BESTEK_SCRIPT ontbreekt of is geen template-string");
const script = m![1];

// 2. page.evaluate krijgt die string, nooit een functie
assert.match(bron, /page\.evaluate\(BESTEK_SCRIPT\)/, "de evaluate krijgt geen string mee");
assert.ok(
  !/const bestek = await page\.evaluate\(\(\) =>/.test(bron),
  "de oude functievorm staat er weer in; die faalt stil door __name",
);

// 3. Geen TypeScript in het script: de browser kent dat niet
for (const patroon of [/\bas [A-Z]\w+/, /: (?:Element|HTMLElement|string|number|boolean)\b/, /<string,/]) {
  const gevonden = script.match(patroon);
  assert.ok(!gevonden, `TypeScript in het bestek-script: ${gevonden?.[0]}`);
}

// 4. Het levert de dingen op waar de bouwinstructie om vraagt
for (const veld of ["gerenderdeBeelden", "body", "h1", "secties", "embeds", "beweging", "cssBeweging"])
  assert.ok(
    new RegExp(`\\b${veld}[:,]`).test(script),
    `bestek mist ${veld}`,
  );

// 5. De beweging wordt gemeten uit de slider-lagen
assert.ok(script.includes("data-frame_1"), "starttijden van de lagen worden niet gelezen");
assert.match(script, /startMs/, "geen starttijd per element");
assert.match(script, /duurMs/, "geen duur per element");

// 6. En de bouwinstructie vertelt de AI dat hij die moet gebruiken
assert.match(bron, /BEWEGING NABOUWEN/, "de instructie zegt niets over de gemeten beweging");
assert.match(bron, /startMs/, "de instructie noemt de gemeten starttijden niet");

console.log("bestek: ok");
