import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * Jos vergat telkens wat de knoppen in het Ontwerpblok doen. De uitleg stond
 * als `title` op het <form>, en die tooltip van de browser verschijnt pas na
 * ruim een seconde: in de praktijk zie je hem nooit. Nu zit elke knop in een
 * <MetUitleg>, die meteen verschijnt.
 *
 * Deze test bewaakt dat er geen knop bijkomt zonder uitleg.
 */

const blok = await readFile(new URL("../app/admin/klant/[id]/OntwerpBlok.tsx", import.meta.url), "utf8");

// 1. Elke actieknop zit in een MetUitleg
const knoppen = (blok.match(/<(?:ActieKnop|BevestigKnop)\b/g) ?? []).length;
const uitleg = (blok.match(/<MetUitleg tekst="/g) ?? []).length;
assert.ok(knoppen > 0, "geen knoppen gevonden: is het blok verbouwd?");
assert.equal(uitleg, knoppen, `${knoppen} knoppen maar ${uitleg} uitleggen: elke knop hoort er één te hebben`);

// 2. Geen enkele uitleg is een loze regel
for (const m of blok.matchAll(/<MetUitleg tekst="([^"]*)"/g)) {
  assert.ok(m[1].length > 40, `Te korte uitleg: "${m[1]}"`);
}

// 3. De oude, onzichtbare vorm is echt weg
assert.ok(!/<form action=\{\w+\}[^>]*\stitle="/.test(blok), "nog een title= op een <form>: gebruik MetUitleg");

// 4. Geen lange streepjes in wat Jos hier op zijn scherm ziet
assert.ok(!blok.includes("—"), "Lang streepje in het Ontwerpblok");

// 5. De tooltip verschijnt zonder vertraging en kan niet buiten beeld vallen
const comp = await readFile(new URL("../app/admin/klant/[id]/MetUitleg.tsx", import.meta.url), "utf8");
assert.ok(comp.includes("group-hover:opacity-100"), "tooltip reageert niet op hover");
assert.ok(/duration-\d\d?\b/.test(comp), "tooltip hoort snel te verschijnen");
assert.ok(comp.includes("max-w-["), "tooltip mist een breedtegrens en kan buiten beeld vallen");
assert.ok(comp.includes("pointer-events-none"), "tooltip mag de knop eronder niet blokkeren");

console.log("knop-uitleg: ok");
