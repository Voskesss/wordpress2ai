/** Formulieren van klantsites posten naar ons systeem op wordswap.nl. Een
 * verkort pad ("/api/formulier") komt bij de site van de klant zelf terecht,
 * die geen formulieren kan verwerken: de bezoeker krijgt dan "methode niet
 * toegestaan" en de aanvraag is weg. Deze test bewaakt dat elke plek waar wij
 * een formulier laten bouwen het volledige adres voorschrijft.
 * Draaien: node --import tsx tests/formulier-adres.mts */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bronnen = [
  "lib/huisregels.ts", // regels voor de chat-AI op klantsites
  "lib/bouw.ts", // bouwer bij een migratie
  ".claude/skills/migreer-klant/SKILL.md", // handmatige migratie
];

for (const bron of bronnen) {
  const tekst = await readFile(bron, "utf8");
  if (!tekst.includes("api/formulier")) continue;
  assert.ok(
    tekst.includes("https://wordswap.nl/api/formulier"),
    `${bron} moet het volledige adres voorschrijven`,
  );
  assert.ok(
    !/action="\/api\/formulier"/.test(tekst),
    `${bron} schrijft een verkort formulieradres voor — dat geeft bezoekers een foutmelding`,
  );
  assert.ok(
    !/action="https:\/\/[^"]*vercel\.app\/api\/formulier"/.test(tekst),
    `${bron} wijst naar een tijdelijk adres in plaats van wordswap.nl`,
  );
}

console.log(
  `PASS: alle ${bronnen.length} plekken schrijven het volledige formulieradres voor (geen verkort pad, geen tijdelijk adres).`,
);
