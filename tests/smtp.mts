import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { leesFout, testSmtp } from "../lib/smtp";

/**
 * Een eigen mailserver kan stil stoppen met werken: wachtwoord gewijzigd,
 * mailbox vol, host verhuisd. De mail komt dan nog steeds aan, maar via
 * no-reply@wordswap.nl in plaats van de klant zelf. Er gaat niets kapot, dus
 * niemand merkt het. Deze test bewaakt dat we het wél merken.
 */

// 1. Kale serverfouten worden begrijpelijke zinnen, met de oorzaak erbij
const gevallen: [string, RegExp][] = [
  ["Invalid login: 535 Authentication failed", /wachtwoord/i],
  ["getaddrinfo ENOTFOUND smtp.typfout.nl", /servernaam bestaat niet/i],
  ["connect ECONNREFUSED 1.2.3.4:465", /poort/i],
  ["self signed certificate in certificate chain", /certificaat/i],
  ["552 Mailbox quota exceeded", /vol/i],
];
for (const [ruw, verwacht] of gevallen)
  assert.match(leesFout(new Error(ruw)), verwacht, `onbegrijpelijk gebleven: ${ruw}`);

// De meest voorkomende oorzaak noemt de meest voorkomende aanleiding
assert.match(leesFout(new Error("535 auth failed")), /gewijzigd/i, "noem dat het wachtwoord gewijzigd kan zijn");

// 2. Een onbekende fout gaat niet verloren, maar wordt wel ingekort
const lang = leesFout(new Error("x".repeat(1000)));
assert.ok(lang.length <= 300, "onbekende fout moet ingekort worden");
assert.ok(lang.length > 0, "onbekende fout mag niet verdwijnen");

// 3. Een onbereikbare server levert een nette uitslag in plaats van een crash
const uit = await testSmtp({
  host: "smtp.bestaat-echt-niet-wordswap.invalid",
  poort: 465,
  gebruiker: "test@example.com",
  wachtwoord: "geheim",
});
assert.equal(uit.ok, false);
assert.ok(!uit.ok && uit.uitleg.length > 0, "een mislukte test hoort uit te leggen waarom");

// 4. De verzendroute legt een storing vast in plaats van alleen te loggen
const mail = await readFile(new URL("../lib/mail.ts", import.meta.url), "utf8");
assert.ok(mail.includes("noteerSmtpStoring"), "storing wordt niet vastgelegd");
assert.ok(mail.includes("wisSmtpStoring"), "een herstelde server blijft als kapot gemeld staan");
assert.ok(/STORING_HERHAAL_MS/.test(mail), "zonder rem komt er een mail bij elke verzending");
assert.ok(mail.includes("info@wordswap.nl"), "er gaat geen melding naar ons toe");

// 5. Het wachtwoord mag nooit in een melding belanden
assert.ok(!leesFout(new Error("Invalid login: user=x pass=geheim123")).includes("geheim123") ||
  leesFout(new Error("Invalid login: user=x pass=geheim123")).includes("wachtwoord klopt niet"),
  "inloggegevens horen niet in een melding terecht te komen");

// 6. De kolommen bestaan in het schema én er is een migratie voor
const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
assert.ok(schema.includes("smtpFoutOp") && schema.includes("smtpFoutTekst"), "kolommen ontbreken in het schema");
const migratie = await readFile(new URL("../db/migrations/20260921-smtp-storing.sql", import.meta.url), "utf8");
assert.ok(/smtp_fout_op/.test(migratie) && /smtp_fout_tekst/.test(migratie), "migratie mist een kolom");
assert.ok(/IF NOT EXISTS/i.test(migratie), "migratie moet opnieuw te draaien zijn");

console.log("smtp: ok");
