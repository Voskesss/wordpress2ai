/**
 * Een pdf kan twee heel verschillende dingen zijn. Een leesfragment van een
 * boek verdient "Lees de eerste 50 pagina's" — een uitnodiging. Een
 * prijslijst verdient "Download de prijslijst (PDF, 160 kB)". De oude regel
 * schreef voor álles de downloadvorm voor, wat bij een schrijver met
 * inkijkexemplaren precies verkeerd uitpakt (lead-doorlichting 20-09).
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const huis = await readFile("lib/huisregels.ts", "utf8");
const regel = huis.slice(huis.indexOf("- DOCUMENTEN (PDF)"), huis.indexOf("\n- ", huis.indexOf("- DOCUMENTEN (PDF)") + 10));

// 1. De regel maakt het onderscheid, met voorbeelden van beide kanten
assert.ok(/OM TE LEZEN OF OM OP TE SLAAN/.test(regel), "de regel maakt geen onderscheid tussen lezen en opslaan");
assert.ok(/leesfragment/i.test(regel) && /prijslijst/i.test(regel), "er staan geen voorbeelden van beide soorten in");
assert.ok(/Lees de eerste 50 pagina/.test(regel), "voorbeeldtekst voor lezen ontbreekt");
assert.ok(/Download de vacature \(PDF, 160 kB\)/.test(regel), "voorbeeldtekst voor opslaan ontbreekt");

// 2. Bij twijfel vragen — met de keuzeknoppen die de chat al kent
assert.ok(/KEUZES/.test(regel) && /om te lezen of om op te slaan/i.test(regel), "bij twijfel wordt er niet gevraagd");

// 3. En de klant ruimt zelf op; niet meer doorverwijzen naar Jos
assert.ok(/documentenbank/i.test(regel), "de regel verwijst niet naar de documentenbank");
assert.ok(!/jos@wordswap\.nl/.test(regel), "er wordt nog naar Jos doorverwezen voor iets wat de klant zelf kan");

console.log("pdf-lezen-of-opslaan: onderscheid, voorbeeldteksten, vraag bij twijfel en zelf opruimen");
