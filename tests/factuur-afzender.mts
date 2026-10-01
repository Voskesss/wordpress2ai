/** Op de factuur stond het privé-mobiele nummer van Jos in plaats van het
 * vaste WordSwap-nummer (ovbuRo, WS-2026-0004, 01-10-2026), en de KvK van de
 * klant stond er twee keer op. Het nummer komt nu uit dezelfde bron als de site.
 * Draaien: node --import tsx tests/factuur-afzender.mts */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AFZENDER, klantAdresRegels } from "../lib/factuur";
import { TELEFOON } from "../lib/contactgegevens";

assert.equal(AFZENDER.telefoon, TELEFOON, "de factuur gebruikt een ander nummer dan de site");
assert.equal(TELEFOON, "026 234 01 22");
const bron = await readFile("lib/factuur.ts", "utf8");
assert.ok(!/\+31 6|\b06[\s-]?\d/.test(bron), "er staat een mobiel nummer vast in de factuur");

// KvK uit het adresveld valt weg als het KvK-veld hetzelfde nummer heeft
assert.deepEqual(
  klantAdresRegels("De Nieuwe Erven 3 unit 12906\ncontact@ovburo.nl\nKVK: 95431020", "95431020"),
  ["De Nieuwe Erven 3 unit 12906", "contact@ovburo.nl"],
);
assert.deepEqual(klantAdresRegels("Straat 1\nKvK 12345678", null), ["Straat 1", "KvK 12345678"], "zonder KvK-veld blijft de regel staan");
assert.deepEqual(klantAdresRegels("Straat 1\nKvK 12345678", "87654321"), ["Straat 1", "KvK 12345678"], "een ander nummer blijft staan");
assert.deepEqual(klantAdresRegels("Postbus 95431020\n1234 AB Plaats", "95431020"), ["Postbus 95431020", "1234 AB Plaats"], "alleen een KvK-regel valt weg, geen andere regel met die cijfers");
assert.ok(bron.includes("...klantAdresRegels(f.klantAdres, f.klantKvk),"), "de factuur gebruikt de ontdubbelde adresregels niet");
console.log("✓ factuur: vast WordSwap-nummer en geen dubbele KvK");
