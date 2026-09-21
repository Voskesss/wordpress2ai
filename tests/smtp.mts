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



// --- Het portaalblok: de klant stelt zijn eigen mailbox in
const acties = await readFile(new URL("../app/portal/acties.ts", import.meta.url), "utf8");
const blok = await readFile(new URL("../app/portal/EigenMailserver.tsx", import.meta.url), "utf8");

// 7. Alleen de eigenaar: zonder deze controle kan iedereen met een siteId de
//    mailinstellingen van een andere klant overschrijven
for (const fn of ["bewaarEigenMailserver", "testEigenMailserver"]) {
  const lichaam = acties.slice(acties.indexOf(`export async function ${fn}`));
  const eind = lichaam.indexOf("\nexport async function", 10);
  const stuk = eind > 0 ? lichaam.slice(0, eind) : lichaam;
  assert.ok(/eigenSite\(/.test(stuk), `${fn} controleert niet of dit jouw site is`);
  assert.ok(/if \(!site/.test(stuk), `${fn} gaat door zonder site`);
}

// 8. Het wachtwoord wordt versleuteld opgeslagen en nooit teruggetoond
assert.ok(acties.includes("versleutel(wachtwoord)"), "wachtwoord wordt niet versleuteld");
assert.ok(
  /\.\.\.\(wachtwoord \? \{ smtpWachtwoord/.test(acties),
  "een leeg wachtwoordveld hoort het bestaande wachtwoord te laten staan",
);
assert.ok(!/name="wachtwoord"[^>]*defaultValue/.test(blok), "wachtwoord mag niet terug op het scherm komen");
assert.ok(/name="wachtwoord"[\s\S]{0,120}type="password"/.test(blok), "wachtwoordveld hoort verborgen te typen");

// 9. Host leegmaken zet ook de storingsmelding terug: anders blijft er een rood
//    blok staan voor een server die niet meer gebruikt wordt
const leegmaken = acties.slice(acties.indexOf("export async function bewaarEigenMailserver"));
assert.ok(/smtpFoutOp: null/.test(leegmaken.slice(0, leegmaken.indexOf("versleutel"))), "storingsmelding blijft staan na leegmaken");

// 10. De testknop staat in hetzelfde blok. Zonder testen vult iemand iets
//     verkeerds in, ziet niets, en denkt dat het goed staat
assert.ok(blok.includes("testEigenMailserver"), "geen testknop in het portaalblok");
assert.ok(/Uitproberen/.test(blok), "de testknop hoort herkenbaar te heten");

// 11. Eerlijk over de gevolgen bij een storing: de bezoeker merkt niets, en dat
//     is juist waarom het uitgelegd moet worden
assert.ok(/bezoekers merken hier niets van/i.test(blok), "leg uit dat een storing onzichtbaar is voor bezoekers");

// 12. Geen lange streepjes in wat de klant leest
assert.ok(!blok.includes("—"), "lang streepje in het portaalblok");


// --- De waas over het formulier (21-09-2026)
// Jos: een openliggend formulier nodigt uit tot invullen, en juist hier merk
// je een fout niet: je mail blijft aankomen, alleen niet meer vanaf jezelf.
const waas = await readFile(new URL("../app/portal/AchterWaas.tsx", import.meta.url), "utf8");
const blok2 = await readFile(new URL("../app/portal/EigenMailserver.tsx", import.meta.url), "utf8");

// 13. Het formulier zit achter een bewuste klik
assert.ok(blok2.includes("<AchterWaas"), "het formulier ligt open en bloot");
assert.match(blok2, /knop="Ja, ik wijzig mijn mailserver zelf"/, "de knop zegt niet wat je gaat doen");
assert.match(blok2, /neem dan even\s+contact met ons op/, "de uitweg naar ons ontbreekt");

// 14. De status blijft wél altijd zichtbaar: dat is informatie, geen bediening
const voorWaas = blok2.slice(0, blok2.indexOf("<AchterWaas"));
assert.ok(/smtpFoutOp && \(/.test(voorWaas), "de storingsmelding hoort boven de waas te staan");

// 15. Wat achter de waas zit is echt onbereikbaar, ook met het toetsenbord
assert.ok(waas.includes("pointer-events-none"), "met de muis nog bereikbaar");
assert.ok(/\binert\b/.test(waas), "met de tab-toets beland je in een onzichtbaar formulier");
assert.ok(waas.includes("aria-hidden"), "een schermlezer leest het verborgen formulier voor");

// 16. Geen slot, alleen een drempel: wie het weet mag het gewoon doen. Dus
//     één klik en je bent erdoor, geen veld om iets in te typen.
const code = waas.slice(waas.indexOf("export default"));
assert.ok(!/<input/.test(code), "de waas hoort geen invoerveld te hebben, het is een drempel en geen deur");
assert.equal((code.match(/<button/g) ?? []).length, 1, "één knop, meer niet");
assert.ok(/useState\(false\)/.test(code), "de waas hoort dicht te beginnen");
console.log("smtp: ok");
