import assert from "node:assert/strict";
import {
  bedrijfsgegevens,
  dubbeleTeksten,
  koppenControle,
  verweesdePaginas,
  type PaginaGegevens,
} from "../lib/seo-poort";

/**
 * De poort bewaakte wel of elke pagina een titel had, maar niet of die titels
 * van elkaar verschilden, of er één hoofdkop was, of een pagina bereikbaar was,
 * en of een bedrijf zich als bedrijf voorstelt aan Google. Dat is wat Gerard
 * Groenen zijn extra links onder het zoekresultaat oplevert.
 */

const p = (o: Partial<PaginaGegevens> & { pad: string }): PaginaGegevens => ({
  rel: `${o.pad.replace(/^\/|\/$/g, "") || "index"}.html`,
  koppen: 1,
  linktNaar: [],
  noindex: false,
  ...o,
});

// --- Dubbele titels en omschrijvingen
const dubbel = dubbeleTeksten([
  p({ pad: "/a/", titel: "Zelfde titel" }),
  p({ pad: "/b/", titel: "Zelfde titel" }),
  p({ pad: "/c/", titel: "Eigen titel" }),
]);
assert.equal(dubbel.length, 1, "dubbele titel niet gemeld");
assert.ok(dubbel[0].waar.includes("a.html") && dubbel[0].waar.includes("b.html"), "beide vindplaatsen horen erbij");
assert.equal(dubbel[0].hard, false, "dit mag niet blokkeren");

// Drie keer dezelfde levert één melding, niet drie
assert.equal(
  dubbeleTeksten([p({ pad: "/a/", titel: "X" }), p({ pad: "/b/", titel: "X" }), p({ pad: "/c/", titel: "X" })]).length,
  1,
);
// Pagina's die toch niet in Google komen tellen niet mee
assert.deepEqual(
  dubbeleTeksten([p({ pad: "/a/", titel: "X" }), p({ pad: "/b/", titel: "X", noindex: true })]),
  [],
);

// --- Hoofdkoppen
assert.deepEqual(koppenControle([p({ pad: "/a/", koppen: 1 })]), []);
assert.equal(koppenControle([p({ pad: "/a/", koppen: 0 })]).length, 1, "ontbrekende h1 niet gemeld");
const teveel = koppenControle([p({ pad: "/a/", koppen: 3 })]);
assert.equal(teveel.length, 1);
assert.ok(teveel[0].detail.includes("3 keer"), "aantal hoort in de melding");
assert.deepEqual(koppenControle([p({ pad: "/a/", koppen: 0, noindex: true })]), []);

// --- Verweesde pagina's
const verweesd = verweesdePaginas([
  p({ pad: "/", linktNaar: ["/over/"] }),
  p({ pad: "/over/" }),
  p({ pad: "/verstopt/" }),
]);
assert.equal(verweesd.length, 1, "verweesde pagina niet gevonden");
assert.ok(verweesd[0].waar.includes("verstopt"));

// De homepage is nooit verweesd, ook al linkt niemand ernaar
assert.deepEqual(verweesdePaginas([p({ pad: "/" })]), []);
// Een link naar /over/index.html telt als een link naar /over/
assert.deepEqual(
  verweesdePaginas([p({ pad: "/", linktNaar: ["/over/index.html"] }), p({ pad: "/over/" })]),
  [],
);
// En een link mét ankertje of zoekterm ook
assert.deepEqual(
  verweesdePaginas([p({ pad: "/", linktNaar: ["/over/#team"] }), p({ pad: "/over/" })]),
  [],
);

// --- Bedrijfsgegevens
const geen = { heeftTelefoon: true, heeftAdres: true, jsonLd: [], telefoonnummers: [] };
assert.equal(bedrijfsgegevens(geen).length, 1, "ontbrekend bedrijfsblok niet gemeld");

// Een site zonder contactgegevens hoeft geen bedrijfsblok
assert.deepEqual(
  bedrijfsgegevens({ heeftTelefoon: false, heeftAdres: false, jsonLd: [], telefoonnummers: [] }),
  [],
);

