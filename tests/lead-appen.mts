/**
 * WhatsApp vanuit de leadlijst (wens Jos 25-09): telefoonnummers uit Meta
 * zichtbaar en met één knop een appje "ik heb je gemaild". De nummervertaling
 * moet kloppen, anders opent WhatsApp een gesprek met een verkeerd nummer.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { waNummer, waLeadLink } from "../lib/leads";

// 1. Nummervormen zoals ze echt binnenkomen (Meta geeft +31..., mensen typen 06...)
assert.equal(waNummer("+31622224239"), "31622224239");
assert.equal(waNummer("+310629052695"), "310629052695".replace(/^310/, "310")); // Meta-vorm met dubbele nul erin blijft zoals aangeleverd
assert.equal(waNummer("06 51817275"), "31651817275");
assert.equal(waNummer("06-22 33 44 55"), "31622334455");
assert.equal(waNummer("0031 6 12345678"), "31612345678");
assert.equal(waNummer("026 234 0122"), null); // vast nummer zonder landcode: niet gokken
assert.equal(waNummer(""), null);
assert.equal(waNummer(null), null);
assert.equal(waNummer("12345"), null); // te kort voor een echt nummer

// 2. De link: juiste bestemming, voorgetypt bericht met voornaam, en netjes gecodeerd
const link = waLeadLink("+31622224239", "Robert Brandes");
assert.ok(link?.startsWith("https://wa.me/31622224239?text="), "wa.me-link klopt niet");
const tekst = decodeURIComponent(link!.split("text=")[1]);
assert.ok(tekst.startsWith("Hoi Robert,"), "de voornaam staat niet in het bericht");
assert.ok(tekst.includes("mail gestuurd") && tekst.includes("Jos van WordSwap"), "het gemaild-bericht klopt niet");
assert.ok(!tekst.includes("—"), "lang streepje in het appbericht");

// 3. Leeg bericht = alleen het gesprek openen; geen nummer = geen link
assert.equal(waLeadLink("06 51817275", "Rob", ""), "https://wa.me/31651817275");
assert.equal(waLeadLink("geen nummer", "Rob"), null);

// 4. De leadlijst gebruikt het echt: nummer in de rij, app-knop in het detail
const lijst = await readFile(new URL("../app/admin/leads/LeadLijst.tsx", import.meta.url), "utf8");
assert.ok(lijst.includes("waLeadLink"), "de leadlijst gebruikt de wa.me-helper niet");
assert.ok(lijst.includes("App: net gemaild"), "de app-knop is verdwenen uit het leaddetail");
assert.ok(/l\.telefoon && <span[^>]*>\{l\.telefoon\}/.test(lijst), "het telefoonnummer staat niet meer in de overzichtsrij");

console.log("lead-appen: ok");
