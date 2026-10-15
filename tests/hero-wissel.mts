/** Homepage-hero als dia's (14-10-2026): eerste foto direct en met alt, rest pas later en decoratief; bladeren met pijltjes en puntjes. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const c = await readFile("app/HeroDias.tsx", "utf8");
const home = await readFile("app/page.tsx", "utf8");
assert.ok(c.includes("priority={i === 0}"), "de eerste foto moet direct laden");
assert.ok(c.includes('alt={i === 0 ? alt : ""}'), "alleen de eerste foto hoort een beschrijving te hebben");
assert.ok(c.includes("useState(1)"), "bij het laden hoort maar één foto in de pagina te staan");
assert.ok(c.includes("prefers-reduced-motion"), "minder beweging wordt niet gerespecteerd");
assert.ok(c.includes("document.hidden"), "het wisselen gaat door in een verborgen tabblad");
assert.ok(c.includes('aria-label="Vorige"') && c.includes('aria-label="Volgende"'), "de pijltjes ontbreken of hebben geen naam");
assert.ok(c.includes("(hover: hover) and (pointer: fine)"), "het logo-effect hoort alleen bij een muis");
// Eén h1, en die zegt wát WordSwap is (15-10-2026); de belofte is een gewone kop
assert.equal((home.match(/<h1/g) ?? []).length, 0, "de homepage hoort zelf geen h1 te hebben, die zit in de eerste dia");
assert.equal((c.match(/<h1/g) ?? []).length, 1, "de dia's horen precies één h1 te hebben");
assert.ok(c.includes('i === 0 ? <h1 className="hero-h1">{d.label}</h1>'), "alleen het label van de eerste dia mag de h1 zijn");
const h1 = home.match(/label: "([^"]+)"/)?.[1] ?? "";
assert.ok(/WordPress/.test(h1) && /statische website/.test(h1), `de h1 zegt niet wat WordSwap is: "${h1}"`);
// Geen tijdsbeloftes in de dia's
const diaBlok = home.slice(home.indexOf("<HeroDias"), home.indexOf("onder={"));
assert.ok(diaBlok.length > 200, "dia's niet gevonden in de homepage");
for (const fout of ["seconden", "minuut", "direct live", "Klaar."]) assert.ok(!diaBlok.includes(fout), `tijdsbelofte in de hero: ${fout}`);
console.log("hero-wissel: ok");
