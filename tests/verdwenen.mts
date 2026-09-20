import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ONDERDELEN, vergelijkOnderdelen } from "../lib/verlies";
import { controleerSiteMap } from "../lib/bouw-controle";

/**
 * De stilste fout bij een migratie: de oude site had iets, de nieuwe niet, en
 * er ontstaat nergens een fout. Er is gewoon iets minder. Zo verloor
 * evc-professionals zijn zoekfunctie (388 verwijzingen in de bron, nul in het
 * resultaat) zonder dat iemand het merkte, tot Jos het weken later opviel.
 */

const MET_ZOEKEN = `<form class="searchform"><input type="search" name="s"></form>`;
const ZONDER = `<p>Gewone pagina zonder iets bijzonders.</p>`;

// 1. Verdwenen zoekfunctie wordt gemeld
const weg = vergelijkOnderdelen([MET_ZOEKEN], [ZONDER]);
assert.equal(weg.length, 1, "verdwenen zoekfunctie niet gemeld");
assert.equal(weg[0].naam, "zoekfunctie");
assert.ok(weg[0].advies.includes("invoeg:zoeken"), "advies mist de concrete stap");

// 2. Meegenomen zoekfunctie geeft géén melding, ook al ziet onze markup er anders uit
assert.deepEqual(vergelijkOnderdelen([MET_ZOEKEN], [`<!--invoeg:zoeken-->`]), []);
assert.deepEqual(vergelijkOnderdelen([MET_ZOEKEN], [`<div role="search"></div>`]), []);

// 3. Eén losse vermelding haalt de drempel niet: liever een gemist geval dan
//    een vals alarm, want daar stopt iemand naar te kijken
assert.deepEqual(vergelijkOnderdelen([`<p>agenda</p>`], [ZONDER]), []);

// 4. Zonder bron doen we geen enkele uitspraak
assert.deepEqual(vergelijkOnderdelen([], [ZONDER]), []);

// 5. Elk onderdeel herkent zichzelf, en een meegenomen versie zwijgt
for (const o of ONDERDELEN) {
  const bron = o.oud.source.split("|")[0].replace(/\\/g, "");
  const oudeHtml = [`<div>${bron} ${bron} ${bron} ${bron}</div>`];
  const gemeld = vergelijkOnderdelen(oudeHtml, [ZONDER]).map((v) => v.naam);
  assert.ok(gemeld.includes(o.naam), `${o.naam} herkent zijn eigen kenmerk niet`);
  const eigen = o.nieuw.source.split("|")[0].replace(/\\/g, "");
  assert.ok(
    !vergelijkOnderdelen(oudeHtml, [`<div>${eigen}</div>`]).some((v) => v.naam === o.naam),
    `${o.naam} slaat vals alarm terwijl het onderdeel er wél is`,
  );
}

// 6. Door de poort heen: de melding is een waarschuwing en geen blokkade,
//    want een bewuste versimpeling mag (de klant wil het misschien niet meer)
const werk = await mkdtemp(path.join(tmpdir(), "verdwenen-"));
const site = path.join(werk, "site");
const bron = path.join(werk, "bron");
await mkdir(site, { recursive: true });
await mkdir(bron, { recursive: true });
const kop = `<!doctype html><html lang="nl"><head><title>Test</title><meta name="description" content="x"><link rel="icon" href="/favicon.ico"></head><body>`;
await writeFile(path.join(bron, "index.html"), `${kop}${MET_ZOEKEN}</body></html>`);
await writeFile(path.join(site, "index.html"), `${kop}${ZONDER}</body></html>`);

const metBron = (await controleerSiteMap(site, { bronMap: bron })).filter((r) => r.regel === "verdwenen");
assert.equal(metBron.length, 1, "poort meldt de verdwenen zoekfunctie niet");
assert.equal(metBron[0].ernst, "waarschuwing", "dit hoort niet te blokkeren");

// 7. Zonder bron-map zwijgt de poort erover: geen valse meldingen bij een
//    ontwerp-promotie, waar geen bronmateriaal is
const zonderBron = (await controleerSiteMap(site)).filter((r) => r.regel === "verdwenen");
assert.equal(zonderBron.length, 0, "zonder bron mag er geen verdwenen-melding zijn");

console.log("verdwenen: ok");
