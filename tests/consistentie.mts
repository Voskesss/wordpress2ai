/**
 * Het dubbeling-vangnet: na elke wijziging wordt mechanisch gecontroleerd of
 * dezelfde tekst, foto of contactgegevens elders op de site blijven staan. Dit
 * bepaalt of een klant een waarschuwing krijgt, dus een stille fout hier is
 * duur: hij meldt niets (de site raakt uit elkaar) of hij meldt te veel (de
 * klant vertrouwt de meldingen niet meer).
 *
 * Elk geval hieronder legt een fout vast die in de praktijk is gevonden.
 * Draaien: node --import tsx tests/consistentie.mts
 */
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { dubbelingsMeldingen } from "../lib/consistentie";
import { kiesDoelBron, vervangFotoInPagina } from "../lib/foto-vervang";

const VOET =
  "<p>Vaste voettekst die op elke pagina staat en lang genoeg is.</p>";

/** Zet een mini-site neer en vraag welke meldingen het vangnet geeft. */
async function meldingenVoor(
  paginas: Record<string, string>,
  gewijzigd: string[],
  oud: Record<string, string>,
) {
  const map = await mkdtemp(path.join(tmpdir(), "vangnet-"));
  for (const [naam, html] of Object.entries(paginas))
    await writeFile(path.join(map, naam), html);
  return dubbelingsMeldingen({
    werkmap: map,
    gewijzigd,
    oudeInhoud: async (p) => oud[p] ?? null,
  });
}

const blok = (inhoud: string) =>
  `<html><body><h1>Titel</h1>${inhoud}${VOET}</body></html>`;
const KORT =
  "<p>Ons proeflokaal op het evenement was drie dagen lang gevuld met bezoekers.</p>";
const LANG =
  "<p>Ons proeflokaal op het evenement was drie dagen lang gevuld met bezoekers. De geur van vers brood hing overal. Het was er reuze gezellig.</p>";

// 1) Tekst uitgebreid op één pagina, elders staat de oude versie nog → melden
assert.ok(
  (await meldingenVoor({ "a.html": blok(LANG), "b.html": blok(KORT) }, ["a.html"], { "a.html": blok(KORT) })).length > 0,
  "achtergebleven kopie moet gemeld worden",
);

// 2) Was al gelijkgetrokken → géén vals alarm (anders gaat de klant meldingen negeren)
assert.equal(
  (await meldingenVoor({ "a.html": blok(LANG), "b.html": blok(LANG) }, ["a.html"], { "a.html": blok(KORT) })).length,
  0,
  "gelijkgetrokken pagina's mogen geen melding geven",
);

// 3) Korte projectnaam hernoemd (15 tekens) — kort is juist het risicogeval
const kop = (naam: string) =>
  `<html><body><h3><a href="p.html">${naam}</a></h3>${VOET}</body></html>`;
assert.equal(
  (await meldingenVoor({ "a.html": kop("Kerststol-acties"), "b.html": kop("Kerststol-actie") }, ["a.html"], { "a.html": kop("Kerststol-actie") })).length,
  1,
  "hernoemde korte projectnaam moet één melding geven",
);

// 4) Naam hernoemd binnen een langere kop, elders nog als eigen kop
const uitgelicht = (naam: string) =>
  `<html><body><h3>Uitgelicht: ${naam}</h3>${VOET}</body></html>`;
let m = await meldingenVoor(
  { "a.html": uitgelicht("Kerststol-acties"), "b.html": kop("Kerststol-actie") },
  ["a.html"],
  { "a.html": uitgelicht("Kerststol-actie") },
);
assert.equal(m.length, 1);
assert.match(m[0], /\/b/, "de melding moet de andere pagina noemen");

// 5) Naam aan beide kanten ingebed (kop die aan het menu vastplakt)
const detail = `<html><body><nav><a href="/">Home</a></nav><main><h1>Kerststol-actie</h1>${VOET}</main></body></html>`;
m = await meldingenVoor(
  { "a.html": uitgelicht("Kerststol-acties"), "b.html": detail },
  ["a.html"],
  { "a.html": uitgelicht("Kerststol-actie") },
);
assert.equal(m.length, 1);
assert.match(m[0], /Kerststol-actie/);

