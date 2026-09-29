/**
 * Route B van de livegang (29-09): bewaakt de sloten rond het aanmelden.
 * Het echte traject is op 29-09 bewezen met proef.infacilities.nl; deze test
 * bewaakt wat in de code nooit mag wegvallen.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ONTVANGSTADRES, SAAS_ZONE, adressenVan, meldDomeinAan, regelsVoorHoster } from "../lib/route-b";

// 1. Een adres van wordswap.nl zelf mag nooit via de verdeler lopen
for (const d of ["wordswap.nl", "www.wordswap.nl", "clerk.wordswap.nl", "sites.wordswap.nl"]) {
  await assert.rejects(() => meldDomeinAan(d, "een-site"), /wordswap\.nl zelf/, `${d} kon worden aangemeld`);
}
// 2. Ongeldige domeinen en sites worden geweigerd vóór er iets bij Cloudflare gebeurt
await assert.rejects(() => meldDomeinAan("geen domein", "een-site"), /Geen geldige domeinnaam/);
await assert.rejects(() => meldDomeinAan("klant.wordswap.workers.dev", "een-site"), /Geen geldige domeinnaam/);
await assert.rejects(() => meldDomeinAan("klant.nl", "wv-klant"), /Ongeldige site/, "een concept (wv-) kon aan een domein worden gehangen");
await assert.rejects(() => meldDomeinAan("klant.nl", "../intern"), /Ongeldige site/);

// 3. Kaal en www horen bij elkaar, en de hoster krijgt precies die twee regels
assert.deepEqual(adressenVan("klant.nl"), ["klant.nl", "www.klant.nl"]);
const regels = regelsVoorHoster("https://www.Klant.nl/");
assert.deepEqual(regels.map((r) => `${r.soort} ${r.naam} ${r.waarde}`), [`CNAME klant.nl ${ONTVANGSTADRES}`, `CNAME www.klant.nl ${ONTVANGSTADRES}`]);
assert.ok(ONTVANGSTADRES.endsWith(`.${SAAS_ZONE}`));

// 4. Nooit een vangnet-route: alleen routes per aangemeld adres
const bron = await readFile("lib/route-b.ts", "utf8");
assert.ok(!/pattern:\s*["'`]\*/.test(bron) && !bron.includes('"*/*"'), "er staat een vangnet-route in: die kan wordswap.nl zelf kapen");
assert.ok(bron.includes("const patroon = `${adres}/*`"), "de route per adres ontbreekt");

console.log("route-b: ok");
