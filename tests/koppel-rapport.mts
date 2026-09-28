/**
 * Opleverrapport bij het koppelen (wens Jos 28-09, na Steijn Veen): bij het
 * aanmaken/koppelen van een klantaccount kan een pdf-opleverrapport mee als
 * bijlage in de koppelmail. Bewaakt: het veld staat in de formulieren, de
 * actie keurt het bestand VÓÓR er iets wordt aangemaakt, de mail noemt de
 * bijlage alleen als hij er echt is, en de body-limiet is verhoogd (anders
 * knalt elke upload boven 1 MB op de standaard server-action-grens).
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bouwOpleveringsMail, bouwToegangsMail } from "../lib/website-akkoord";

// 1. De mail noemt de bijlage alleen als er echt een meegaat
for (const bouw of [bouwOpleveringsMail, bouwToegangsMail]) {
  const met = bouw({ siteNaam: "Test BV", bekijkUrl: "https://x.nl", inlogUrl: "https://y.nl", bijlageNaam: "opleverrapport.pdf" });
  const zonder = bouw({ siteNaam: "Test BV", bekijkUrl: "https://x.nl", inlogUrl: "https://y.nl" });
  assert.ok(met.html.includes("In de bijlage") && met.html.includes("opleverrapport"), bouw.name + ": de bijlage-zin ontbreekt");
  assert.ok(!zonder.html.includes("In de bijlage"), bouw.name + ": de bijlage-zin staat er ook zonder bijlage");
}

// 2. De formulieren hebben het rapport-veld (hoofdformulier én opnieuw-sturen)
const pagina = await readFile("app/admin/klant/[id]/page.tsx", "utf8");
assert.equal((pagina.match(/name="rapport"/g) ?? []).length, 2, "het rapport-veld hoort in twee koppelformulieren te staan");
assert.ok(pagina.includes('accept=".pdf,application/pdf"'), "het rapport-veld beperkt niet tot pdf");
assert.ok(pagina.includes("rapport-geweigerd"), "de weigermelding voor een fout rapport ontbreekt op de pagina");

// 3. De actie keurt het bestand vóór het aanmaken/mailen en stuurt het mee
const acties = await readFile("app/admin/acties.ts", "utf8");
const fn = acties.slice(acties.indexOf("export async function koppelKlant"));
const koppel = fn.slice(0, fn.indexOf("\nexport async function", 1));
assert.ok(koppel.includes('formData.get("rapport")'), "koppelKlant leest het rapport niet");
assert.ok(koppel.includes("rapport-geweigerd"), "een fout rapport wordt niet geweigerd");
assert.ok(
  koppel.indexOf("rapport-geweigerd") < koppel.indexOf('clerk("/users"'),
  "de keuring komt pas ná het aanmaken van het account: een fout rapport laat dan een halve koppeling achter",
);
assert.ok(koppel.includes("10 * 1024 * 1024"), "de maat-rem van 10 MB ontbreekt");
assert.ok(koppel.includes("bijlagen: [rapport]"), "het rapport gaat niet als bijlage mee in de mail");
assert.ok(koppel.includes("bijlageNaam: rapport"), "de mailtekst weet niet dat er een bijlage meegaat");

// 4. De server-action-limiet is verhoogd (standaard 1 MB, dan faalt elke echte pdf)
const config = await readFile("next.config.ts", "utf8");
assert.ok(/bodySizeLimit:\s*"12mb"/.test(config), "de bodySizeLimit voor server actions is niet verhoogd");

console.log("koppel-rapport: ok");
