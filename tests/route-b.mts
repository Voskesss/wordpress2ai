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
// www eerst: dat is de volgorde die bij aimia.nl werkte, en de veilige stap
assert.deepEqual(regels.map((r) => `${r.soort} ${r.naam} ${r.waarde}`), [`CNAME www.klant.nl ${ONTVANGSTADRES}`, `CNAME of ALIAS klant.nl ${ONTVANGSTADRES}`]);
assert.ok(regels.every((r) => r.uitleg.includes("A-regel")), "de les van aimia.nl (eerst de A-regel weg) staat niet in de uitleg");
assert.ok(ONTVANGSTADRES.endsWith(`.${SAAS_ZONE}`));

// 4. Nooit een vangnet-route: alleen routes per aangemeld adres
const bron = await readFile("lib/route-b.ts", "utf8");
assert.ok(!/pattern:\s*["'`]\*/.test(bron) && !bron.includes('"*/*"'), "er staat een vangnet-route in: die kan wordswap.nl zelf kapen");
assert.ok(bron.includes("const patroon = `${adres}/*`"), "de route per adres ontbreekt");


// 5. De knop in de admin: aanmelden en afmelden alleen voor beheerders, en
//    afmelden raakt alleen een domein dat echt bij DEZE site hoort
const acties = await readFile("app/admin/acties-route-b.ts", "utf8");
assert.equal((acties.match(/await requireAdmin\(\);/g) ?? []).length, 2, "een actie van route B mist de beheerderscontrole");
assert.ok(acties.includes("slugVan((await leesDomeinkaart())[domein]) === site.siteSlug"), "afmelden kan het domein van een andere site weghalen");
assert.ok(acties.includes("hoofdBinding(site)"), "aanmelden geeft het hoofdadres niet door");
const blok = await readFile("app/admin/klant/[id]/RouteBBlok.tsx", "utf8");
assert.ok(blok.includes("<BevestigKnop") && blok.includes("afmelden?"), "afmelden vraagt geen bevestiging");
assert.ok(blok.includes("Alles voor de mail blijft staan"), "de geruststelling over de mail ontbreekt bij de regels");
const pagina = await readFile("app/admin/klant/[id]/page.tsx", "utf8");
assert.ok(pagina.includes("<RouteBBlok site={site}"), "het blok staat niet op de klantpagina");

// 6. Livegang telt een domein via route B als gekoppeld, en het dashboard bewaakt het
const livegang = await readFile("lib/livegang.ts", "utf8");
assert.ok(livegang.includes("routeBDomeinenVan(siteSlug)"), "de livegang-controle kent route B niet en blijft klagen dat het domein niet gekoppeld is");
const gezondheid = await readFile("lib/gezondheid.ts", "utf8");
assert.ok(gezondheid.includes('meet("route-b"') && gezondheid.includes('meet("eigen-dns"'), "het gezondheidsdashboard bewaakt route B of de eigen adressen niet");

console.log("route-b: ok");
