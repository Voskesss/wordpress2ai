import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { COOKIE_VERBERGER } from "../lib/cloudflare";

/**
 * Bij een migratie blijft de cookiemelding van de klant staan; die hoort bij
 * zijn site. Maar in het venster naast de chat stond hij elke keer opnieuw in
 * beeld, precies over de pagina die de eigenaar aan het aanpassen was.
 *
 * Dit verbergt hem daar, en alléén daar. Een echte bezoeker krijgt zijn
 * cookiemelding gewoon, want daar hangt een wettelijke plicht aan.
 */

// 1. Het werkt alleen binnen een iframe, en voegt alleen tóe.
//    Andersom (verbergen en terugdraaien voor bezoekers) zou bij een hapering
//    de melding van een klant laten verdwijnen.
assert.ok(COOKIE_VERBERGER.includes("parent!==window"), "de regel geldt niet alleen binnen het voorbeeldvenster");
assert.ok(
  !/display:none/.test(COOKIE_VERBERGER.split("parent!==window")[0]),
  "er wordt al iets verborgen voordat gecontroleerd is of dit het voorbeeld is",
);
assert.ok(COOKIE_VERBERGER.includes("createElement"), "de regel wordt niet toegevoegd maar teruggedraaid");
assert.ok(COOKIE_VERBERGER.includes("catch"), "een fout in dit stukje mag de pagina nooit breken");

// 2. Bekende meldingen staan erin, met hun eigen naam
for (const merk of ["cookie-notice", "CybotCookiebotDialog", "onetrust-banner-sdk", "cmplz-cookiebanner", "moove_gdpr", "iubenda", "didomi", "BorlabsCookie"]) {
  assert.ok(COOKIE_VERBERGER.includes(merk), `${merk} wordt niet herkend als cookiemelding`);
}

// 3. Nooit blind op het woord "cookie": dan gaat een cookiebeleid-pagina mee
assert.ok(
  !/\[class\*=|\[id\*=|\*="cookie"/.test(COOKIE_VERBERGER),
  "er wordt op een deel van een naam gezocht; dan verdwijnt ook gewone inhoud over cookies",
);

// 4. De rem op scrollen gaat eraf, anders zit het voorbeeld vast
assert.ok(COOKIE_VERBERGER.includes("overflow:auto"), "een melding die scrollen blokkeert laat het voorbeeld vastzitten");

// 5. Het gaat mee op beide plekken waar een pagina aan het voorbeeld wordt
//    geleverd: de uitgerolde site en onze eigen voorbeeldweg
const cf = await readFile(new URL("../lib/cloudflare.ts", import.meta.url), "utf8");
const weergave = await readFile(new URL("../app/site-weergave/[siteId]/[[...pad]]/route.ts", import.meta.url), "utf8");
assert.ok(cf.includes("COOKIE_VERBERGER + PAGINA_MELDER"), "de uitgerolde site krijgt het stukje niet mee");
assert.ok(weergave.includes("COOKIE_VERBERGER"), "onze eigen voorbeeldweg krijgt het stukje niet mee");

// 6. De huisregel blijft staan: de melding van de klant blijft in zijn site
const huisregels = await readFile(new URL("../lib/huisregels.ts", import.meta.url), "utf8");
assert.ok(
  /cookiebanner\) laat je altijd intact/.test(huisregels),
  "de regel dat de cookiemelding van de eigenaar blijft staan is verdwenen",
);

console.log("cookiemelding-voorbeeld: ok");
