import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { APP_NUMMER, appBericht, appLink, toonZwevendeKnop } from "../lib/appen";
import { TELEFOON_LINK } from "../lib/persoonlijk";

/**
 * Appen vanaf de website.
 *
 * Twee dingen mogen hier nooit stuk. Het nummer moet kloppen, want een knop
 * die naar een leeg WhatsApp-scherm leidt is erger dan geen knop. En de
 * zwevende knop mag niet over de chat heen komen te staan: dat is precies de
 * fout die we op mobiel al een keer hebben moeten terugdraaien.
 */

// 1. wa.me wil alleen cijfers: geen plus, geen spaties.
assert.match(APP_NUMMER, /^[0-9]{10,15}$/, `Onbruikbaar nummer voor wa.me: ${APP_NUMMER}`);
assert.equal(APP_NUMMER, "31262340122", "het appnummer is niet het zakelijke nummer");
// En het blijft afgeleid van één bron, zodat het niet uit elkaar kan lopen.
assert.equal(APP_NUMMER, TELEFOON_LINK.replace(/[^0-9]/g, ""), "appnummer en telefoonnummer lopen uit elkaar");

// 2. De link is een geldige wa.me-link met een ingevuld bericht.
const link = appLink("/prijzen");
assert.ok(link.startsWith(`https://wa.me/${APP_NUMMER}?text=`), `onverwachte link: ${link}`);
assert.ok(decodeURIComponent(link).includes("prijzen"), "het bericht noemt de pagina niet");

// 3. Per pagina een eigen bericht: dat is de hele reden dat dit bestaat.
const paden = ["/prijzen", "/demo", "/website-kapsalon", "/website-hoveniersbedrijf", "/webinar"];
const berichten = paden.map(appBericht);
assert.equal(new Set(berichten).size, paden.length, "twee pagina's sturen hetzelfde bericht mee");
// Een onbekende pagina valt netjes terug.
assert.ok(appBericht("/iets-wat-niet-bestaat").length > 10, "geen terugvalbericht");

// 4. Geen lange streepjes in wat de bezoeker verstuurt.
for (const b of [...berichten, appBericht("/")]) {
  assert.ok(!b.includes("—"), `lang streepje in een appbericht: ${b}`);
}

// 5. De zwevende knop blijft weg waar al een chat staat.
for (const pad of ["/portal", "/portal/site/3", "/admin", "/admin/leads", "/demo", "/afspraak/abc123"]) {
  assert.equal(toonZwevendeKnop(pad), false, `de zwevende knop staat op ${pad} in de weg`);
}
for (const pad of ["/", "/prijzen", "/contact", "/website-kapsalon"]) {
  assert.equal(toonZwevendeKnop(pad), true, `de zwevende knop hoort wel op ${pad}`);
}

// 6. En hij hangt echt in de layout, anders ziet niemand hem.
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
assert.ok(layout.includes("<AppKnop />"), "de zwevende knop staat niet in de layout");
assert.ok(layout.includes("WhatsApp ↗"), "WhatsApp staat niet in de voettekst");

// 7. Geen externe widget: het moet een gewone link blijven, zonder script van
//    een derde partij, anders zit je alsnog in de cookiemelding.
const knop = await readFile(new URL("../app/AppKnop.tsx", import.meta.url), "utf8");
assert.ok(!/<script|src="https?:/.test(knop), "de appknop laadt iets van buiten");

console.log("appen: ok");
