/**
 * GEO (15-10-2026): AI-zoekmachines lezen vooral de eerste alinea en korte
 * vraag-antwoorden. Bewaakt: de kernzin bovenaan de homepage, de letterlijke
 * "wat is"-vragen in de FAQ, en het WebApplication-schema (geen generator).
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { aanbod, aankoopVragen } from "../lib/aanbod";
assert.match(aanbod.kernzin, /^WordSwap is een Nederlandse dienst/, "de kernzin begint niet met wat WordSwap is");
assert.ok(aanbod.kernzin.split(/\s+/).length < 60, "de kernzin is te lang voor een eerste alinea");
assert.equal(aankoopVragen[0][0], "Wat is WordSwap?", "de FAQ begint niet met 'Wat is WordSwap?'");
for (const v of [
  "Hoe werkt het bewerken van een website via AI-chat?",
  "Wat is een statische AI-website?",
  "Wat is het verschil tussen WordPress en een statische website?",
  "Hoe veilig is een statische website?",
  "Is WordSwap een static site generator?",
]) assert.ok(aankoopVragen.some(([q]) => q === v), `vraag ontbreekt in de FAQ: ${v}`);
assert.match(aankoopVragen.find(([q]) => q === "Is WordSwap een static site generator?")![1], /^Nee\./, "we zijn geen generator");
const home = await readFile("app/page.tsx", "utf8");
// Intro onder de hero (tekst Jos 15-10-2026): noemt de categorie, belooft niet het onmogelijke
assert.ok(home.includes("statische website zonder database") && home.includes("AI-chat"), "de homepage-intro noemt niet wat WordSwap is");
for (const fout of ["onmogelijk te hacken", "nooit meer in te loggen", "razendsnel"]) assert.ok(!home.toLowerCase().includes(fout), `te stellige belofte op de homepage: ${fout}`);
const layout = await readFile("app/layout.tsx", "utf8");
assert.ok(layout.includes('"@type": "WebApplication"'), "WebApplication-schema ontbreekt");
assert.ok(!/static site generator|migration tool/i.test(layout.replace(/\/\/.*$/gm, "")), "het schema noemt ons een generator of tool");
console.log("geo-definities: ok");