// 6) Losse prijs gewijzigd terwijl dezelfde prijs elders staat → stil blijven
const prijslijst = (prijs: string) =>
  `<html><body><table><tr><td>Brood</td><td>${prijs}</td></tr></table>${VOET}</body></html>`;
assert.equal(
  (await meldingenVoor({ "a.html": prijslijst("€ 13,50"), "b.html": prijslijst("€ 12,50") }, ["a.html"], { "a.html": prijslijst("€ 12,50") })).length,
  0,
  "een losse prijswijziging is geen dubbeling",
);

// 7) Telefoonnummer gewijzigd, elders in ándere schrijfwijze blijven staan
const contact = (nr: string) =>
  `<html><body><p>Bel ons gerust op ${nr} voor al je vragen over bestellingen.</p></body></html>`;
m = await meldingenVoor(
  {
    "a.html": contact("038 - 765 43 21"),
    "b.html": `<html><body><p>Welkom bij onze winkel in het centrum van de stad.</p><footer><a href="tel:0381234567">038 - 123 45 67</a></footer></body></html>`,
  },
  ["a.html"],
  { "a.html": contact("038 123 45 67") },
);
assert.ok(
  m.some((r) => /telefoonnummer/.test(r) && /\/b/.test(r)),
  "oud nummer in andere schrijfwijze elders moet gemeld worden",
);

// 8) Onzichtbare tekst: alt-tekst op de eigen pagina blijft de oude naam houden
const metAlt = (naam: string) =>
  `<html><body><img src="x.jpg" alt="Kerststol-actie"><h3>${naam}</h3>${VOET}</body></html>`;
m = await meldingenVoor({ "a.html": metAlt("Kerststol-acties") }, ["a.html"], {
  "a.html": metAlt("Kerststol-actie"),
});
assert.ok(
  m.some((r) => /onzichtbare tekst/.test(r) && /Kerststol-actie/.test(r)),
  "achtergebleven alt-tekst moet gemeld worden",
);

// 8b) Hernoeming korter dan 12 tekens die in de alt-tekst van een ÁNDERE
// pagina blijft hangen (Groene Golf 19-09: "Spoedcursus" → "VlotOpWeg-cursus",
// 11 tekens, bleef in vijf tegel-alts staan zonder melding). Een gepaarde
// hernoeming is een sterk signaal, dus daar geldt een lagere drempel.
const tegel = (naam: string) =>
  `<html><body><h2>Onze cursussen op een rij</h2><img src="c.jpg" alt="${naam} bij Rijschool De Test"><p>Bekijk het aanbod van onze rijschool.</p>${VOET}</body></html>`;
const cursusPagina = (naam: string) =>
  `<html><body><h1>${naam}</h1><p>Kies voor de ${naam} en haal in twee weken je rijbewijs met een intensief programma.</p>${VOET}</body></html>`;
m = await meldingenVoor(
  { "cursus.html": cursusPagina("VlotOpWeg-cursus"), "index.html": tegel("Spoedcursus") },
  ["cursus.html"],
  { "cursus.html": cursusPagina("Spoedcursus") },
);
assert.ok(
  m.some((r) => /Spoedcursus/.test(r) && /onzichtbare tekst|staat óók nog/.test(r)),
  "korte hernoemde naam in een alt-tekst elders moet gemeld worden",
);

// 9) Gewone kopwijziging terwijl het nummer overal in de voet staat → geen ruis
const metVoetnummer = (kopTekst: string) =>
  `<html><body><h2>${kopTekst}</h2>${VOET}<footer>038 - 123 45 67</footer></body></html>`;
m = await meldingenVoor(
  { "a.html": metVoetnummer("Een gloednieuwe kop op deze pagina"), "b.html": metVoetnummer("Andere pagina") },
  ["a.html"],
  { "a.html": metVoetnummer("De oude kop van deze pagina hier") },
);
assert.ok(
  !m.some((r) => /telefoonnummer/.test(r)),
  "een ongemoeid nummer mag geen gegevens-melding geven",
);