// Compleet blok: stil
const compleet = `{"@type":"LocalBusiness","telephone":"+31 40 123 4567","address":{"@type":"PostalAddress","postalCode":"5674 TL"}}`;
assert.deepEqual(
  bedrijfsgegevens({ heeftTelefoon: true, heeftAdres: true, jsonLd: [compleet], telefoonnummers: ["+31 40 123 4567"] }),
  [],
);

// Wel een blok, maar het nummer erin is een ander: dat wil je weten, want
// Google legt dit naast het Google-bedrijfsprofiel
const anderNummer = bedrijfsgegevens({
  heeftTelefoon: true,
  heeftAdres: true,
  jsonLd: [compleet],
  telefoonnummers: ["040 999 8877"],
});
assert.equal(anderNummer.length, 1, "afwijkend telefoonnummer niet gemeld");
assert.ok(anderNummer[0].detail.includes("bedrijfsprofiel"));

// Blok zonder adres terwijl het adres wel op de site staat
assert.equal(
  bedrijfsgegevens({
    heeftTelefoon: false,
    heeftAdres: true,
    jsonLd: [`{"@type":"Organization","name":"X"}`],
    telefoonnummers: [],
  }).length,
  1,
);


// --- Apostrofregressie: "pagina's" kapte de omschrijving af bij het streepje,
//     waardoor elke Nederlandse tekst met een apostrof op zijn eerste woorden
//     werd vergeleken. Gevonden door de EVC-chat, 21-09.
{
  const html = `<meta name="description" content="Alle 7 pagina's van EVC over autotechnicus: meer tekst hier.">`;
  const eruit = html.match(/<meta[^>]+name=["']description["'][^>]*content=(["'])([\s\S]*?)\1/i)?.[2];
  assert.ok(eruit?.includes("autotechnicus"), "omschrijving kapt nog steeds af bij een apostrof");
  assert.ok(eruit!.length > 40, `te kort: ${eruit}`);
}

// --- Verschillend, maar niet in het stuk dat Google laat zien
const staart = (n: number) => "x".repeat(n);
const zelfdeBegin = dubbeleTeksten([
  p({ pad: "/a/", omschrijving: `${"A".repeat(160)}${staart(5)}links` }),
  p({ pad: "/b/", omschrijving: `${"A".repeat(160)}${staart(5)}rechts` }),
]);
assert.equal(zelfdeBegin.length, 1, "teksten die pas ná het zichtbare deel verschillen worden niet gemeld");
assert.match(zelfdeBegin[0].detail, /vanaf teken 165/, "meld waar ze uiteenlopen");
assert.match(zelfdeBegin[0].detail, /vooraan/, "zeg wat eraan te doen is");

// Wél verschillend in het zichtbare deel: geen melding. Dit was het valse
// alarm op de tagpagina's van EVC.
assert.deepEqual(
  dubbeleTeksten([
    p({ pad: "/a/", omschrijving: "Alle 7 pagina's van EVC over apk keurmeester zonder diploma: en dan nog veel meer tekst die volgt." }),
    p({ pad: "/b/", omschrijving: "Alle 7 pagina's van EVC over autotechnicus: en dan nog veel meer tekst die hierachter volgt." }),
  ]),
  [],
  "vals alarm op teksten die binnen het zichtbare deel al verschillen",
);

// Korte, verschillende teksten blijven stil: daar is niets verborgen
assert.deepEqual(
  dubbeleTeksten([p({ pad: "/a/", titel: "Over ons" }), p({ pad: "/b/", titel: "Contact" })]),
  [],
);


// --- Apostrof aan het BEGIN liet de aanwezigheidscontrole falen: die meldde
//     dan "Geen meta description" als harde fout, terwijl hij er gewoon stond.
//     Komt voor in het Nederlands: "'s Ochtends open", "'t Gooi".
{
  const patroon = /<meta[^>]+name=["']description["'][^>]*content=(["'])(?!\1)[\s\S]*?\1/i;
  for (const inhoud of [
    `<meta name="description" content="Gewone omschrijving.">`,
    `<meta name="description" content="'s Ochtends open, kom gerust langs.">`,
    `<meta name="description" content="Alle pagina's van ons bedrijf.">`,
    `<meta name='description' content='Met enkele aanhalingstekens.'>`,
  ])
    assert.ok(patroon.test(inhoud), `onterecht als ontbrekend gezien: ${inhoud}`);
  // En een lege omschrijving telt nog steeds niet
  assert.ok(!patroon.test(`<meta name="description" content="">`), "lege omschrijving hoort te melden");
}

