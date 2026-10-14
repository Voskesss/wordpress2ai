/** Wisselende hero-foto's (14-10-2026): eerste foto direct en met alt, rest pas later en decoratief. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const c = await readFile("app/HeroWisselaar.tsx", "utf8");
assert.ok(c.includes("priority={i === 0}"), "de eerste foto moet direct laden");
assert.ok(c.includes('alt={i === 0 ? alt : ""}'), "alleen de eerste foto hoort een beschrijving te hebben");
assert.ok(c.includes("useState(1)"), "bij het laden hoort maar één foto in de pagina te staan");
assert.ok(c.includes("prefers-reduced-motion"), "minder beweging wordt niet gerespecteerd");
assert.ok(c.includes("document.hidden"), "het wisselen gaat door in een verborgen tabblad");
console.log("hero-wissel: ok");
