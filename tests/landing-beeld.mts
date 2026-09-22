import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

/**
 * Elke landingspagina toonde dezelfde illustratie, want het beeld stond hard
 * in het sjabloon. De pagina voor hoveniers liet dus een ondernemer in een
 * atelier zien.
 *
 * Nu kiest elke pagina zijn eigen beeld. Deze test bewaakt het enige dat
 * daarbij echt fout kan gaan: een naam in de lijst waar geen bestand bij
 * hoort, want dan staat er een kapot plaatje op een pagina die niemand van
 * ons dagelijks bekijkt.
 */

const beeld = await readFile(new URL("../app/VerhaalBeeld.tsx", import.meta.url), "utf8");
const landing = await readFile(new URL("../app/SeoLanding.tsx", import.meta.url), "utf8");

// 1. Het beeld is per pagina te kiezen, met een terugval
assert.ok(landing.includes('data.beeld ?? "ondernemer"'), "het beeld staat weer hard in het sjabloon");
assert.ok(/beeld\?: Onderwerp;/.test(landing), "een pagina kan geen eigen beeld opgeven");

// 2. Elke naam uit de lijst heeft een bestand, en elk bestand een omschrijving
const namen = [...beeld.matchAll(/^\s{2}"?([a-z0-9-]+)"?:\s*$|^\s{2}"?([a-z0-9-]+)"?:\s*"/gm)]
  .map((m) => m[1] ?? m[2])
  .filter(Boolean);
assert.ok(namen.length >= 3, `maar ${namen.length} beelden gevonden, de lijst wordt anders uitgelezen`);
const bestanden = await readdir(new URL("../public/images/illustraties", import.meta.url));
for (const naam of namen) {
  assert.ok(
    bestanden.includes(`${naam}.webp`),
    `"${naam}" staat in de lijst maar public/images/illustraties/${naam}.webp bestaat niet, dus die pagina toont een kapot plaatje`,
  );
}

// 3. Elk beeld heeft een alt-tekst die zegt wat je ziet
for (const naam of namen) {
  const regel = beeld.match(new RegExp(`"?${naam}"?:\\s*\\n?\\s*"([^"]{15,})"`));
  assert.ok(regel, `"${naam}" heeft geen fatsoenlijke omschrijving voor een schermlezer`);
}

// 4. Het bijschrift blijft eerlijk: dit zijn illustraties, geen klantfoto's
assert.ok(
  /AI-illustratie/.test(beeld),
  "het bijschrift zegt niet meer dat het een illustratie is; bij een echte foto hoort toestemming",
);

console.log(`landing-beeld: ok (${namen.length} beelden, allemaal aanwezig)`);
