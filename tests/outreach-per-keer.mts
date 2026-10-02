import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * De outreachpagina toont de prospects per keer (Jos, 02-10-2026). Elke kaart
 * draagt een mailbewerker en drie complete mails mee; met de hele lijst duurde
 * het ~8 seconden voordat je in een tekstvak kon typen.
 */
const bron = await readFile("app/admin/outreach/page.tsx", "utf8");
const perKeer = Number(/const PER_KEER = (\d+);/.exec(bron)?.[1]);
assert.ok(perKeer > 0 && perKeer <= 30, `te veel kaarten per keer (${perKeer})`);
assert.ok(bron.includes("{lijst.slice(0, aantal).map((p) => {"), "de lijst wordt weer in zijn geheel getoond");
assert.ok(!/\{lijst\.map\(/.test(bron), "er staat nog een volledige lijst.map in de pagina");
assert.ok(bron.includes("aantal=${aantal + PER_KEER}") && bron.includes("toon=${toon}"), "Toon meer houdt het filter niet vast");
// De tellers bovenaan tellen nog steeds alles, niet alleen wat zichtbaar is
assert.ok(bron.includes("alle.filter(filters.actie).length"), "de teller telt alleen het zichtbare deel");
console.log("outreach-per-keer: ok");
