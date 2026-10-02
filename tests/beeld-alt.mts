/** Wat Google over foto's en documenten leest, zichtbaar in de banken
 * (vraag Dirk-Jan, 02-10-2026). Foto: de alt-tekst per plek waar hij staat.
 * Document: de linktekst. Plus de naam kiezen vóór het uploaden, omdat een
 * naam achteraf wijzigen kapotte plaatjes en links kan geven.
 * Draaien: node --import tsx tests/beeld-alt.mts */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { altTekstenPerBeeld, linkTekstenPerDocument, padVanVerwijzing } from "../lib/beeld-alt";
import { schoneNaamDelen } from "../lib/bestandsnaam";

// 1. Verwijzingen naar een pad in de site
assert.equal(padVanVerwijzing("/afbeeldingen/team.webp"), "afbeeldingen/team.webp");
assert.equal(padVanVerwijzing("https://voorbeeld.nl/afbeeldingen/team.webp?v=2 600w"), "afbeeldingen/team.webp");
assert.equal(padVanVerwijzing("afbeeldingen/met%20spatie.webp"), "afbeeldingen/met spatie.webp");
assert.equal(padVanVerwijzing("data:image/png;base64,xx"), null);

// 2. Alt-teksten per foto, ook via srcset; ontbrekend en leeg zijn verschillend
const paginas = [
  { inhoud: `<img src="/afbeeldingen/dirk-jan.webp" srcset="/afbeeldingen/dirk-jan-600.webp 600w, /afbeeldingen/dirk-jan.webp 2000w" alt="Dirk-Jan van den Berg, mediator">` },
  { inhoud: `<img alt='Dirk-Jan van den Berg, mediator' src="afbeeldingen/dirk-jan.webp"><img src="/afbeeldingen/golf.svg" alt=""><img src="/afbeeldingen/kantoor.webp">` },
  { inhoud: `<img src="/afbeeldingen/dirk-jan.webp" alt="Mediation &amp; scheiding">` },
];
const alts = altTekstenPerBeeld(paginas);
assert.deepEqual(alts.get("afbeeldingen/dirk-jan.webp"), { teksten: ["Dirk-Jan van den Berg, mediator", "Mediation & scheiding"], zonder: 0, leeg: 0 }, "meest gebruikte omschrijving eerst, tekens netjes");
assert.deepEqual(alts.get("afbeeldingen/dirk-jan-600.webp"), { teksten: ["Dirk-Jan van den Berg, mediator"], zonder: 0, leeg: 0 }, "een maat uit de srcset krijgt dezelfde omschrijving");
assert.deepEqual(alts.get("afbeeldingen/golf.svg"), { teksten: [], zonder: 0, leeg: 1 }, "alt=\"\" is een bewuste sierafbeelding");
assert.deepEqual(alts.get("afbeeldingen/kantoor.webp"), { teksten: [], zonder: 1, leeg: 0 }, "zonder alt-attribuut leest Google niets");

// 3. Linkteksten per document
const links = linkTekstenPerDocument([
  { inhoud: `<a href="/wp-content/uploads/2025/07/Boekje_2025.pdf" class="knop"><span>Download het boekje</span></a>` },
  { inhoud: `<a href="https://voorbeeld.nl/wp-content/uploads/2025/07/Boekje_2025.pdf">Gratis boekje</a><a href="/contact/">Contact</a>` },
  { inhoud: `<a href="/bestanden/x.pdf" aria-label="Voorwaarden (pdf)"><svg></svg></a>` },
]);
assert.deepEqual(links.get("wp-content/uploads/2025/07/Boekje_2025.pdf"), ["Download het boekje", "Gratis boekje"]);
assert.deepEqual(links.get("bestanden/x.pdf"), ["Voorwaarden (pdf)"], "een link zonder tekst valt terug op aria-label");
assert.equal(links.has("contact/"), false);

// 4. Naam kiezen vóór het uploaden: dezelfde schoonmaak in browser en server
assert.deepEqual(schoneNaamDelen("Mediation Scheiding Lisse.x", ""), { stam: "mediation-scheiding-lisse", ext: ".x" });
const hulp = await readFile("app/portal/BankHulp.tsx", "utf8");
assert.ok(hulp.includes("export function NaamKiezer") && hulp.includes('from "@/lib/bestandsnaam"'), "de naamkiezer gebruikt niet dezelfde naamregels als de server");
assert.ok(hulp.includes("Deze naam bestaat al in je bank"), "een bestaande naam wordt niet vooraf gemeld");
for (const [bank, prop] of [["DocumentBank", "bestanden/"], ["Fotobank", "afbeeldingen/"]]) {
  const b = await readFile(`app/portal/${bank}.tsx`, "utf8");
  assert.ok(b.includes("<NaamKiezer") && b.includes(`\`${prop}\${naam}\``), `${bank}: geen naamkiezer vóór het uploaden`);
}

// 5. De API's geven het mee, en de banken tonen het
const fotoApi = await readFile("app/api/fotobank/route.ts", "utf8");
assert.ok(fotoApi.includes("alt: alts.get(pad) ?? null"), "fotobank geeft de omschrijvingen niet mee");
const docApi = await readFile("app/api/documentbank/route.ts", "utf8");
assert.ok(docApi.includes("linkTeksten: linkTeksten.get(pad) ?? []"), "documentenbank geeft de linkteksten niet mee");
const fotobank = await readFile("app/portal/Fotobank.tsx", "utf8");
assert.ok(fotobank.includes("Google leest:") && fotobank.includes("Geen omschrijving op"), "fotobank toont de omschrijving of het ontbreken ervan niet");
assert.ok((await readFile("app/portal/DocumentBank.tsx", "utf8")).includes("Linktekst op je site:"), "documentenbank toont de linktekst niet");
console.log("✓ beeld-alt: omschrijvingen en linkteksten zichtbaar, naam kiezen vóór het uploaden");
