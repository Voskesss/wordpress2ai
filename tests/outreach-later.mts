import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * Wegzetten zat achter "Bewerken / status wijzigen", en dan doe je het niet:
 * je scrolt door en laat het bedrijf staan tussen de kandidaten. Nu staan de
 * twee handelingen die je tijdens het langslopen doet in het overzicht zelf.
 *
 * "Later bekijken" is er bijgekomen voor wat nu niet interessant genoeg is
 * maar wel blijft bestaan, zoals een fotograaf met een nette site. Dat is iets
 * anders dan niet-mailen, want dat is definitief en niet te wissen.
 */

const pagina = await readFile(new URL("../app/admin/outreach/page.tsx", import.meta.url), "utf8");
const acties = await readFile(new URL("../app/admin/acties.ts", import.meta.url), "utf8");

// 1. Beide knoppen staan op de kaart zelf, niet in een uitklapvak
const kaart = pagina.slice(pagina.indexOf("Meteen wegzetten vanuit het overzicht"), pagina.indexOf("{mailBaar && ("));
assert.ok(kaart.includes('value="later"'), "de knop Later staat niet in het overzicht");
assert.ok(kaart.includes('value="niet_mailen"'), "de knop Niet mailen staat niet in het overzicht");
assert.ok(kaart.includes("action={prospectBijwerken}"), "de knoppen doen niets");

// 2. Allebei met uitleg, want de gevolgen verschillen nogal
assert.ok((kaart.match(/title="/g) ?? []).length === 2, "niet beide knoppen leggen uit wat ze doen");
assert.ok(/niet te wissen/.test(kaart), "bij Niet mailen staat niet dat het definitief is");

// 3. Niet tonen waar ze niets doen of schade aanrichten
assert.ok(
  kaart.includes('!["niet_mailen", "later", "klant"].includes(p.status)'),
  "de knoppen staan ook bij een klant of bij wie al weggezet is",
);

// 4. "Later" heeft een eigen lijst, en valt buiten de gewone stroom
assert.ok(pagina.includes('later: (p) => p.status === "later"'), "er is geen aparte lijst voor later bekijken");
for (const filter of ["actie", "alles"]) {
  const regel = pagina.split("\n").find((r) => r.trimStart().startsWith(`${filter}: (p) =>`));
  assert.ok(regel?.includes('"later"'), `de ${filter}-lijst toont bedrijven die op later staan`);
}
assert.ok(pagina.includes('"Later bekijken"'), "het telvakje voor later bekijken ontbreekt");

// 5. En er gaat nooit post naartoe
const verstuur = acties.slice(acties.indexOf("export async function verstuurOutreach"));
const rem = verstuur.slice(0, verstuur.indexOf("api.resend.com"));
assert.ok(rem.includes('"later"'), "iemand op later bekijken kan alsnog een mail krijgen");

// 6. De status is ook met de hand te kiezen en weer terug te zetten
assert.ok(acties.includes('"niet_mailen", "later", UITGESLOTEN_STATUS].includes(status)'), "later is geen geldige status");
assert.ok(pagina.includes('<option value="later">later bekijken</option>'), "later staat niet in het keuzemenu");

console.log("outreach-later: ok");
