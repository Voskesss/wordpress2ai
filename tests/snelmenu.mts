import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * De klantpagina in de admin is lang en heeft daarom een snelmenu bovenaan.
 * Wie er een blok bij zet vergeet dat menu, en dan is het nieuwe blok alleen
 * te vinden door te scrollen. Dat gebeurde bij "Formulierberichten bewaren".
 *
 * Deze test kijkt naar beide kanten: elke menuknop moet ergens landen, en elk
 * blok met een anker moet in het menu staan.
 */

const menu = await readFile(new URL("../app/admin/klant/[id]/SnelMenu.tsx", import.meta.url), "utf8");
const pagina = await readFile(new URL("../app/admin/klant/[id]/page.tsx", import.meta.url), "utf8");

const inMenu = [...menu.matchAll(/\{ anker: "([^"]+)", label: "([^"]+)" \}/g)].map((m) => ({
  anker: m[1],
  label: m[2],
}));
assert.ok(inMenu.length > 10, "het snelmenu is leeg of anders opgeschreven");

// Ankers op de pagina: id="..." op een blok dat meescrollt (scroll-mt-24)
const opPagina = new Set(
  [...pagina.matchAll(/id="([^"]+)"[^>]*scroll-mt-24|scroll-mt-24[^>]*id="([^"]+)"/g)].map(
    (m) => m[1] ?? m[2]
  )
);
// Meerregelige varianten: id en scroll-mt-24 op aparte regels
for (const m of pagina.matchAll(/id="([^"]+)"\s*\n?\s*className="scroll-mt-24/g)) opPagina.add(m[1]);
for (const m of pagina.matchAll(/id="([^"]+)" className="scroll-mt-24/g)) opPagina.add(m[1]);

// 1. Elke knop in het menu landt ergens
for (const { anker, label } of inMenu) {
  // "verwijderen" en een paar blokken staan als los id zonder scroll-mt-24
  const bestaat = opPagina.has(anker) || pagina.includes(`id="${anker}"`);
  assert.ok(bestaat, `menuknop "${label}" wijst naar #${anker}, maar dat anker staat niet op de pagina`);
}

// 2. En elk blok dat zich als menudoel gedraagt staat in het menu
const ankers = new Set(inMenu.map((i) => i.anker));
for (const anker of opPagina) {
  assert.ok(ankers.has(anker), `blok #${anker} heeft een anker maar staat niet in het snelmenu`);
}

// 3. Het blok waar dit misging staat er nu echt in
assert.ok(ankers.has("formulier-privacy"), "het privacyblok ontbreekt in het snelmenu");

console.log(`snelmenu: ok (${inMenu.length} knoppen, allemaal raak)`);
