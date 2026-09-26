/**
 * Zoekvak zonder werkende zoekindex is onzichtbaar kapot (eis Jos 26-09).
 *
 * De zoekindex wordt pas bij de deploy gebouwd en slaat pagina's zonder titel
 * of met noindex over. Heeft een site het zoekvak maar valt álles buiten de
 * index, dan opent een bezoeker een zoekvak dat niets kan vinden, en niemand
 * die het ziet. De poort vangt dat nu.
 */
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { controleerSiteMap } from "../lib/bouw-controle";

async function maakSite(paginaHtml: string, menuMetZoekvak: boolean): Promise<string> {
  const map = await mkdtemp(path.join(tmpdir(), "zoektest-"));
  await mkdir(path.join(map, "delen"), { recursive: true });
  await writeFile(path.join(map, "delen", "menu.html"), menuMetZoekvak ? `<nav><!--invoeg:zoeken--></nav>` : `<nav></nav>`);
  await writeFile(path.join(map, "index.html"), paginaHtml);
  return map;
}
const zoekFouten = (m: Awaited<ReturnType<typeof controleerSiteMap>>) =>
  m.filter((x) => x.regel === "zoeken" && x.ernst === "fout");

// 1. Zoekvak in het menu-deel + pagina zonder titel: lege index = fout
const kapot = await maakSite(`<html><head></head><body><!--invoeg:menu--><p>Welkom</p></body></html>`, true);
const a = zoekFouten(await controleerSiteMap(kapot));
assert.equal(a.length, 1, "zoekvak met lege zoekindex hoort een fout te zijn");
assert.ok(a[0].detail.includes("zoekindex"), "de fout legt het zoekindex-probleem niet uit");
await rm(kapot, { recursive: true, force: true });

// 2. Zelfde site mét titel: de index vult zich, geen zoek-fout
const goed = await maakSite(`<html><head><title>Welkom</title></head><body><!--invoeg:menu--><p>Welkom bij ons</p></body></html>`, true);
assert.equal(zoekFouten(await controleerSiteMap(goed)).length, 0, "met een titel hoort de zoek-fout weg te zijn");
await rm(goed, { recursive: true, force: true });

// 3. Geen zoekvak: een lege index is dan geen probleem
const zonderZoek = await maakSite(`<html><head></head><body><!--invoeg:menu--><p>Welkom</p></body></html>`, false);
assert.equal(zoekFouten(await controleerSiteMap(zonderZoek)).length, 0, "zonder zoekvak mag de index leeg zijn");
await rm(zonderZoek, { recursive: true, force: true });

// 4. Zoekvak direct op een pagina (niet via een deel) telt ook
const opPagina = await maakSite(`<html><head></head><body><!--invoeg:zoeken--><p>Welkom</p></body></html>`, false);
assert.equal(zoekFouten(await controleerSiteMap(opPagina)).length, 1, "zoekvak op de pagina zelf werd niet herkend");
await rm(opPagina, { recursive: true, force: true });

console.log("zoek-controle: ok");
