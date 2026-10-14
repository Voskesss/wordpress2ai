/** WebPage-gegevens (auteur, datum, kruimelpad) voor elke onderwerppagina (14-10-2026). */
import assert from "node:assert/strict";
import { SEO_PAGINAS, paginaJsonLd, datumNl } from "../lib/seo-paginas";

assert.equal(datumNl("2026-10-14"), "14 oktober 2026");
for (const p of SEO_PAGINAS) {
  const ld = paginaJsonLd(p.pad, p.naam) as { "@graph": Record<string, unknown>[] };
  const pagina = ld["@graph"][0] as { dateModified: string; author: { name: string }; url: string };
  assert.equal(pagina.dateModified, p.bijgewerkt);
  assert.equal(pagina.author.name, "Jos Klijnhout");
  assert.ok(pagina.url.startsWith("https://www.wordswap.nl"));
  const kruimel = ld["@graph"][1] as { itemListElement: { position: number }[] };
  assert.deepEqual(kruimel.itemListElement.map((x) => x.position), [1, 2]);
}
assert.equal(paginaJsonLd("/bestaat-niet", "x"), null);
console.log(`pagina-gegevens: ok (${SEO_PAGINAS.length} pagina's)`);
