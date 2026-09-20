import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { controleerSiteMap } from "../lib/bouw-controle";
import { meestuurMap } from "../lib/bouw";

/**
 * Een documentarchief (vereniging: notulen, statuten, nieuwsbrieven) moet ná de
 * migratie op de site zelf staan. Een link naar de oude hosting werkt zolang die
 * site nog draait en breekt zodra de klant daar opzegt — daar waarschuwt de poort voor.
 */

const werkmap = await mkdtemp(path.join(tmpdir(), "doc-test-"));
await mkdir(path.join(werkmap, "bestanden"), { recursive: true });
await writeFile(path.join(werkmap, "bestanden", "statuten.pdf"), "%PDF-1.4 nep");
await writeFile(path.join(werkmap, "favicon.ico"), "x");
await mkdir(path.join(werkmap, "delen"), { recursive: true });

const kop = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Documenten</title>
<meta name="description" content="Onze stukken"><link rel="canonical" href="https://vereniging.nl/">
<link rel="icon" href="/favicon.ico"></head><body>`;

await writeFile(
  path.join(werkmap, "index.html"),
  `${kop}
<a href="/bestanden/statuten.pdf">Statuten (PDF)</a>
<a href="https://usercontent.one/wp/www.vereniging.nl/wp-content/uploads/2026/03/Nieuwsbrief.pdf">Nieuwsbrief maart</a>
<a href="https://www.woonbond.nl/rapport.pdf">Rapport van de Woonbond</a>
</body></html>`,
);

const uitslag = await controleerSiteMap(werkmap);
const extern = uitslag.filter((r) => r.regel === "extern-document");

// Het eigen document op de site geeft geen enkele melding
assert.ok(!extern.some((r) => r.detail.includes("statuten")));
// Beide externe documenten worden gemeld, met de host erbij zodat je ziet wat het is
assert.equal(extern.length, 2);
assert.ok(extern.some((r) => r.detail.includes("usercontent.one")));
assert.ok(extern.some((r) => r.detail.includes("woonbond.nl")));
// Het is een waarschuwing, geen blokkade: een document van een derde partij mag
assert.ok(extern.every((r) => r.ernst === "waarschuwing"));
// En het eigen document geldt niet als dode link
assert.ok(!uitslag.some((r) => r.regel === "dode-links" && r.detail.includes("statuten")));

console.log("documenten: alle checks geslaagd");

// Elk soort bestand gaat naar zijn eigen map — dezelfde die de chat gebruikt,
// zodat een klant na de migratie niets opnieuw hoeft te uploaden.
assert.equal(meestuurMap("https://oud.nl/wp-content/uploads/notulen.pdf"), "bestanden");
assert.equal(meestuurMap("https://oud.nl/cms/luisterboeken/Chantage.mp3"), "audio");
assert.equal(meestuurMap("https://oud.nl/media/trailer.mp4"), "video");
assert.equal(meestuurMap("https://oud.nl/wp-content/uploads/foto.jpg"), null); // beelden gaan door sharp
assert.equal(meestuurMap("https://oud.nl/pagina/"), null);
// Ook met een query erachter blijft het herkenbaar
assert.equal(meestuurMap("https://oud.nl/stuk.pdf?v=2"), "bestanden");
