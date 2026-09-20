/**
 * Test de koppeling met Werk aan de Muur met de sleutel van een kunstenaar.
 * Draaien zodra een klant zijn Artist ID en API-sleutel heeft aangeleverd:
 *
 *   WADM_ARTIST_ID=12345 WADM_API_KEY=xxxx npx tsx scripts/wadm-test.mts
 *
 * Optioneel: WADM_SITE=https://klant.nl (wordt als Referer meegestuurd).
 * Schrijft niets weg en verandert niets — alleen kijken of het werkt.
 */

import { grootsteBeeld, haalWerkenPagina, sessieCookie, vandaagNl } from "../lib/werkaandemuur";

const artistId = process.env.WADM_ARTIST_ID;
const apiKey = process.env.WADM_API_KEY;
if (!artistId || !apiKey) {
  console.error("Zet WADM_ARTIST_ID en WADM_API_KEY in de omgeving (niet in een bestand dat gecommit wordt).");
  process.exit(1);
}
const gegevens = { artistId, apiKey, siteUrl: process.env.WADM_SITE };

console.log(`Artist ID ${artistId}, sleutel ${apiKey.slice(0, 3)}… (${apiKey.length} tekens)`);
console.log(`Sessiecookie van vandaag (${vandaagNl()}): ${(await sessieCookie(gegevens, vandaagNl())).slice(0, 8)}…\n`);

try {
  const begin = Date.now();
  const { werken, ruw } = await haalWerkenPagina(gegevens, 1, 24);
  console.log(`✓ Verbinding en aanmelden gelukt in ${Date.now() - begin} ms`);
  console.log(`  Velden in het antwoord: ${Object.keys(ruw as object).join(", ")}`);
  console.log(`  Werken op pagina 1: ${werken.length}\n`);

  for (const w of werken.slice(0, 3)) {
    const maten = Object.keys(w.beelden);
    console.log(`  • ${w.titel}`);
    console.log(`    kooplink: ${w.link}`);
    console.log(`    beeldmaten: ${maten.join(", ") || "(geen)"}`);
    console.log(`    grootste:  ${grootsteBeeld(w.beelden) ?? "(geen)"}`);
  }

  const tweede = await haalWerkenPagina(gegevens, 2, 24).catch(() => null);
  console.log(`\n  Pagina 2: ${tweede ? `${tweede.werken.length} werken — paginering werkt` : "niet opgehaald"}`);
  console.log("\nKlaar. Werkt dit, dan kan een cron de werken periodiek ophalen en er statische pagina's van maken.");
} catch (e) {
  console.error(`✗ Mislukt: ${e instanceof Error ? e.message : String(e)}`);
  console.error("  Controleer Artist ID en sleutel in het Werk aan de Muur-dashboard (plugin-pagina).");
  process.exit(1);
}
