/**
 * Herofoto's op landingspagina's (14-10-2026). Elke foto in
 * public/images/paginas hoort bij een bestaande pagina en heeft een
 * beschrijving (alt), anders ziet een blinde bezoeker of Google niets.
 * Een pagina zonder foto valt terug op de illustratie; dat mag.
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, statSync } from "node:fs";
import { FOTO_ALT, fotoVoor } from "../lib/pagina-fotos";

const map = "public/images/paginas";
const bestanden = existsSync(map) ? readdirSync(map) : [];
for (const b of bestanden) {
  const m = b.match(/^(.+)\.webp$/);
  assert.ok(m, `${b}: alleen .webp hoort in ${map} (klein en scherp)`);
  const slug = m[1];
  assert.ok(FOTO_ALT[slug], `${b} heeft geen beschrijving in lib/pagina-fotos.ts`);
  assert.ok(slug === "home" || existsSync(`app/${slug}/page.tsx`), `${b} hoort bij geen bestaande pagina`);
  assert.ok(statSync(`${map}/${b}`).size < 400_000, `${b} is groter dan 400 KB; dat maakt de pagina traag`);
  assert.deepEqual(fotoVoor(slug), { src: `/images/paginas/${b}`, alt: FOTO_ALT[slug] });
}
for (const [slug, alt] of Object.entries(FOTO_ALT)) {
  assert.ok(slug === "home" || existsSync(`app/${slug}/page.tsx`), `beschrijving voor ${slug}, maar die pagina bestaat niet`);
  assert.ok(alt.length > 20 && !alt.includes("—"), `${slug}: beschrijving te kort of met lang streepje`);
}
assert.equal(fotoVoor("bestaat-niet"), null);
console.log(`pagina-fotos: ok (${bestanden.length} foto's)`);
