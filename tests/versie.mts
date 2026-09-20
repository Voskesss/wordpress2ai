import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { VERSIE, siteStempel } from "../lib/versie";

/**
 * Het versienummer staat op drie plekken: lib/versie.ts, package.json en als
 * kopje in CHANGELOG.md. Loopt dat uit elkaar, dan stempelen we klantsites met
 * een versie die nergens beschreven staat, en dan is de stempel waardeloos.
 */

// 1. Een geldig nummer van drie delen
assert.match(VERSIE, /^\d+\.\d+\.\d+$/, `Onbruikbaar versienummer: ${VERSIE}`);

// 2. package.json loopt gelijk
const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.equal(pkg.version, VERSIE, "package.json en lib/versie.ts lopen uit elkaar");

// 3. De changelog beschrijft deze versie
const changelog = await readFile(new URL("../CHANGELOG.md", import.meta.url), "utf8");
assert.ok(
  new RegExp(`^## ${VERSIE.replace(/\./g, "\\.")}\\b`, "m").test(changelog),
  `Geen blok "## ${VERSIE}" in CHANGELOG.md`
);

// 4. Geen lange streepjes in de changelog: die gaat richting klantberichten
assert.ok(!changelog.includes("—"), "Lang streepje in CHANGELOG.md");

// 5. De stempel voor de klantrepo is leesbare, geldige JSON
const stempel = siteStempel({
  siteNaam: "RoelArt",
  bron: "https://roelart.nl",
  gebouwdOp: new Date("2026-09-12T10:00:00.000Z"),
});
const gelezen = JSON.parse(stempel);
assert.equal(gelezen.wordswap, VERSIE);
assert.equal(gelezen.site, "RoelArt");
assert.equal(gelezen.bron, "https://roelart.nl");
assert.equal(gelezen.gebouwdOp, "2026-09-12T10:00:00.000Z");
assert.ok(stempel.endsWith("\n"), "Stempel hoort op een nieuwe regel te eindigen");

// 6. Zonder bekende bron blijft het veld leeg in plaats van undefined
assert.equal(JSON.parse(siteStempel({ siteNaam: "X", gebouwdOp: new Date() })).bron, null);

console.log("versie: ok");
