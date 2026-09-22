import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Geen krappe tokenbudgetten bij modellen die zelf nadenken.
 *
 * Wat er misging (22-09-2026): lib/lead-mail-ai.ts stond op max_tokens 700.
 * Sonnet denkt standaard na, dat denken telt mee in max_tokens en is
 * onzichtbaar. Een eerste leadmail kost gemeten 1185 tokens, dus ging het hele
 * budget op aan denken en kwam er NUL tekst terug. Geen foutmelding, geen
 * uitzondering: alleen "de AI kon geen tekst maken". De knop deed het gewoon
 * niet, en er was niets om op te zoeken.
 *
 * max_tokens is een PLAFOND, geen doel: je betaalt wat er gebruikt wordt. Te
 * hoog zetten kost dus niets, te laag zetten kost een middag zoeken.
 *
 * Haiku denkt niet uit zichzelf, dus daar is een klein budget wel veilig.
 */

const ONDERGRENS = 4000;
const DENKENDE_MODELLEN = /claude-(sonnet-5|opus-|fable-)/;

async function alleBestanden(map: string): Promise<string[]> {
  const uit: string[] = [];
  for (const item of await readdir(map, { withFileTypes: true })) {
    if (item.name === "node_modules" || item.name.startsWith(".")) continue;
    const pad = path.join(map, item.name);
    if (item.isDirectory()) uit.push(...(await alleBestanden(pad)));
    else if (/\.tsx?$/.test(item.name)) uit.push(pad);
  }
  return uit;
}

const wortel = new URL("..", import.meta.url).pathname;
const bestanden = [
  ...(await alleBestanden(path.join(wortel, "lib"))),
  ...(await alleBestanden(path.join(wortel, "app"))),
];

const klachten: string[] = [];
for (const pad of bestanden) {
  const regels = (await readFile(pad, "utf8")).split("\n");
  regels.forEach((regel, i) => {
    const model = regel.match(/model:\s*"([^"]+)"/);
    if (!model || !DENKENDE_MODELLEN.test(model[1])) return;
    // max_tokens hoort vlak bij het model te staan; tien regels is ruim.
    for (let j = i; j < Math.min(i + 10, regels.length); j++) {
      const budget = regels[j].match(/max_tokens:\s*(\d+)/);
      if (!budget) continue;
      if (Number(budget[1]) < ONDERGRENS) {
        klachten.push(
          `${path.relative(wortel, pad)}:${j + 1} gebruikt ${model[1]} met max_tokens ${budget[1]}, ondergrens is ${ONDERGRENS}`
        );
      }
      return;
    }
  });
}

assert.deepEqual(
  klachten,
  [],
  `Te krap tokenbudget bij een model dat zelf nadenkt:\n${klachten.join("\n")}`
);

console.log(`tokenbudget: ${bestanden.length} bestanden nagekeken, geen krappe budgetten`);
