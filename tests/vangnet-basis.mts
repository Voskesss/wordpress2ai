/**
 * De vergelijkingsbasis van het vangnet. Dit is de stilste denkbare fout: als
 * de chatbeurt de stand van de site pas ophaalt NÁ het wegschrijven van de
 * wijziging, vergelijkt het vangnet de nieuwe versie met zichzelf. Er komt dan
 * nooit meer een waarschuwing, alles lijkt in orde, en niemand merkt het —
 * ook de klant niet, want die ziet gewoon geen melding.
 *
 * Draaiend uitproberen kan alleen met een echte beurt (AI, GitHub, deploy).
 * Daarom bewaken we hier de volgorde in de code zelf, plus de afspraak dat er
 * zonder basis níét stil wordt doorgegaan.
 * Draaien: node --import tsx tests/vangnet-basis.mts
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const route = await readFile("app/api/chat/route.ts", "utf8");

const basisGezet = route.indexOf("commitShaVan(");
const eerstePush = route.indexOf("pushBestanden(");
const vangnetGebruik = route.indexOf("vangnetBasisSha ??");

assert.ok(basisGezet > 0, "de beurt moet de stand van de site ophalen (commitShaVan)");
assert.ok(eerstePush > 0, "de beurt schrijft wijzigingen weg (pushBestanden)");
assert.ok(
  basisGezet < eerstePush,
  "de stand van de site moet worden opgehaald VÓÓR het wegschrijven — anders vergelijkt het vangnet de nieuwe versie met zichzelf en meldt het nooit meer iets",
);
assert.ok(
  vangnetGebruik > eerstePush,
  "het vangnet draait ná het wegschrijven, maar vergelijkt met de eerder opgehaalde stand",
);

// Zonder basis liever hoorbaar stoppen dan stil doorgaan: de foutmelding valt
// in de catch, en die stuurt op productie een seintje naar WordSwap.
assert.match(
  route,
  /if \(!basisRef\) throw new Error\([^)]*vangnet overgeslagen/,
  "zonder basis moet de beurt een fout gooien in plaats van stil niets te melden",
);
assert.match(
  route,
  /Dubbeling-vangnet uitgevallen/,
  "een uitgevallen vangnet moet gemeld worden aan WordSwap",
);
assert.match(
  route,
  /VERCEL_ENV === "production"[\s\S]{0,200}RESEND_API_KEY/,
  "dat seintje gaat alleen op productie de deur uit",
);

// De testomgeving laat zien wat het vangnet deed; op productie blijft dat weg
assert.match(
  route,
  /VERCEL_ENV !== "production"[\s\S]{0,80}vangnetDebug/,
  "de vangnet-regel is alleen voor de testomgeving",
);

console.log(
  "PASS vangnet-basis: de stand van de site wordt opgehaald vóór het wegschrijven en pas daarna vergeleken, zonder basis stopt de beurt hoorbaar, het seintje bij uitval gaat alleen op productie de deur uit, en de vangnet-regel blijft tot de testomgeving beperkt.",
);
