/**
 * De KEUZES-knoppen moeten óók verschijnen als de AI ná de KEUZES-regel nog
 * een naschrift zet ("(Je video is wel bewaard...)"). Op 20-09 bleef de regel
 * dan platte tekst: de parser eiste dat KEUZES de laatste regel was.
 * We testen het échte gedrag: de parseKeuzes-functie wordt uit Chat.tsx
 * geknipt en uitgevoerd.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const chat = await readFile("app/portal/Chat.tsx", "utf8");

// Functie eruit knippen en draaien (hij is bewust zelfstandig: geen imports).
const start = chat.indexOf("function parseKeuzes");
assert.ok(start > 0, "parseKeuzes niet gevonden in Chat.tsx");
const einde = chat.indexOf("\n}", start);
const bron = chat
  .slice(start, einde + 2)
  .replace(/: \{ schoon: string; keuzes: string\[\] \}/, "")
  .replace(/\(tekst: string\)/, "(tekst)")
  .replace(/keuzes: \[\] as string\[\]/g, "keuzes: []");
const parseKeuzes = new Function(`${bron}; return parseKeuzes;`)() as (
  t: string,
) => { schoon: string; keuzes: string[] };

// 1. Gewone situatie: KEUZES als laatste regel
const a = parseKeuzes("Waar wil je hem hebben?\n\nKEUZES: Bovenaan | Onderaan");
assert.deepEqual(a.keuzes, ["Bovenaan", "Onderaan"], "keuzes op de laatste regel worden niet gelezen");
assert.ok(!a.schoon.includes("KEUZES"), "de KEUZES-regel blijft in de tekst staan");

// 2. Het geval van 20-09: naschrift NA de KEUZES-regel
const b = parseKeuzes(
  "Deze brief lijkt per ongeluk meegestuurd.\n\nKEUZES: Toch plaatsen | Niet plaatsen | ✏️ Ik vertel het zelf\n\n(Je video is wel bewaard, dus opnieuw meesturen hoeft niet.)",
);
assert.deepEqual(
  b.keuzes,
  ["Toch plaatsen", "Niet plaatsen", "✏️ Ik vertel het zelf"],
  "keuzes met een naschrift erachter worden niet als knoppen herkend",
);
assert.ok(!b.schoon.includes("KEUZES"), "de KEUZES-regel blijft als platte tekst staan");
assert.ok(b.schoon.includes("wel bewaard"), "het naschrift na de KEUZES-regel verdwijnt");
assert.ok(b.schoon.includes("per ongeluk meegestuurd"), "de tekst vóór de KEUZES-regel verdwijnt");

// 3. Geen valse treffers: 'KEUZES:' midden in een zin is geen knoppenregel
const c = parseKeuzes("Ik zag het woord KEUZES: dat is geen knoppenregel want er staat tekst voor.");
assert.equal(c.keuzes.length, 0, "een KEUZES midden in een zin wordt ten onrechte een knoppenrij");

// 4. Hooguit vier knoppen
const d = parseKeuzes("Kies:\nKEUZES: 1 | 2 | 3 | 4 | 5");
assert.equal(d.keuzes.length, 4, "meer dan vier knoppen glippen erdoor");

console.log("keuzes-knoppen: knoppen verschijnen ook met een naschrift na de KEUZES-regel");
