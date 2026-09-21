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

console.log("seo-poort: ok");
