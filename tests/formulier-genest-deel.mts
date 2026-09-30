/** Een formulier in een deel dat zelf in een ander deel zit (delen/formulier-vraag.html
 * ingevoegd in delen/contact.html, dat weer op artikelpagina's staat) moet bij
 * Bevestigingsmails de pagina's krijgen waar het écht op staat. Zonder recursie
 * kreeg zo'n formulier een lege paginalijst en toonde de admin "niet meer op de
 * website gevonden" (Van den Berg Mediation, 30-09-2026).
 * Draaien: node --import tsx tests/formulier-genest-deel.mts */
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { herkenFormulieren } from "../lib/formulier-bevestiging";

const map = await mkdtemp(path.join(tmpdir(), "genest-deel-"));
await mkdir(path.join(map, "delen"), { recursive: true });
await mkdir(path.join(map, "artikel-a"), { recursive: true });
await mkdir(path.join(map, "artikel-b"), { recursive: true });
const formulier = `<form action="https://wordswap.nl/api/formulier" method="post">
  <input type="hidden" name="_formulier" value="vraag">
  <input name="naam"><textarea name="bericht"></textarea>
</form>`;
await writeFile(path.join(map, "delen/formulier-vraag.html"), formulier);
// deel in deel, met een kring terug naar zichzelf om de bezocht-set te bewijzen
await writeFile(path.join(map, "delen/contact.html"), `<section><!--invoeg:formulier-vraag--><!--invoeg:contact--></section>`);
await writeFile(path.join(map, "artikel-a/index.html"), `<html><body><!--invoeg:contact--></body></html>`);
await writeFile(path.join(map, "artikel-b/index.html"), `<html><body><!-- invoeg:contact --></body></html>`);
await writeFile(path.join(map, "index.html"), `<html><body>home</body></html>`);
await writeFile(path.join(map, "over/index.html").replace("/over/index.html", "/over.html"), `<html><body>over</body></html>`);

const herkend = await herkenFormulieren(map);
const vraag = herkend.find((f) => f.formulier === "vraag");
assert.ok(vraag, "formulier vraag moet herkend worden");
assert.deepEqual(
  [...vraag.paginas].sort(),
  ["/artikel-a/", "/artikel-b/"],
  "formulier in een genest deel moet de pagina's van het buitenste deel krijgen",
);
console.log("✓ genest deel geeft de juiste pagina's");