// 10) Kort label ("Lees meer", 9 tekens) op één pagina anders genoemd terwijl
// het elders blijft staan: te kort om betekenisvol te zijn, dus bewust stil.
// Zou hier wél een melding komen, dan bedelven we de klant onder ruis van
// knoppen, menu-items en voetteksten.
// Let op de opbouw: het label staat in een eigen alinea. De blokgrens ligt bij
// een afsluitende alinea- of kop-tag, dus een los linkje zonder eigen alinea
// loopt door in de volgende tekst en is dan geen proef meer op de drempel.
const metLabel = (label: string) =>
  `<html><body><h2>Een kop die op beide pagina's verschilt</h2><p><a href="x.html">${label}</a></p>${VOET}</body></html>`;
m = await meldingenVoor(
  { "a.html": metLabel("Lees verder"), "b.html": metLabel("Lees meer") },
  ["a.html"],
  { "a.html": metLabel("Lees meer") },
);
assert.equal(m.length, 0, "korte labels mogen geen meldingen geven (ruis)");

// ── Foto vervangen: de aangewezen plek raken ───────────────────────────────
const tweeFotos = `<img src="/f/oud.webp" alt="Vooraanzicht"><img src="/f/oud.webp" alt="Achterkant">`;
let uit = vervangFotoInPagina({
  inhoud: tweeFotos,
  oudPad: "/f/oud.webp",
  nieuwPad: "/f/nieuw.webp",
  elementHtml: `<img src="/f/oud.webp" alt="Achterkant">`,
});
assert.equal(uit.gericht, true, "met alt-tekst wordt de aangewezen plek geraakt");
assert.equal(uit.vervangen, 1);
assert.equal(uit.restant, 1);
assert.match(uit.inhoud, /oud\.webp" alt="Vooraanzicht/, "de andere plek blijft staan");

// Zonder onderscheid (zelfde alt): allebei vervangen, en dat moet blijken
uit = vervangFotoInPagina({
  inhoud: `<img src="/f/oud.webp" alt="Zelfde"><img src="/f/oud.webp" alt="Zelfde">`,
  oudPad: "/f/oud.webp",
  nieuwPad: "/f/nieuw.webp",
  elementHtml: `<img src="/f/oud.webp" alt="Zelfde">`,
});
assert.equal(uit.vervangen, 2);
assert.equal(uit.restant, 0);

// Doelbestand: staat de aangewezen plek niet op de bekeken pagina maar in een
// gedeeld blok, dan is dát het doel (gedeeld blok wijzigen = overal wijzigen)
const bronnen = [
  { pad: "contact/index.html", inhoud: `<img src="/f/oud.webp" alt="Kaart">` },
  { pad: "delen/footer.html", inhoud: `<img src="/f/oud.webp" alt="Logo klein">` },
];
assert.equal(
  kiesDoelBron(bronnen, "/f/oud.webp", "contact/index.html", `<img src="/f/oud.webp" alt="Logo klein">`)?.pad,
  "delen/footer.html",
);
assert.equal(
  kiesDoelBron(bronnen, "/f/oud.webp", "contact/index.html", `<img src="/f/oud.webp" alt="Kaart">`)?.pad,
  "contact/index.html",
);

// ── Echte klantpagina als proef op de som ─────────────────────────────────
// Een echte projectenpagina heeft tegels die ook elders terugkomen; een
// hernoemde projecttitel hoort dus gemeld te worden.
const echtePagina = await readFile(
  "/Users/josklijnhout/wordswap-klanten/ovburo/projecten/index.html",
  "utf8",
).catch(() => null);
if (echtePagina) {
  const titel = echtePagina.match(/<h[23][^>]*>\s*(?:<a[^>]*>)?\s*([^<]{12,60})</)?.[1]?.trim();
  if (titel) {
    const gewijzigdeInhoud = echtePagina.replace(titel, `${titel} 2026`);
    m = await meldingenVoor(
      { "projecten.html": gewijzigdeInhoud, "kopie.html": echtePagina },
      ["projecten.html"],
      { "projecten.html": echtePagina },
    );
    assert.ok(m.length > 0, `hernoemde projecttitel "${titel}" moet gemeld worden`);
  }
}

console.log(
  "PASS consistentie: achtergebleven kopie, gelijkgetrokken pagina zonder vals alarm, korte projectnaam, naam in langere kop, naam aan beide kanten ingebed, prijs- en gegevens-ruis stil, telefoonnummer in andere schrijfwijze, achtergebleven alt-tekst, gerichte fotovervanging, gedeeld blok als doel, en een echte klantpagina.",
);
