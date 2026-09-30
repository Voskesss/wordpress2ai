/** Oude documentadressen moeten na een migratie blijven werken. De knoppen op
 * de site wijzen al naar /documenten/, maar mails, Google en bladwijzers
 * kennen alleen /wp-content/uploads/... Bij Van den Berg Mediation gaf het
 * boekje uit de welkomstmail een 404 (30-09-2026). Drie gevallen: bestand op
 * het oude pad (goed), 301 naar een bestaand bestand (goed), geen van beide
 * (fout). Plus: een pdf van een andere site is niet onze zorg.
 * Draaien: node --import tsx tests/documenten-oud-adres.mts */
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { controleerSiteMap, oudeDocumenten } from "../lib/bouw-controle";

const basis = await mkdtemp(path.join(tmpdir(), "documenten-"));
const site = path.join(basis, "site");
const bron = path.join(basis, "site-bron");
await mkdir(path.join(site, "wp-content/uploads/2025/07"), { recursive: true });
await mkdir(path.join(site, "documenten"), { recursive: true });
await mkdir(path.join(bron, "oud-ontwerp"), { recursive: true });

await writeFile(
  path.join(bron, "seo-manifest-xml.json"),
  JSON.stringify({
    bron: "xml",
    paginas: [],
    mediaUrls: [
      "https://voorbeeld.nl/wp-content/uploads/2025/07/Boekje_2025.pdf",
      "https://voorbeeld.nl/wp-content/uploads/2021/06/Alimentatie.pdf",
      "https://voorbeeld.nl/wp-content/uploads/2020/10/Folder.pdf",
      "https://voorbeeld.nl/wp-content/uploads/2020/10/foto.jpg",
    ],
  }),
);
await writeFile(
  path.join(bron, "oud-ontwerp/home.html"),
  `<html><head><link rel="canonical" href="https://www.voorbeeld.nl/"></head><body>
  <a href="/wp-content/uploads/2019/01/Brochure.docx">brochure</a>
  <a href="https://www.rijksoverheid.nl/documenten/regeling.pdf">extern</a>
  </body></html>`,
);

await writeFile(path.join(site, "wp-content/uploads/2025/07/Boekje_2025.pdf"), "%PDF-1.4 boekje");
await writeFile(path.join(site, "documenten/alimentatie.pdf"), "%PDF-1.4 alimentatie");
await writeFile(path.join(site, "_redirects"), `/wp-content/uploads/2021/06/Alimentatie.pdf /documenten/alimentatie.pdf 301\n`);
await writeFile(path.join(site, "index.html"), `<!doctype html><html><head><title>x</title></head><body>home</body></html>`);

// 1. De verzameling: eigen documenten uit manifest én oude HTML, geen foto's, geen externe pdf
const gevonden = await oudeDocumenten(bron);
assert.deepEqual(gevonden, [
  "/wp-content/uploads/2019/01/Brochure.docx",
  "/wp-content/uploads/2020/10/Folder.pdf",
  "/wp-content/uploads/2021/06/Alimentatie.pdf",
  "/wp-content/uploads/2025/07/Boekje_2025.pdf",
]);

// 2. De poort: alleen Folder.pdf en Brochure.docx zijn fout
const bevindingen = await controleerSiteMap(site, { bronMap: bron });
const documenten = bevindingen.filter((b) => b.regel === "documenten");
assert.deepEqual(
  documenten.map((b) => b.waar).sort(),
  ["/wp-content/uploads/2019/01/Brochure.docx", "/wp-content/uploads/2020/10/Folder.pdf"],
  "bestand op oud pad en 301 naar bestaand bestand zijn goed; de rest is fout",
);
assert.ok(documenten.every((b) => b.ernst === "fout"));
assert.ok(documenten[0].detail.includes("_redirects"), "de melding vertelt wat je moet doen");

// 3. Een 301 naar iets dat niet bestaat is ook fout
await writeFile(path.join(site, "_redirects"), `/wp-content/uploads/2021/06/Alimentatie.pdf /documenten/weg.pdf 301\n`);
const kapot = (await controleerSiteMap(site, { bronMap: bron })).filter((b) => b.regel === "documenten");
assert.equal(kapot.length, 3, "301 naar een ontbrekend bestand moet ook gemeld worden");
assert.ok(kapot.find((b) => b.waar.endsWith("Alimentatie.pdf"))?.detail.includes("bestaat niet"));

// 4. Zonder bron-map slaat de regel over
const zonder = (await controleerSiteMap(site, {})).filter((b) => b.regel === "documenten");
assert.equal(zonder.length, 0);

console.log("✓ oude documentadressen worden bewaakt");
