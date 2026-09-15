/** Test voor de publicatie-nabewerking: sitemap.xml en llms.txt kloppend maken.
 * Draaien: node --import tsx tests/site-onderhoud.mts (geen database nodig). */
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { werkOverzichtenBij } from "../lib/site-onderhoud";

const map = await mkdtemp(path.join(tmpdir(), "onderhoud-"));
const schrijf = async (p: string, inhoud: string) => {
  await mkdir(path.dirname(path.join(map, p)), { recursive: true });
  await writeFile(path.join(map, p), inhoud);
};
const pagina = (titel: string, beschrijving?: string, extraHead = "") =>
  `<!doctype html><html><head><title>${titel} | Testzaak</title>${beschrijving ? `<meta name="description" content="${beschrijving}">` : ""}${extraHead}</head><body><h1>${titel}</h1></body></html>`;

try {
  await schrijf("index.html", pagina("Home", "De home."));
  await schrijf("contact/index.html", pagina("Contact", "Bel ons."));
  await schrijf("nieuw/index.html", pagina("Gloednieuw", "Net toegevoegd."));
  await schrijf("404.html", pagina("Niet gevonden", undefined, '<meta name="robots" content="noindex">'));
  await schrijf("delen/menu.html", "<nav>menu</nav>");
  await schrijf(
    "sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://testzaak.nl/</loc></url>\n  <url><loc>https://testzaak.nl/contact/</loc></url>\n  <url><loc>https://testzaak.nl/weg/</loc></url>\n</urlset>\n`,
  );
  await schrijf(
    "llms.txt",
    `# Testzaak\n\n> Feitelijke beschrijving.\n\n## Pagina's\n\n- [Home](https://testzaak.nl/): handgeschreven omschrijving die moet blijven.\n- [Contact](https://testzaak.nl/contact/): bereikbaarheid.\n- [Weg](https://testzaak.nl/weg/): bestaat niet meer.\n`,
  );

  const uit = await werkOverzichtenBij(map);
  const sitemap = uit.find((b) => b.pad === "sitemap.xml")?.inhoud.toString();
  const llms = uit.find((b) => b.pad === "llms.txt")?.inhoud.toString();
  assert.ok(sitemap && llms, "beide overzichten worden bijgewerkt");

  // Sitemap: volgorde behouden, verdwenen pagina eruit, nieuwe achteraan,
  // geen delen/-bestanden en geen noindex-pagina's (404).
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, [
    "https://testzaak.nl/",
    "https://testzaak.nl/contact/",
    "https://testzaak.nl/nieuw/",
  ]);

  // llms.txt: handgeschreven omschrijvingen blijven staan, verdwenen pagina
  // eruit, nieuwe erbij met titel (zonder " | Testzaak") en metabeschrijving.
  assert.ok(llms.includes("handgeschreven omschrijving die moet blijven"));
  assert.ok(!llms.includes("bestaat niet meer"));
  assert.ok(llms.includes("- [Gloednieuw](https://testzaak.nl/nieuw/): Net toegevoegd."));
  assert.ok(!llms.includes("404"));
  assert.ok(!llms.includes("| Testzaak"));

  // Idempotent: na wegschrijven is er niets meer te doen.
  for (const b of uit) await writeFile(path.join(map, b.pad), b.inhoud);
  assert.equal((await werkOverzichtenBij(map)).length, 0, "tweede keer niets te doen");

  // Sites zonder overzichten blijven ongemoeid.
  await rm(path.join(map, "sitemap.xml"));
  await rm(path.join(map, "llms.txt"));
  assert.equal((await werkOverzichtenBij(map)).length, 0);

  console.log("PASS: sitemap-volgorde, verwijderde en nieuwe pagina's, noindex- en delen/-uitsluiting, behoud van handgeschreven llms-teksten, idempotentie en sites zonder overzichten.");
} finally {
  await rm(map, { recursive: true, force: true });
}
