import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { VARIANT_BREEDTES, variantNaam, zetSrcset } from "../lib/beeldmaten";

/**
 * Eén foto in meerdere maten.
 *
 * Aanleiding (24-09-2026): rolandbroekhuis.nl, 174 schilderijen. Gemeten op
 * een telefoon 13,4 seconde voordat de site bruikbaar was, met 1,8 MB aan
 * beeld op de homepage. De migratie zette alles al om naar WebP, maar in één
 * maat: 2000px, ook voor een scherm van 390px.
 *
 * Twee dingen mogen hier nooit stuk. Een beeld mag niet wazig worden (dat ziet
 * iedereen meteen), en een img die iemand met de hand heeft ingericht mag niet
 * overschreven worden.
 */

const bestaand = new Set([
  "afbeeldingen/werk.webp",
  "afbeeldingen/werk-600.webp",
  "afbeeldingen/werk-1200.webp",
  "afbeeldingen/zonder-varianten.webp",
]);

// 1. Naamgeving: het origineel houdt zijn naam, zodat oude verwijzingen blijven werken.
assert.equal(variantNaam("afbeeldingen/werk.webp", 600), "afbeeldingen/werk-600.webp");
assert.equal(variantNaam("/afbeeldingen/werk.webp", 1200), "/afbeeldingen/werk-1200.webp");

// 2. De gewone gang: srcset erbij, met de volle maat als grootste kandidaat.
const uit = zetSrcset('<img src="/afbeeldingen/werk.webp" alt="Werk">', bestaand);
assert.ok(uit.includes('srcset="'), "geen srcset gezet");
for (const b of VARIANT_BREEDTES) {
  assert.ok(uit.includes(`/afbeeldingen/werk-${b}.webp ${b}w`), `variant ${b} ontbreekt`);
}
assert.ok(uit.includes("/afbeeldingen/werk.webp 2000w"), "de volle maat ontbreekt als kandidaat");
assert.ok(uit.includes('sizes="'), "zonder sizes kiest de browser altijd de grootste");
assert.ok(uit.includes('alt="Werk"'), "de rest van de tag is beschadigd");

// 3. Bestaat er geen variant, dan blijft de tag met rust. Anders verwijst de
//    pagina naar bestanden die er niet zijn en krijg je gebroken beelden.
const geen = '<img src="/afbeeldingen/zonder-varianten.webp">';
assert.equal(zetSrcset(geen, bestaand), geen, "er wordt naar niet-bestaande varianten verwezen");

// 4. Handwerk wint: een img die al een srcset heeft blijft ongemoeid.
const eigen = '<img src="/afbeeldingen/werk.webp" srcset="/eigen.webp 800w">';
assert.equal(zetSrcset(eigen, bestaand), eigen, "een eigen srcset is overschreven");

// 5. Alleen /afbeeldingen/: logo's, iconen en beeld van buiten blijven zoals ze zijn.
for (const tag of [
  '<img src="/logo.svg">',
  '<img src="https://ergens.nl/foto.webp">',
  '<img src="/afbeeldingen/werk.jpg">',
]) {
  assert.equal(zetSrcset(tag, bestaand), tag, `onterecht aangeraakt: ${tag}`);
}

// 6. Het raster pakt de kleine maat. Dat is de hele winst bij 174 werken.
const galerij = await readFile(new URL("../lib/galerij.ts", import.meta.url), "utf8");
assert.ok(
  galerij.includes("variantNaam(f.bestand, GALERIJ_MINIATUUR)"),
  "het raster laadt nog steeds het volledige beeld per miniatuur"
);
assert.ok(
  /href="\$\{ontsnap\(f\.bestand\)\}"/.test(galerij),
  "de link achter een miniatuur wijst niet meer naar het volledige beeld"
);

// 7. De migratie schrijft ze ook echt weg, anders verwijst de srcset naar niets.
const voorbereiden = await readFile(new URL("../scripts/voorbereiden.mts", import.meta.url), "utf8");
assert.ok(voorbereiden.includes("VARIANT_BREEDTES"), "de migratie maakt geen varianten");

// 8. En de uitrol zet het erop, niet de AI: die zou het een keer vergeten.
const uitrol = await readFile(new URL("../lib/cloudflare.ts", import.meta.url), "utf8");
assert.ok(uitrol.includes("zetSrcset(html, beeldBestanden)"), "de uitrol zet geen srcset");

// 9. Is er maar één variant (omdat de bron te klein was voor de rest), dan
//    moet de srcset gewoon kloppen met die ene plus de volle maat. Anders
//    verwijst hij naar een bestand dat de migratie bewust niet maakte.
const smal = new Set(["afbeeldingen/smal.webp", "afbeeldingen/smal-600.webp"]);
const uitSmal = zetSrcset('<img src="/afbeeldingen/smal.webp">', smal);
assert.ok(uitSmal.includes("/afbeeldingen/smal-600.webp 600w"), "de enige variant ontbreekt");
assert.ok(!uitSmal.includes("smal-1200"), "verwijst naar een variant die niet bestaat");

// 10. En de migratie slaat een variant over die net zo groot zou zijn als het
//     origineel. Zonder dit schrijf je exacte kopieën weg.
assert.ok(
  voorbereiden.includes("if (volleBreedte <= breedte) continue;"),
  "de migratie schrijft varianten weg die even groot zijn als het origineel"
);

console.log("beeldmaten: ok");