// --- Deeltekst voor sociale media: die raakt los van de omschrijving zodra
//     iemand er één bijwerkt. Bij EVC toonden 21 tagpagina's daardoor overal
//     dezelfde tekst op WhatsApp, terwijl de omschrijving al uniek was.
const ogDubbel = dubbeleTeksten([
  p({ pad: "/a/", omschrijving: "Uniek A", ogOmschrijving: "Overal dezelfde deeltekst" }),
  p({ pad: "/b/", omschrijving: "Uniek B", ogOmschrijving: "Overal dezelfde deeltekst" }),
]);
assert.equal(ogDubbel.length, 1, "gedeelde deeltekst wordt niet gemeld");
assert.match(ogDubbel[0].detail, /WhatsApp/, "zeg waar die tekst opduikt");

// Unieke deelteksten blijven stil
assert.deepEqual(
  dubbeleTeksten([
    p({ pad: "/a/", ogOmschrijving: "Over apk keuren" }),
    p({ pad: "/b/", ogOmschrijving: "Over autotechniek" }),
  ]),
  [],
);


// --- Twee gaten die de demo-bakkerij blootlegde (21-09-2026)

// 10. Relatieve links tellen ook mee. Een site die links schrijft als
//     "over-ons.html" in plaats van "/over-ons/" zag er anders uit alsof élke
//     pagina verweesd was.
assert.deepEqual(
  verweesdePaginas([
    p({ pad: "/", linktNaar: ["blog.html"] }),
    p({ pad: "/blog.html" }),
  ]),
  [],
  "relatieve link telt niet mee",
);
// Ook vanuit een submap: het artikel is bereikbaar via een relatieve link
assert.deepEqual(
  verweesdePaginas([
    p({ pad: "/", linktNaar: ["/nieuws/"] }),
    p({ pad: "/nieuws/", linktNaar: ["artikel.html"] }),
    p({ pad: "/nieuws/artikel.html" }),
  ]).map((b) => b.waar),
  [],
  "relatieve link binnen een map telt niet mee",
);
// En echt verweesd blijft gemeld
assert.equal(
  verweesdePaginas([p({ pad: "/", linktNaar: ["blog.html"] }), p({ pad: "/verstopt.html" }), p({ pad: "/blog.html" })]).length,
  1,
);

// 11. Een bedrijfsblok telt ook als de soort niet in onze lijst staat.
//     schema.org heeft tientallen soorten (Bakery, Florist, Plumber) en die ga
//     je nooit allemaal opsommen; het adres is het echte signaal.
assert.deepEqual(
  bedrijfsgegevens({
    heeftTelefoon: true,
    heeftAdres: true,
    jsonLd: [`{"@type":"Bakery","name":"Bakkerij Jansen","telephone":"+31 26 123 4567","address":{"@type":"PostalAddress","postalCode":"6811 AA"}}`],
    telefoonnummers: ["+31 26 123 4567"],
  }),
  [],
  "een Bakery met adres en telefoon hoort gewoon te tellen",
);
// Zonder enig blok blijft de melding staan
assert.equal(
  bedrijfsgegevens({ heeftTelefoon: true, heeftAdres: true, jsonLd: [], telefoonnummers: [] }).length,
  1,
);
// Een blok zonder adres én zonder bekende soort telt niet als bedrijf
assert.equal(
  bedrijfsgegevens({
    heeftTelefoon: true,
    heeftAdres: true,
    jsonLd: [`{"@type":"BlogPosting","headline":"Iets"}`],
    telefoonnummers: [],
  }).length,
  1,
  "een blogbericht is geen bedrijfsblok",
);

console.log("seo-poort: ok");
