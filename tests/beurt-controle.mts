/**
 * De afspraken-poort na elke chatbeurt: wat mechanisch kan wordt stil
 * gerepareerd, wat niet te verzinnen valt wordt gemeld voor één herstelbeurt.
 * Elke case legt vast wat er gebeurt als de AI een afspraak vergeet — dat is
 * precies het moment waarop dit vangnet zijn geld waard is.
 * Draaien: node --import tsx tests/beurt-controle.mts
 */
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afsprakenMeldingen, herstelAfspraken } from "../lib/beurt-controle";

async function site(paginas: Record<string, string>) {
  const map = await mkdtemp(path.join(tmpdir(), "beurt-"));
  for (const [naam, html] of Object.entries(paginas)) {
    await mkdir(path.dirname(path.join(map, naam)), { recursive: true });
    await writeFile(path.join(map, naam), html);
  }
  return map;
}
const lees = (map: string, p: string) => readFile(path.join(map, p), "utf8");

// ── Formulier met de klassieke fouten: verkort adres, geen _site, geen honeypot,
//    wel een bestandsveld maar geen enctype ─────────────────────────────────
let map = await site({
  "contact/index.html": `<html><body>
<form method="POST" action="/api/formulier">
  <input type="hidden" name="_formulier" value="offerte">
  <input type="hidden" name="_bedankt" value="/bedankt/">
  <input type="file" name="schets">
  <button>Verstuur</button>
</form>
</body></html>`,
});
let fixes = await herstelAfspraken(map, ["contact/index.html"], "proefzaak");
let html = await lees(map, "contact/index.html");
assert.match(html, /action="https:\/\/wordswap\.nl\/api\/formulier"/, "adres rechtgezet");
assert.match(html, /name="_site" value="proefzaak"/, "_site toegevoegd met de juiste waarde");
assert.match(html, /name="_extra"[^>]*tabindex="-1"/, "honeypot toegevoegd");
assert.match(html, /<form enctype="multipart\/form-data"/, "enctype toegevoegd bij bestandsveld");
assert.equal(fixes.length, 4);

// Nogmaals draaien = niets meer te doen (anders stapelen velden zich op)
assert.equal((await herstelAfspraken(map, ["contact/index.html"], "proefzaak")).length, 0);
assert.equal((await lees(map, "contact/index.html")).match(/_extra/g)?.length, 1);

// En de meldingen: dit formulier is compleet, dus stil
assert.equal((await afsprakenMeldingen(map, ["contact/index.html"])).length, 0);

// ── Een goed formulier blijft onaangeroerd, letter voor letter ─────────────
const goed = `<html><body><form method="POST" action="https://wordswap.nl/api/formulier" enctype="multipart/form-data">
<input type="hidden" name="_site" value="proefzaak"><input type="hidden" name="_formulier" value="contact">
<input type="hidden" name="_bedankt" value="/bedankt/"><input type="text" name="_extra" value="" tabindex="-1" style="position:absolute;left:-9999px">
<input type="file" name="cv"></form></body></html>`;
map = await site({ "a.html": goed });
assert.equal((await herstelAfspraken(map, ["a.html"], "proefzaak")).length, 0);
assert.equal(await lees(map, "a.html"), goed, "geen enkele byte veranderd");

// ── Een formulier van een externe dienst blijft met rust ──────────────────
map = await site({ "b.html": `<form action="https://extern.example/zoek"><input name="q"></form>` });
assert.equal((await herstelAfspraken(map, ["b.html"], "x")).length, 0);

// ── Lazy loading: eerste afbeelding (hero) niet, de rest wel ───────────────
map = await site({
  "index.html": `<html><body><img src="hero.webp" alt="Hero"><p>tekst</p><img src="twee.webp" alt="Twee"><img src="drie.webp" alt="Drie" loading="eager"></body></html>`,
});
fixes = await herstelAfspraken(map, ["index.html"], "x");
html = await lees(map, "index.html");
assert.ok(!/hero\.webp"[^>]*loading=/.test(html.split("twee")[0].includes("loading") ? "x" : html.match(/<img[^>]*hero[^>]*>/)![0]), "hero blijft direct laden");
assert.match(html, /<img loading="lazy" decoding="async" src="twee\.webp"/, "tweede afbeelding wordt lui");
assert.ok(/drie\.webp"[^>]*/.test(html) && html.match(/<img[^>]*drie[^>]*>/)![0].includes('loading="eager"'), "bestaande keuze blijft staan");
assert.equal(fixes.filter((f) => f.includes("lazy")).length, 1);

// ── Meldingen voor wat niet te verzinnen valt ──────────────────────────────
map = await site({
  "team/index.html": `<html><body><!--invoeg:menu--><img src="jan.webp"><form action="/api/formulier"><input name="naam"></form></body></html>`,
  "delen/footer.html": `<footer></footer>`,
});
await herstelAfspraken(map, ["team/index.html"], "x");
const meldingen = await afsprakenMeldingen(map, ["team/index.html"]);
assert.ok(meldingen.some((m) => m.includes("jan.webp") && m.includes("alt")), "ontbrekende alt-tekst gemeld");
assert.ok(meldingen.some((m) => m.includes("_formulier")), "ontbrekende formuliernaam gemeld");
assert.ok(meldingen.some((m) => m.includes("_bedankt")), "ontbrekende bedankt-verwijzing gemeld");
assert.ok(meldingen.some((m) => m.includes("invoeg:menu") && m.includes("bestaat niet")), "kapotte invoeg-marker gemeld");

// Bestaat het deel wél, dan geen melding daarover
map = await site({
  "x.html": `<html><body><!--invoeg:menu--></body></html>`,
  "delen/menu.html": `<nav></nav>`,
});
assert.equal((await afsprakenMeldingen(map, ["x.html"])).length, 0);

// ── Alleen gewijzigde bestanden worden aangeraakt ──────────────────────────
map = await site({
  "oud.html": `<form action="/api/formulier"><input name="_formulier"></form>`,
  "nieuw.html": `<p>los</p>`,
});
assert.equal((await herstelAfspraken(map, ["nieuw.html"], "x")).length, 0);
assert.match(await lees(map, "oud.html"), /action="\/api\/formulier"/, "niet-gewijzigde pagina blijft zoals hij was");

console.log(
  "PASS beurt-controle: formulier-adres, _site, honeypot en enctype stil gerepareerd (en idempotent), goede en externe formulieren byte-voor-byte met rust gelaten, hero blijft direct laden terwijl de rest lui wordt, ontbrekende alt/formuliernaam/bedankt-verwijzing en kapotte invoeg-markers gemeld, en alleen gewijzigde bestanden aangeraakt.",
);
