import assert from "node:assert/strict";
import {
  beoordeel,
  ipAfdruk,
  ipUitKoppen,
  veldenVoorMail,
  MAX_TEKENS_IN_MAIL,
  MAX_VELDEN_IN_MAIL,
  PER_IP_UUR,
  PER_SITE_UUR,
  TOTAAL_UUR,
} from "../lib/formulier-rem";

const rustig = { siteBestaat: true, perSite: 0, perIp: 0, totaal: 0 };

// Gewone inzending op een bekende site: opslaan en mailen
assert.deepEqual(beoordeel(rustig), {
  opslaan: true,
  mailen: true,
  reden: "ok",
});

// Onbekende sitecode: wél bewaren (nooit een aanvraag kwijtraken), niet mailen.
// Dit is de kern: anders kan iemand met een verzonnen code mail vanaf ons
// adres laten versturen, naar wie hij wil.
assert.deepEqual(beoordeel({ ...rustig, siteBestaat: false }), {
  opslaan: true,
  mailen: false,
  reden: "site-onbekend",
});

// Rem per site (zoals het altijd al was)
assert.equal(beoordeel({ ...rustig, perSite: PER_SITE_UUR - 1 }).opslaan, true);
assert.deepEqual(beoordeel({ ...rustig, perSite: PER_SITE_UUR }), {
  opslaan: false,
  mailen: false,
  reden: "te-veel-site",
});

// Rem per afzender: die telt over alle sites heen, dus een andere sitecode
// invullen helpt een spammer niet meer
assert.equal(beoordeel({ ...rustig, perIp: PER_IP_UUR - 1 }).opslaan, true);
assert.deepEqual(beoordeel({ ...rustig, perIp: PER_IP_UUR }), {
  opslaan: false,
  mailen: false,
  reden: "te-veel-ip",
});

// Geen afdruk bekend (geen sleutel ingesteld): het formulier blijft gewoon
// werken, alleen zonder die rem
assert.equal(beoordeel({ ...rustig, perIp: null }).opslaan, true);

// Noodrem over alles samen
assert.deepEqual(beoordeel({ ...rustig, totaal: TOTAAL_UUR }), {
  opslaan: false,
  mailen: false,
  reden: "te-veel-totaal",
});

// Een volle site wint van een onbekende site: niets opslaan, niets mailen
assert.deepEqual(
  beoordeel({ siteBestaat: false, perSite: PER_SITE_UUR, perIp: 0, totaal: 0 }),
  {
    opslaan: false,
    mailen: false,
    reden: "te-veel-site",
  },
);

// Adres uit de koppen: de eerste in de rij is de bezoeker
const koppen = new Headers({ "x-forwarded-for": "203.0.113.5, 70.41.3.18" });
assert.equal(ipUitKoppen(koppen), "203.0.113.5");
assert.equal(
  ipUitKoppen(new Headers({ "x-real-ip": "203.0.113.9" })),
  "203.0.113.9",
);
assert.equal(ipUitKoppen(new Headers()), null);

// Zonder sleutel geen afdruk — een vergeten instelling mag nooit inzendingen kosten
delete process.env.FORMULIER_IP_SALT;
assert.equal(ipAfdruk("203.0.113.5"), null);

// Met sleutel: steeds dezelfde afdruk, en niet het adres zelf
process.env.FORMULIER_IP_SALT = "test-sleutel";
const afdruk = ipAfdruk("203.0.113.5");
assert.equal(typeof afdruk, "string");
assert.equal(afdruk, ipAfdruk("203.0.113.5"));
assert.notEqual(afdruk, ipAfdruk("203.0.113.6"));
assert.equal(afdruk!.includes("203.0.113.5"), false);
assert.equal(ipAfdruk(null), null);

// Velden in de mail: kort gehouden, het volledige bericht staat in het portaal
const kort = veldenVoorMail({ naam: "Jan", bericht: "Graag een offerte" });
assert.equal(kort.afgekapt, false);
assert.equal(kort.velden.length, 2);

const lang = veldenVoorMail({ naam: "Jan", bericht: "x".repeat(5000) });
assert.equal(lang.afgekapt, true);
assert.equal(lang.velden[1][1].length, MAX_TEKENS_IN_MAIL + 1); // plus het beletselteken

const veel = veldenVoorMail(
  Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`veld${i}`, "x"])),
);
assert.equal(veel.velden.length, MAX_VELDEN_IN_MAIL);
assert.equal(veel.afgekapt, true);

console.log("✓ formulier-rem");
