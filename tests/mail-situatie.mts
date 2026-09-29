/**
 * Mail bij een overstap (afspraak Jos 29-09): vaste situaties en prijzen bij
 * de eerste check, zodat de mail nooit pas opduikt als de site al klaar is.
 * De gevallen hieronder zijn de echte van die week: Van den Berg (mail op
 * dezelfde server als de site), EVC Autotechniek (Microsoft 365) en
 * EVC Professionals (mail bij SiteGround, andere machine dan de site).
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { MAIL_REGELS, leverancierMail, mailScenario, mailSituatie } from "../lib/mail-situatie";

// 1. Van den Berg: mail bij de hoster, op dezelfde server als de website
const vdb = mailSituatie(["mail.vandenbergmediation.nl"]);
assert.equal(vdb.code, "hoster");
const vdbScenario = mailScenario({ code: vdb.code, mailIps: ["185.63.153.43"], siteIps: ["185.63.153.43"] });
assert.equal(vdbScenario.situatie, "bij-hoster");
assert.equal(vdbScenario.zelfdeServer, true, "mail op dezelfde server als de site wordt niet herkend");
assert.ok(vdbScenario.waarschuwing?.includes("pas worden opgezegd"), "de waarschuwing over opzeggen ontbreekt");
assert.ok(vdbScenario.prijs.includes("€75") && vdbScenario.prijs.includes("€25"), "de afgesproken prijzen (75 en 25) staan er niet in");

// 2. EVC Professionals: mail bij de hoster, maar op een andere machine
const evcp = mailScenario({ code: mailSituatie(["mx10.antispam.mailspamprotection.com"]).code, mailIps: ["35.214.1.1"], siteIps: ["35.214.190.219"] });
assert.equal(evcp.situatie, "bij-hoster");
assert.equal(evcp.zelfdeServer, false, "andere machine wordt ten onrechte als dezelfde server gezien");
assert.ok(evcp.waarschuwing?.includes("Vraag het na"), "zonder zichtbare overlap hoort er toch een waarschuwing te staan: de mail kan achter een spamfilter bij hetzelfde pakket horen");

// 3. EVC Autotechniek: Microsoft 365, niets te verhuizen en geen meerprijs
const evca = mailSituatie(["evcautotechniek-nl0i.mail.protection.outlook.com"]);
assert.equal(evca.code, "microsoft");
const los = mailScenario({ code: evca.code, mailIps: ["52.1.1.1"], siteIps: ["52.1.1.1"] });
assert.equal(los.situatie, "los");
assert.ok(/inbegrepen/i.test(los.prijs) && !los.prijs.includes("€"), "bij losse mail hoort geen bedrag te staan");
assert.equal(los.zelfdeServer, false, "bij Microsoft 365 is 'zelfde server' onzin");

// 4. Geen mail en alleen doorsturen
assert.equal(mailScenario({ code: mailSituatie([]).code, mailIps: [], siteIps: ["1.1.1.1"] }).situatie, "geen");
assert.equal(mailScenario({ code: mailSituatie(["mx1.improvmx.com"]).code, mailIps: [], siteIps: [] }).situatie, "doorsturen");

// 5. De mail voor de huidige leverancier: van de klant, met domein, zonder lange streepjes
const mail = leverancierMail({ domein: "voorbeeld.nl" });
assert.ok(mail.tekst.includes("voorbeeld.nl"), "het domein staat niet in de mail");
assert.ok(mail.tekst.includes("nameservers") && mail.tekst.includes("DNS-regels"), "de twee verzoeken ontbreken");
assert.ok(mail.tekst.includes("Wat wordt dan mijn nieuwe bedrag"), "de vraag naar het nieuwe bedrag ontbreekt");
assert.ok(!/[—–]/.test(mail.tekst + mail.onderwerp), "er staat een lang streepje in de mail");
assert.ok(!/verhuiz(en|ing) naar Soverin|weg bij/i.test(mail.tekst), "de mail verklapt de uitwijkroute aan de leverancier");
assert.equal(MAIL_REGELS.length, 5);
assert.ok(MAIL_REGELS[0].includes("licht zijn huidige leverancier zelf in"), "regel 1 (klant licht leverancier in) ontbreekt");

// 6. De route gebruikt deze lib (één waarheid) en kijkt naar de machine van de mail
const route = await readFile("app/api/admin/intake-check/route.ts", "utf8");
assert.ok(route.includes('from "@/lib/mail-situatie"') && !route.includes("function mailSituatie("), "de route heeft weer een eigen kopie van de mailregels");
assert.ok(route.includes("mailScenario({ code: mail.code, mailIps"), "de route bepaalt het scenario niet");

// 7. Vanaf de leadkaart in één klik naar de check, die dan vanzelf start
const lijst = await readFile("app/admin/leads/LeadLijst.tsx", "utf8");
assert.ok(lijst.includes("/admin/intake?domein=${encodeURIComponent(lead.website)}"), "de mailcheck-link ontbreekt op de leadkaart");
const scherm = await readFile("app/admin/intake/IntakeCheck.tsx", "utf8");
assert.ok(scherm.includes("if (startDomein) formulier.current?.requestSubmit()"), "de check start niet vanzelf vanaf een leadkaart");

console.log("mail-situatie: ok");
