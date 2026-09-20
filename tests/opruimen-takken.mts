/**
 * Opruimen mag niet stuklopen als een bestand maar op één tak staat. Een
 * video die via de chat was geplaatst stond alleen op het openstaande
 * concept, nog niet op de hoofdversie; de verwijdercommit op main faalde
 * daardoor en de klant las "Verwijderen lukte niet" terwijl er niets aan de
 * hand was (20-09).
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const github = await readFile("lib/github.ts", "utf8");
const blok = github.slice(github.indexOf("export async function verwijderBestanden"));
const eind = blok.indexOf("\n}\n");
const fn = blok.slice(0, eind);

assert.ok(/git\/trees\/\$\{basisCommit\.tree\.sha\}\?recursive=1/.test(fn), "de boom van de tak wordt niet opgehaald");
assert.ok(/const teWissen = paden\.filter\(\(p\) => aanwezig\.has\(p\)\)/.test(fn), "er wordt niet gefilterd op wat er in deze tak staat");
assert.ok(/if \(teWissen\.length === 0\) return/.test(fn), "zonder aanwezige paden hoort er niets te gebeuren");
assert.ok(
  fn.indexOf("teWissen.map") > 0 && !/tree: paden\.map/.test(fn),
  "de commit gebruikt nog de ongefilterde lijst",
);

console.log("opruimen-takken: verwijderen slaat over wat in die tak niet bestaat");
