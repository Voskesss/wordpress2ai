/**
 * Optimaal ontzorgd = basispakket + voorrang bij vragen + WhatsApp (besluit Jos
 * 30-09). De "30 minuten ondersteuning per maand" is overal weg: een belofte
 * die je moet bijhouden en waar mensen op gaan rekenen. Storingen aan onze
 * kant blijven voor iedereen gratis, in elk pakket.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PAKKETTEN, aanbod } from "../lib/aanbod";

assert.ok(!("minutenPerMaand" in PAKKETTEN.ontzorgd), "de minuten staan nog in de pakketdefinitie");
assert.equal(PAKKETTEN.ontzorgd.prijs, 39);
const alles = [aanbod.prijs, aanbod.inbegrepen, aanbod.aanvullingen].join(" ");
assert.ok(!/30 minuten|minuten ondersteuning|niet gebruikte minuten/i.test(alles), "de 30 minuten staan nog in het aanbod");
assert.ok(/voorrang/i.test(aanbod.inbegrepen) && /WhatsApp/.test(aanbod.inbegrepen), "voorrang of WhatsApp ontbreekt in de pakketbeschrijving");
assert.ok(/voor iedereen kosteloos/i.test(aanbod.inbegrepen), "dat storingen voor iedereen gratis zijn staat er niet bij");
for (const pad of ["app/prijzen/page.tsx", "app/layout.tsx", "app/voorwaarden/page.tsx", "lib/klant-mails.ts", "app/api/proef-ontzorgd/route.ts", "lib/aanbod.ts"]) {
  const t = await readFile(pad, "utf8");
  assert.ok(!/30 minuten|vast aantal minuten|niet gebruikte minuten/i.test(t), `${pad} noemt nog minuten ondersteuning`);
}
const prijzen = await readFile("app/prijzen/page.tsx", "utf8");
assert.ok(prijzen.includes("bij vragen helpen we jou als eerste") && prijzen.includes("via WhatsApp"), "de prijzenpagina mist voorrang of WhatsApp in de kaart van Optimaal ontzorgd");
console.log("pakket-ontzorgd: ok");
