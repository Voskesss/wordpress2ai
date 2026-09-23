import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * De leadlijst moet laten zien wat er als laatste gebeurde.
 *
 * Aanleiding: Jos mailde Wolbert vanuit zijn eigen postbus en zag dat nergens
 * terug in de lijst, want in de rij stond alleen de VOLGENDE actie. Daardoor
 * leek het alsof er niets gebeurd was en dreigde hij dubbel te mailen.
 */

const lijst = await readFile(new URL("../app/admin/leads/LeadLijst.tsx", import.meta.url), "utf8");

// 1. Laatste contact staat in de rij.
assert.ok(lijst.includes("<LaatsteContact"), "het laatste contact staat niet in de rij");
assert.ok(/function LaatsteContact/.test(lijst), "LaatsteContact bestaat niet");

// 2. Standaard gesorteerd op laatste contact, niet op de volgende actie.
assert.ok(
  /useState<"contact" \| "actie">\("contact"\)/.test(lijst),
  "de lijst staat niet standaard op laatste contact"
);
// En de oude volgorde blijft kiesbaar: een takenlijst is iets anders dan een tijdlijn.
assert.ok(lijst.includes('value="actie"'), "de volgorde op eerstvolgende actie is verdwenen");

// 3. De sortering hangt echt aan die keuze; anders verandert er niets bij het omzetten.
assert.ok(
  /sorteer === "contact"/.test(lijst) && /filter, zoek, sorteer\]/.test(lijst),
  "de sorteerkeuze wordt niet gebruikt of niet herberekend"
);

// 4. Eén tijdlijn voor beide bronnen: post uit de Mailer én uit Soverin. Zou
//    dit op alleen Soverin kijken, dan zie je je eigen systeemmails niet.
const pagina = await readFile(new URL("../app/admin/leads/page.tsx", import.meta.url), "utf8");
assert.ok(pagina.includes("alleVerzonden") && pagina.includes("allePost"), "de tijdlijn mist een van de twee bronnen");

// 5. Langere fragmenten, maar geen hele antwoordreeks.
const soverin = await readFile(new URL("../lib/soverin.ts", import.meta.url), "utf8");
const tekens = Number(soverin.match(/const FRAGMENT_TEKENS = (\d+)/)?.[1]);
assert.ok(tekens >= 1000, `fragment te kort om een antwoord in te lezen: ${tekens}`);
assert.ok(tekens <= 4000, `fragment zo lang dat de hele reeks meekomt: ${tekens}`);
assert.ok(!soverin.includes("slice(0, 400)"), "er staat nog een harde 400 in soverin.ts");
assert.ok(pagina.includes("m.tekst.slice(0, 1200)"), "de Mailer-tekst in de tijdlijn is niet meegegroeid");

console.log("lead-volgorde: ok");
