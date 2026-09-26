/**
 * Elke landingspagina beantwoordt zijn éigen vragen (wens Jos 26-09, na de
 * ChatGPT-zichtbaarheidscheck): twaalf pagina's die dezelfde propositie
 * herhalen helpen bezoeker noch zoekmachine. Alleen de prijsvraag mag
 * gedeeld worden; elke andere vraag hoort op precies één pagina te staan.
 */
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const GEDEELD_TOEGESTAAN = new Set(["Wat kost de overstap?", "Wat kost het omzetten?", "Wat kost het?"]);
const mappen = (await readdir("app", { withFileTypes: true }))
  .filter((d) => d.isDirectory() && /wordpress|koppelen|eigen-ai|wordswap-vs/.test(d.name))
  .map((d) => d.name);
assert.ok(mappen.length >= 10, `verwacht minstens 10 landingspagina's, zag ${mappen.length}`);

const perVraag = new Map<string, string[]>();
for (const map of mappen) {
  const t = await readFile(`app/${map}/page.tsx`, "utf8").catch(() => "");
  for (const m of t.matchAll(/["']?vraag["']?:\s*"([^"]+)"|^\s*\[\s*\n?\s*"([^"]+)",/gm)) {
    const vraag = (m[1] ?? m[2] ?? "").trim();
    if (!vraag || vraag.length < 10) continue;
    perVraag.set(vraag, [...(perVraag.get(vraag) ?? []), map]);
  }
}
assert.ok(perVraag.size >= 25, `verwacht minstens 25 vragen in totaal, zag ${perVraag.size}`);

const dubbel = [...perVraag.entries()].filter(([v, waar]) => waar.length > 1 && !GEDEELD_TOEGESTAAN.has(v));
assert.equal(
  dubbel.length,
  0,
  `dubbele vragen op meerdere pagina's:\n${dubbel.map(([v, waar]) => `  "${v}" op ${waar.join(", ")}`).join("\n")}`,
);

// De kruisverwijzingen tussen overstap en nieuw ontwerp staan er
const overzetten = await readFile("app/wordpress-overzetten/page.tsx", "utf8");
assert.ok(/nieuw AI-ontwerp.*€250|€250/.test(overzetten), "de kruisverwijzing naar het nieuwe ontwerp ontbreekt op de overstap-pagina");
const maken = await readFile("app/wordpress-website-maken-met-ai/page.tsx", "utf8");
assert.ok(/vanaf €150/.test(maken), "de kruisverwijzing naar de overstap ontbreekt op de nieuw-ontwerp-pagina");
const landing = await readFile("app/SeoLanding.tsx", "utf8");
assert.ok(landing.includes("overzetten kan al vanaf €150"), "de kruiszin in de nieuw-ontwerp-landingsregel ontbreekt");

console.log(`landingsvragen: ok (${mappen.length} pagina's, ${perVraag.size} unieke vragen)`);
