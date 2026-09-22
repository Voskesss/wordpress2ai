import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * Landingspagina's per vak: hovenier, schilder, installateur, bouwbedrijf,
 * kapsalon. Dat is waar zijn klanten en zijn outreach zitten, en er stond nog
 * niets voor. Iemand die zoekt op "website voor hoveniersbedrijf" kwam bij
 * WordSwap nergens uit.
 *
 * Wat deze test bewaakt is niet de tekst maar de beloftes: een branchepagina
 * verleidt tot iets toezeggen wat we niet waarmaken, en tot een omschrijving
 * die Google afkapt.
 */

// Aanhalingsteken-bewust: een omschrijving met "foto's" erin werd anders
// afgekapt bij het meten, en dan lijkt alles keurig kort.
const pak = (s: string, veld: string) =>
  s.match(new RegExp(`["']?${veld}["']?\\s*:\\s*(["'])((?:\\\\.|(?!\\1)[^\\\\])*)\\1`))?.[2];

const slugs = [
  "website-hoveniersbedrijf",
  "website-schildersbedrijf",
  "website-installatiebedrijf",
  "website-bouwbedrijf",
  "website-kapsalon",
];

const sitemap = await readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

for (const slug of slugs) {
  const pagina = await readFile(new URL(`../app/${slug}/page.tsx`, import.meta.url), "utf8");
  const titel = pak(pagina, "title");
  const omschrijving = pak(pagina, "description");

  // 1. Past in wat Google toont; anders staat je zin halverwege afgebroken
  assert.ok(titel && titel.length <= 60, `${slug}: titel is ${titel?.length} tekens, Google toont er 60`);
  assert.ok(
    omschrijving && omschrijving.length <= 155,
    `${slug}: omschrijving is ${omschrijving?.length} tekens, Google toont er 155`,
  );

  // 2. Vindbaar: in de sitemap en in het menu, anders bestaat de pagina wel
  //    maar komt er niemand
  assert.ok(sitemap.includes(`"/${slug}"`), `${slug} staat niet in de sitemap`);
  assert.ok(layout.includes(`"${slug}"`), `${slug} staat in geen enkel menu`);

  // 3. Dezelfde prijs als overal, en nergens een ander bedrag
  assert.ok(/150 euro/.test(pagina), `${slug} noemt het eenmalige bedrag niet`);
  assert.ok(!/\b250\b|€\s?250/.test(pagina), `${slug} noemt een oud bedrag`);

  // 4. Nooit iets beloven wat we niet bouwen. Een branchepagina verleidt
  //    daartoe: een makelaar wil woningaanbod, een salon een boekingssysteem.
  assert.ok(
    !/koppelen we (je|jouw) (voorraad|aanbod)|automatisch (bij|over)genomen|live koppeling/i.test(pagina),
    `${slug} belooft een koppeling die niet gebouwd is`,
  );
  // Draait het bij een externe partij, dan mag het wel, en dan hoort de
  // nuance erbij te staan dat alleen "in WordPress zelf" niet meegaat
  if (/afsprakensysteem|plansysteem|reserverings/i.test(pagina)) {
    assert.ok(
      /[ií]n WordPress (zelf )?draait/i.test(pagina),
      `${slug} noemt een extern systeem zonder erbij te zeggen wat er dan níét kan`,
    );
  }

  // 5. Jos' eigen regel: geen lange streepjes in wat een klant leest
  assert.ok(!pagina.includes("—"), `${slug} bevat een lang streepje`);
}

console.log(`branchepaginas: ok (${slugs.length} pagina's)`);
