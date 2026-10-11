import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { tekstDelen, zonderLinks } from "../lib/tekst-links";

/**
 * De pagina /wordpress-alternatief moet het zoekwoord "alternatief voor
 * WordPress" echt dragen, en andere pagina's moeten er vanuit de lopende
 * tekst naar linken (Jos, 11-10-2026; hij stond op plek 58 met alleen een
 * link in het uitklapmenu onderaan).
 */

// 1. Links in lopende tekst: [anker](/pad), alleen naar eigen paden
assert.deepEqual(tekstDelen("Lees over [een alternatief voor WordPress](/wordpress-alternatief) hier."), [
  { tekst: "Lees over " },
  { tekst: "een alternatief voor WordPress", naar: "/wordpress-alternatief" },
  { tekst: " hier." },
]);
assert.deepEqual(tekstDelen("Geen link"), [{ tekst: "Geen link" }]);
assert.equal(tekstDelen("[kwaad](https://elders.nl) blijft tekst").some((d) => d.naar), false, "een link naar buiten wordt een echte link");
assert.equal(zonderLinks("Zie [dit](/pad) en [dat](/ander#stuk)."), "Zie dit en dat.");

// 2. De pagina draagt het zoekwoord: titel, kop, omschrijving en de tekst
const pagina = await readFile("app/wordpress-alternatief/page.tsx", "utf8");
const meta = JSON.parse(pagina.match(/export const metadata: Metadata = (\{.*\});/)![1]);
assert.match(meta.title, /^Alternatief voor WordPress/, "de titel begint niet met het zoekwoord");
assert.ok(meta.title.length <= 60, `titel te lang voor Google (${meta.title.length})`);
assert.ok(meta.description.length <= 155 && /alternatief voor WordPress/i.test(meta.description), "omschrijving te lang of zonder zoekwoord");
assert.match(pagina, /"titel": "Een alternatief voor WordPress/, "de H1 mist het zoekwoord");
assert.ok((pagina.match(/alternatief voor WordPress/gi) ?? []).length >= 6, "het zoekwoord komt te weinig voor");
// Ook een nieuwe website kan, en dan bouwen wij (Jos, 11-10: niet alleen overstappen)
assert.ok(pagina.includes("[een nieuwe website](/nieuwe-website)") && pagina.includes("daar bouw je zelf"), "de pagina zegt niet dat een nieuwe website ook kan");
for (const eerlijk of ["Wix", "Squarespace", "Wanneer blijf je liever bij WordPress?"]) assert.ok(pagina.includes(eerlijk), `de vergelijking mist: ${eerlijk}`);
assert.ok(!pagina.includes("—"), "lang streepje op de pagina");

// 3. Minstens vijf andere pagina's linken ernaartoe vanuit de tekst
const bronnen = ["app/page.tsx", "app/wordswap-vs-wordpress/page.tsx", "app/wordpress-website-traag/page.tsx", "app/website-laten-onderhouden/page.tsx", "app/wordpress-overzetten/page.tsx"];
for (const b of bronnen) {
  const t = await readFile(b, "utf8");
  assert.ok(/alternatief voor WordPress\]\(\/wordpress-alternatief\)|href="\/wordpress-alternatief"[^>]*>\s*(een )?alternatief voor WordPress/.test(t), `${b} linkt niet met de juiste ankertekst`);
}

// 4. En elke link op de pagina zelf wijst naar een pagina die bestaat
for (const m of pagina.matchAll(/\]\((\/[a-z0-9\-]+)\)/g)) {
  await readFile(`app${m[1]}/page.tsx`, "utf8").catch(() => assert.fail(`dode link op de pagina: ${m[1]}`));
}
// De landingsopbouw rendert de links en houdt ze uit de structured data
const landing = await readFile("app/SeoLanding.tsx", "utf8");
assert.ok(landing.includes("<MetLinks tekst={b.tekst} />") && landing.includes("zonderLinks(f.antwoord)"), "links worden niet gerenderd of lekken in de structured data");

console.log("alternatief-links: ok");
