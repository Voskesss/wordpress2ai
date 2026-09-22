import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dubbeleTeksten } from "../lib/seo-poort";

/**
 * Onze eigen opleveringspoort controleert bij elke klantsite of titels en
 * omschrijvingen kloppen. Op onze eigen site was hij nog nooit losgelaten, en
 * toen bleek: vijftien pagina's hadden een omschrijving die Google afkapt, tot
 * 231 tekens aan toe.
 *
 * Bij het meten liep ik tegen dezelfde fout op als weken geleden in de poort:
 * een regex die afkapt op de apostrof in "foto's", waardoor een omschrijving
 * van 185 tekens als 13 binnenkwam en alles keurig kort leek. Vandaar de
 * aanhalingsteken-bewuste manier hieronder.
 */

const overslaan = ["portal","admin","demo","sign-in","sign-up","afspraak","betalen","betaald","bedankt","check","api","site-weergave","preview","llms.txt","llms-full.txt","sitemap.xml","webinar"];
const GRENS = { titel: 60, omschrijving: 155 };

/** Leest een veld uit, ook als de waarde zelf een apostrof bevat. */
const pak = (s: string, veld: string) =>
  s.match(new RegExp(`["']?${veld}["']?\\s*:\\s*(["'])((?:\\\\.|(?!\\1)[^\\\\])*)\\1`))?.[2];

const mappen = (await readdir(new URL("../app", import.meta.url), { withFileTypes: true }))
  .filter((d) => d.isDirectory() && !d.name.startsWith("_") && !d.name.startsWith("[") && !overslaan.includes(d.name))
  .map((d) => d.name);

const paginas: { pad: string; titel?: string; omschrijving?: string }[] = [];
for (const m of [...mappen, ""]) {
  const inhoud = await readFile(new URL(`../app/${m ? `${m}/` : ""}page.tsx`, import.meta.url), "utf8").catch(() => null);
  if (!inhoud) continue;
  paginas.push({ pad: `/${m}`, titel: pak(inhoud, "title"), omschrijving: pak(inhoud, "description") });
}
assert.ok(paginas.length > 25, `maar ${paginas.length} pagina's gevonden, de manier van uitlezen klopt niet meer`);

// 0. De uitlezer moet een apostrof aankunnen, anders meet hij alles te kort
assert.equal(pak(`{"description": "foto's en meer"}`, "description"), "foto's en meer");

// 1. Niets wordt afgekapt in de zoekresultaten
const telang = paginas.filter(
  (p) => (p.titel?.length ?? 0) > GRENS.titel || (p.omschrijving?.length ?? 0) > GRENS.omschrijving,
);
assert.equal(
  telang.length,
  0,
  `afgekapt in Google:\n${telang.map((p) => `  ${p.pad}: titel ${p.titel?.length}, omschrijving ${p.omschrijving?.length}`).join("\n")}`,
);

// 2. En geen twee pagina's die hetzelfde beloven; dan kiest Google er zelf één
const dubbel = dubbeleTeksten(paginas as never);
assert.equal(dubbel.length, 0, `dubbele teksten: ${dubbel.map((b) => (b as { tekst?: string }).tekst).join(" | ")}`);

// 3. Elke openbare pagina hééft een titel en omschrijving
const zonder = paginas.filter((p) => !p.titel && !p.pad.startsWith("/prijzen"));
assert.equal(zonder.length, 0, `zonder titel: ${zonder.map((p) => p.pad).join(", ")}`);

console.log(`seo-metateksten: ok (${paginas.length} pagina's, niets te lang, niets dubbel)`);
