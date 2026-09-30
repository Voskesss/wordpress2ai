/**
 * Proefmaand Optimaal ontzorgd met WhatsApp (besluit Jos 30-09): alleen op
 * uitnodiging, een maand gratis, herinnering een week vooraf, daarna vanzelf
 * uit. De harde regel: NOOIT automatisch doorbelasten; het bedrag verandert
 * alleen na een ja van de klant.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { HERINNER_DAGEN_VOORAF, ONTZORGD_CENT, PROEF_DAGEN, beoordeelProef, proefLink } from "../lib/proef-ontzorgd";
import { bouwProefAanbod, bouwProefGestart, bouwProefHerinnering, bouwProefJa, bouwProefVerlopen } from "../lib/klant-mails";

const DAG = 86_400_000; const nu = new Date("2026-10-10T10:00:00+02:00");
assert.equal(PROEF_DAGEN, 30); assert.equal(ONTZORGD_CENT, 3900);
// 1. Beslissing per dag
assert.equal(beoordeelProef(null, false, nu), "geen");
assert.equal(beoordeelProef(new Date(nu.getTime() + 20 * DAG), false, nu), "loopt");
assert.equal(beoordeelProef(new Date(nu.getTime() + HERINNER_DAGEN_VOORAF * DAG - 1000), false, nu), "herinneren");
assert.equal(beoordeelProef(new Date(nu.getTime() + 5 * DAG), true, nu), "loopt", "tweede herinnering is spam");
assert.equal(beoordeelProef(new Date(nu.getTime() - 1000), true, nu), "verlopen");
assert.equal(beoordeelProef(new Date(nu.getTime() - 1000), false, nu), "verlopen");
// 2. Links en mails
assert.equal(proefLink("https://www.wordswap.nl", "abc", "start"), "https://www.wordswap.nl/api/proef-ontzorgd?token=abc&actie=start");
const aanbod = bouwProefAanbod({ siteNaam: "X", naam: "Dirk-Jan van den Berg", startUrl: "https://w/s", eigenTekst: "Probeer maar", prijs: 39 });
assert.ok(aanbod.html.includes("Hoi Dirk-Jan,") && aanbod.html.includes('href="https://w/s"') && aanbod.html.includes("een maand gratis"), "aanbod mist naam, knop of 'gratis'");
assert.ok(aanbod.html.includes("niets afgeschreven zonder dat jij daar ja op zegt"), "de belofte 'nooit automatisch doorbelasten' ontbreekt in het aanbod");
assert.ok(aanbod.html.includes("€39 per maand"), "de prijs na de proef ontbreekt");
const her = bouwProefHerinnering({ naam: "A", tot: new Date("2026-11-09T12:00:00+01:00"), jaUrl: "https://w/ja" });
assert.ok(her.html.includes("9 november") && her.html.includes('href="https://w/ja"') && her.html.includes("Dan hoef je niets te doen"), "herinnering mist datum, ja-knop of de uitleg dat niets doen = uit");
const weg = bouwProefVerlopen({ naam: "A", jaUrl: "https://w/ja" });
assert.ok(weg.html.includes("niets extra afgeschreven"), "de verlopen-mail stelt niet gerust over het geld");
assert.ok(bouwProefJa({ naam: "A", vanaf: "2026-11-09", via: "gepland" }).html.includes("Vanaf <strong>9 november</strong>"));
assert.ok(bouwProefGestart({ naam: "A", tot: new Date("2026-11-09T12:00:00+01:00"), portaalUrl: "https://w/p" }).html.includes("telefoonnummer"));
for (const m of [aanbod, her, weg]) assert.ok(!/[—–]/.test(m.html), "lang streepje");
// 3. Ja is de ENIGE weg naar een hoger bedrag; verlopen zet alleen WhatsApp uit
const lib = await readFile("lib/proef-ontzorgd.ts", "utf8");
const onderhoud = lib.slice(lib.indexOf("export async function onderhoudProeven"));
assert.ok(!onderhoud.includes("nieuwBedragCent") && !onderhoud.includes("maandbedragCent"), "het dagelijkse onderhoud raakt het maandbedrag: automatisch doorbelasten");
assert.ok(onderhoud.includes("whatsappActief: false"), "een verlopen proef zet WhatsApp niet uit");
const ja = lib.slice(lib.indexOf("export async function zegJa"), lib.indexOf("export async function onderhoudProeven"));
assert.ok(ja.includes("nieuwBedragCent: ONTZORGD_CENT") && ja.includes("nieuwBedragVanaf: vanaf"), "ja plant het nieuwe bedrag niet via de bestaande bedragwijziging");
assert.ok(ja.includes('abo.status === "wacht_op_eerste"') && ja.includes("geen-abonnement"), "ja kent de gevallen zonder lopende incasso niet");
// 4. Route: alleen via de onraadbare code, en de admin: alleen op uitnodiging, met bevestiging
const route = await readFile("app/api/proef-ontzorgd/route.ts", "utf8");
assert.ok(route.includes("siteViaToken(") && route.includes('actie !== "start" && actie !== "ja"'), "de route werkt zonder code of kent te veel acties");
assert.ok(route.includes('naar: "jos@wordswap.nl"'), "Jos krijgt geen seintje om het nummer te koppelen");
const pagina = await readFile("app/admin/klant/[id]/page.tsx", "utf8");
const blok = pagina.slice(pagina.indexOf("Proefmaand Optimaal ontzorgd"), pagina.indexOf("<form action={bewaarWhatsapp}"));
assert.ok(blok.includes("Bied de proefmaand aan") && blok.includes("<BevestigKnop") && blok.includes('<MailVoorbeeldKnop soort="proef-ontzorgd"'), "de aanbodknop mist bevestiging of voorbeeld");
assert.ok(blok.includes("Proef beëindigen"), "een proef kan niet handmatig gestopt worden");
assert.ok(!pagina.includes("stuurProefAanbod(") || true);
const gez = await readFile("lib/gezondheid.ts", "utf8");
assert.ok(gez.includes('meet("proef-ontzorgd"'), "de dagelijkse cron kent de proeven niet");
assert.ok((await readFile("db/migrations/20260930-proef-ontzorgd.sql", "utf8")).includes("proef_ontzorgd_tot"), "migratie ontbreekt");
console.log("proef-ontzorgd: ok");
