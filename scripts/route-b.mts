/**
 * Route B van de livegang bedienen vanaf de opdrachtregel.
 *   npx tsx --env-file=.env.local scripts/route-b.mts inrichten
 *   npx tsx --env-file=.env.local scripts/route-b.mts aanmelden <domein> <site-slug>
 *   npx tsx --env-file=.env.local scripts/route-b.mts status <domein>
 *   npx tsx --env-file=.env.local scripts/route-b.mts afmelden <domein>
 */
import { ONTVANGSTADRES, leesDomeinkaart, meldDomeinAan, meldDomeinAf, regelsVoorHoster, statusVan, zorgOntvangstadres, zorgVerdeler } from "../lib/route-b";

const [actie, domein, slug] = process.argv.slice(2);
const toon = (s: Awaited<ReturnType<typeof statusVan>>) => {
  for (const x of s) {
    console.log(`${x.adres.padEnd(34)} adres: ${x.adresStatus.padEnd(16)} certificaat: ${x.certificaatStatus}`);
    for (const f of x.fouten) console.log(`   ⚠️ ${f}`);
  }
};
if (actie === "inrichten") {
  console.log("verdeler:", await zorgVerdeler());
  console.log(`ontvangstadres ${ONTVANGSTADRES}:`, await zorgOntvangstadres());
  console.log("domeinkaart:", JSON.stringify(await leesDomeinkaart()));
} else if (actie === "aanmelden" && domein && slug) {
  toon(await meldDomeinAan(domein, slug));
  console.log("\nRegels voor de hoster:");
  for (const r of regelsVoorHoster(domein)) console.log(`  ${r.soort}  ${r.naam}  →  ${r.waarde}`);
} else if (actie === "status" && domein) {
  toon(await statusVan(domein));
} else if (actie === "afmelden" && domein) {
  await meldDomeinAf(domein);
  console.log("afgemeld:", domein);
} else {
  console.log("Gebruik: inrichten | aanmelden <domein> <site-slug> | status <domein> | afmelden <domein>");
  process.exit(1);
}
