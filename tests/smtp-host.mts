/** Een servernaam met een punt erachter (uit een DNS-weergave geplakt) brak de
 * certificaatcontrole: nodemailer gebruikt de naam letterlijk en het certificaat
 * matcht niet. Van den Berg Mediation, 30-09-2026. De helper maakt de naam
 * schoon bij opslaan én bij versturen, zodat al opgeslagen waarden ook werken.
 * Draaien: node --import tsx tests/smtp-host.mts */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { schoneSmtpHost } from "../lib/smtp";

const gevallen: [string | null, string][] = [
  ["mail.vandenbergmediation.nl.", "mail.vandenbergmediation.nl"],
  ["  Mail.Voorbeeld.NL  ", "mail.voorbeeld.nl"],
  ["smtp://smtp.voorbeeld.nl", "smtp.voorbeeld.nl"],
  ["ssl://smtp.voorbeeld.nl:465", "smtp.voorbeeld.nl"],
  ["https://smtp.voorbeeld.nl/webmail", "smtp.voorbeeld.nl"],
  ["smtp.voorbeeld.nl:587", "smtp.voorbeeld.nl"],
  ["smtp.voorbeeld.nl..", "smtp.voorbeeld.nl"],
  ["", ""],
  [null, ""],
];
for (const [in_, uit] of gevallen) assert.equal(schoneSmtpHost(in_), uit, `invoer ${JSON.stringify(in_)}`);

// De helper moet draaien bij opslaan (portaal en admin) en bij elke verbinding.
// Versturen (lib/mail.ts) loopt sinds 1.36.5 via maakTransport, die schoonmaakt.
for (const bestand of ["app/portal/acties.ts", "app/admin/acties.ts"]) {
  const tekst = await readFile(bestand, "utf8");
  assert.ok(tekst.includes("schoneSmtpHost("), `${bestand} maakt de servernaam niet schoon`);
}
const transport = await readFile("lib/smtp.ts", "utf8");
assert.ok(/host: schoneSmtpHost\(g\.host\)/.test(transport), "maakTransport maakt de servernaam niet schoon");
const mail = await readFile("lib/mail.ts", "utf8");
assert.ok(mail.includes("await maakTransport(") && !mail.includes("createTransport("), "lib/mail.ts verstuurt niet via maakTransport");
console.log("✓ servernaam wordt schoongemaakt");
