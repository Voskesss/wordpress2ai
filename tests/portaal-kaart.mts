/** De klantchat moet weten wat de klant zelf in het portaal kan, en waar
 * (Jos, 02-10-2026). Dat staat in één korte kaart (lib/portaal-kaart.ts) die
 * alleen de klantchat meekrijgt. Deze test koppelt de kaart aan het portaal:
 * elke genoemde knop of elk tabblad moet echt bestaan. Hernoemt iemand iets
 * in het portaal zonder de kaart bij te werken, dan wordt de testrit rood.
 * Zo blijft de chat bij elke wijziging bij. De kaart blijft kort (tokens).
 * Draaien: node --import tsx tests/portaal-kaart.mts */
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { KAART_NAMEN, PORTAAL_KAART } from "../lib/portaal-kaart";
import { HUISREGELS } from "../lib/huisregels";

const leesbaar = (t: string) => t.replace(/&amp;/g, "&");

// 1. Elke naam bestaat in het portaal én staat in de kaart
for (const [naam, bestand] of KAART_NAMEN) {
  const bron = await readFile(`app/portal/${bestand}`, "utf8").catch(() => "");
  assert.ok(bron, `app/portal/${bestand} bestaat niet meer: werk lib/portaal-kaart.ts bij`);
  assert.ok(bron.includes(naam), `"${naam}" staat niet meer in app/portal/${bestand}: hernoemd? Werk lib/portaal-kaart.ts bij, anders verwijst de chat naar iets wat niet bestaat`);
  assert.ok(PORTAAL_KAART.includes(leesbaar(naam)), `"${leesbaar(naam)}" staat in KAART_NAMEN maar niet in de kaarttekst`);
}

// 2. Kort, want hij gaat mee in elke chatbeurt
const woorden = PORTAAL_KAART.split(/\s+/).length;
assert.ok(woorden <= 230, `de portaalkaart is ${woorden} woorden; houd hem onder 230 (tokens)`);
assert.ok(!PORTAAL_KAART.includes("—"), "lang streepje in de portaalkaart");

// 3. Alleen in de klantchat, niet dubbel in de huisregels (die gaan ook naar de bouwer)
const chat = await readFile("app/api/chat/route.ts", "utf8");
assert.ok(chat.includes('${isDemo ? "" : `\\n\\n${PORTAAL_KAART}`}'), "de klantchat krijgt de portaalkaart niet mee");
assert.ok(!HUISREGELS.includes("PORTAAL (wat de eigenaar"), "de kaart staat ook in de huisregels: dubbele tokens");
for (const oud of ["Formulier-inzendingen", "onder de chat"])
  assert.ok(!HUISREGELS.includes(oud), `huisregels verwijzen nog naar een plek die niet meer bestaat: "${oud}"`);

// 4. Geen beloftes over knoppen die er niet zijn ("Vorige versies" bestaat niet voor klanten)
async function* bestanden(map: string): AsyncGenerator<string> {
  for (const d of await readdir(map, { withFileTypes: true })) {
    const p = path.join(map, d.name);
    if (d.isDirectory()) yield* bestanden(p);
    else if (/\.(ts|tsx)$/.test(d.name)) yield p;
  }
}
for (const map of ["app", "lib"])
  for await (const p of bestanden(map)) {
    const tekst = (await readFile(p, "utf8")).split("\n").filter((r) => !/^\s*(\/\/|\*|\/\*)/.test(r)).join("\n");
    assert.ok(!/via "Vorige versies"/.test(tekst), `${p} belooft "Vorige versies", maar die knop bestaat niet`);
  }
console.log(`✓ portaal-kaart: ${KAART_NAMEN.length} namen bestaan echt, ${woorden} woorden, alleen in de klantchat`);
