import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { controleerSiteMap } from "../lib/bouw-controle";

/**
 * Een link met alleen een beeld met lege alt heeft geen naam: schermlezers en
 * AI-agents weten niet waar hij heen gaat (Lighthouse "Agentisch browsen").
 * Les Van den Berg 28-09: 522 kaartlinks.
 */
const map = await mkdtemp(path.join(tmpdir(), "link-tekst-"));
try {
  const pagina = (lijf: string) =>
    `<!doctype html><html lang="nl"><head><title>T</title><meta name="description" content="d"><meta name="viewport" content="width=device-width"></head><body>${lijf}</body></html>`;
  await writeFile(path.join(map, "index.html"), pagina(
    `<a class="kaart-beeld" href="/a/"><img src="/x.webp" alt=""></a>` +
    `<a href="/b/"><img src="/y.webp" alt="Artikel B"></a>` +
    `<a href="/c/" aria-label="Artikel C"><img src="/z.webp" alt=""></a>` +
    `<a href="/d/"><img src="/i.webp" alt=""> Tekst ernaast</a>`,
  ));
  const b = (await controleerSiteMap(map)).filter((x) => x.regel === "link-tekst");
  assert.equal(b.length, 1, `precies de kale beeldlink hoort te falen, kreeg ${b.length}`);
  assert.equal(b[0].ernst, "fout");
} finally {
  await rm(map, { recursive: true, force: true });
}
console.log("✓ link-tekst: beeldlink zonder naam is een fout; alt, aria-label of tekst ernaast is goed");
