/** Mail via de eigen mailserver van een klant kwam bij Hotmail in de spam
 * (SCL 5) terwijl SPF, DKIM en DMARC pass waren. Nodemailer meldde zich met
 * het interne 169.254-adres van de Vercel-functie als HELO, en de testmail was
 * alleen text/plain. Deze test bewaakt: HELO-naam op elke verbinding, en
 * tekst + html op de testmail en de bevestigingsmails.
 * Draaien: node --import tsx tests/smtp-helo.mts */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { heloNaam, tekstVanHtml } from "../lib/smtp";

// 1. HELO-naam: sitedomein, anders domein van het afzendadres, anders wordswap.nl
assert.equal(heloNaam({ domein: "vandenbergmediation.nl", gebruiker: "info@vandenbergmediation.nl" }), "vandenbergmediation.nl");
assert.equal(heloNaam({ domein: "https://www.voorbeeld.nl/", gebruiker: "x@y.nl" }), "voorbeeld.nl");
assert.equal(heloNaam({ domein: "site.wordswap.workers.dev", gebruiker: "info@klant.nl" }), "klant.nl");
assert.equal(heloNaam({ domein: null, afzender: "Noreply@Klant.NL", gebruiker: "login" }), "klant.nl");
assert.equal(heloNaam({ domein: null, gebruiker: "login" }), "wordswap.nl");

// 2. Elke verbinding krijgt die naam mee, en versturen gebruikt dezelfde verbinding als de testknop
const smtp = await readFile("lib/smtp.ts", "utf8");
assert.ok(/name: heloNaam\(g\)/.test(smtp), "maakTransport geeft geen HELO-naam mee");
const mail = await readFile("lib/mail.ts", "utf8");
assert.ok(!mail.includes("createTransport("), "lib/mail.ts maakt nog een eigen verbinding buiten maakTransport om");
assert.ok(mail.includes("await maakTransport({") && mail.includes("domein: site.domein"), "versturen geeft het sitedomein niet door");

// 3. Multipart: testmail en bevestigingsmails hebben tekst én html
const testBlok = smtp.slice(smtp.indexOf("export async function testSmtp"));
assert.ok(/text: \[aanhef/.test(testBlok) && /\n\s+html,\n/.test(testBlok), "testmail is niet tekst + html");
assert.ok(mail.includes("text: tekstVanHtml(html)"), "bevestigingsmail via eigen server heeft geen tekstversie");
for (const p of ["app/portal/acties.ts", "app/admin/acties.ts"])
  assert.ok((await readFile(p, "utf8")).includes("domein: site.domein"), `${p} geeft het domein niet door aan de testknop`);

// 4. De tekstversie is leesbaar
const tekst = tekstVanHtml(`<div><p>Hallo Dirk-Jan,</p><p>Je bericht is <b>ontvangen</b>.<br>Tot snel.</p><p><a href="https://voorbeeld.nl/">Bekijk</a></p></div>`);
assert.equal(tekst, "Hallo Dirk-Jan,\n\nJe bericht is ontvangen.\nTot snel.\n\nBekijk (https://voorbeeld.nl/)");
console.log("✓ HELO-naam en multipart op de eigen mailserver");

// 5. Ook onze eigen mail via Resend gaat als tekst + html: klantmails,
//    mails van Jos, outreach, webinarmails en losse mails.
for (const [p, aantal] of [
  ["lib/mail.ts", 2],
  ["lib/wordswap-mail.ts", 1],
  ["app/admin/acties.ts", 2],
  ["app/api/admin/mail-versturen/route.ts", 1],
] as [string, number][]) {
  const n = (await readFile(p, "utf8")).match(/text: tekstVanHtml\(/g)?.length ?? 0;
  assert.equal(n, aantal, `${p}: ${n} mails met tekstversie, verwacht ${aantal}`);
}
console.log("✓ eigen mail via Resend heeft ook een tekstversie");
