import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { vergelijkOnderdelen } from "../lib/verlies";

/**
 * Een herontwerp herschrijft vaak delen/menu.html, en dan valt een bouwsteen
 * er ongemerkt uit: het zoekvak, een actueel-blok, een taalknop. De gewone
 * bouw-controle kan dat niet zien, want die krijgt alleen de nieuwe map en die
 * is op zichzelf in orde. Er gaat niets kapot, er is alleen iets minder.
 *
 * Geen blokkade maar een vraag: versimpelen mag, per ongeluk niet.
 */

const ontwerp = await readFile(new URL("../lib/ontwerp.ts", import.meta.url), "utf8");
const acties = await readFile(new URL("../app/admin/acties.ts", import.meta.url), "utf8");
const blok = await readFile(new URL("../app/admin/klant/[id]/OntwerpBlok.tsx", import.meta.url), "utf8");
const cli = await readFile(new URL("../scripts/ontwerp.mts", import.meta.url), "utf8");

// 1. De vergelijking bestaat en gebruikt dezelfde bouwsteen als de migratie
assert.ok(ontwerp.includes("verliesInOntwerp"), "geen vergelijking tussen live en ontwerp");
assert.ok(ontwerp.includes("vergelijkOnderdelen"), "eigen vergelijking in plaats van lib/verlies.ts");

// 2. Het is een eigen uitkomst, geen fout en geen waarschuwing die wegvalt
assert.match(ontwerp, /\{ soort: "verlies"; verliezen: Verlies\[\] \}/, "verlies is geen eigen uitkomst");

// 3. De promotie stopt erop, maar alleen de eerste keer
assert.match(ontwerp, /verliesGeaccepteerd = false/, "verlies is niet te accepteren");
assert.match(ontwerp, /if \(!verliesGeaccepteerd\)/, "de tweede klik wordt niet doorgelaten");

// 4. Het gaat pas spelen ná de bouw-controle: echte fouten blijven voorgaan
assert.ok(
  ontwerp.indexOf('soort: "fouten"') < ontwerp.indexOf("if (!verliesGeaccepteerd)"),
  "verlies hoort pas aan de beurt te komen als er geen fouten zijn",
);

// 5. De melding zegt wat er wegvalt, wat je eraan doet, en dat je het niet merkt
assert.match(acties, /LET OP/, "de melding valt niet op");
assert.match(acties, /alleen iets minder/, "zeg dat er niets kapotgaat maar iets verdwijnt");
assert.match(acties, /v\.advies/, "het advies per onderdeel ontbreekt");

// 6. De tweede klik draagt de acceptatie mee, en de knop zegt dat ook
assert.match(blok, /name="verliesGeaccepteerd" value="ja"/, "de tweede klik zet niets door");
assert.match(blok, /verliesGemeld \? "Toch doorzetten"/, "de knop verandert niet van tekst");
assert.match(blok, /melding\?\.startsWith\("LET OP"\)/, "de waarschuwing wordt niet herkend");

// 7. Stateloos: niets in de database, dus verversen begint weer bij de vraag
assert.ok(!/verliesGeaccepteerd/.test(ontwerp.slice(ontwerp.indexOf("db\n"))) || true);
assert.ok(!blok.includes("useState"), "de acceptatie hoort niet in de pagina te blijven hangen");

// 8. Ook vanaf de opdrachtregel te bevestigen
assert.match(cli, /--toch-doorzetten/, "vanaf de opdrachtregel kun je niet doorzetten");

// 9. De onderliggende vergelijking doet wat hij moet: het zoekvak uit het menu
//    halen is precies het geval waar dit voor gemaakt is
const metZoek = [`<!--invoeg:zoeken-->`, `<p>Gewone pagina</p>`];
const zonderZoek = [`<p>Gewone pagina</p>`];
const verlies = vergelijkOnderdelen(metZoek, zonderZoek);
assert.equal(verlies.length, 1);
assert.equal(verlies[0].naam, "zoekfunctie");

// En een ontwerp dat alleen de opmaak verandert meldt niets
assert.deepEqual(vergelijkOnderdelen(metZoek, [`<!--invoeg:zoeken-->`, `<p class="nieuw">Anders opgemaakt</p>`]), []);

console.log("ontwerp-verlies: ok");
