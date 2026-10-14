import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { aanbod } from "../lib/aanbod";

/**
 * AI-modellen en zoekmachines delen een bedrijf in op vaktermen (advies via
 * Jos, 11-10-2026). Die termen staan op vaste plekken: llms.txt, de
 * structured data en de alternatief-pagina. De koppen voor ondernemers blijven
 * in gewone taal. En de AI-crawlers mogen erin.
 */
for (const term of ["alternatief voor WordPress met AI-beheer", "AI-gestuurde websitemigratie", "bouwen met AI een nieuwe website"])
  assert.ok(aanbod.inHetKort.includes(term), `de kernzin mist: ${term}`);

const lees = (p: string) => readFile(p, "utf8");
for (const p of ["app/llms.txt/route.ts", "app/llms-full.txt/route.ts"]) assert.ok((await lees(p)).includes("${aanbod.inHetKort}"), `${p} noemt de vaktermen niet`);
{
  // llms.txt bouwt zijn lijst sinds 14-10 uit lib/seo-paginas.ts; daarom de uitvoer controleren
  const { GET } = await import("../app/llms.txt/route");
  assert.ok((await GET().text()).includes("https://www.wordswap.nl/wordpress-alternatief"), "llms.txt verwijst niet naar de alternatief-pagina");
}

const layout = await lees("app/layout.tsx");
for (const term of ["WordPress AI-alternatief", "AI-gestuurde websitemigratie", "knowsAbout", "AI website builder"]) assert.ok(layout.includes(term), `trefwoorden of structured data missen: ${term}`);

const pagina = await lees("app/wordpress-alternatief/page.tsx");
assert.ok(pagina.includes("Is WordSwap een AI website builder?") && pagina.includes("AI-gestuurde websitemigratie"), "de alternatief-pagina mist de vaktermen");

// De robots laten de AI-crawlers toe, en niemand wordt geweerd
const robots = await lees("app/robots.ts");
for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "OAI-SearchBot"]) assert.ok(robots.includes(bot), `robots noemt ${bot} niet`);
assert.ok(!/disallow:\s*["']\/["']/i.test(robots), "robots weert een crawler van de hele site");

// De homepage-kop blijft gewone taal voor ondernemers
assert.ok(!/AI-gestuurde websitemigratie/.test(await lees("app/page.tsx")), "vaktaal in de homepage: die is voor ondernemers");

console.log("ai-termen: ok");
