import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * Cowork wilde zijn mails verbeteren en vroeg of Jos de prospects zou
 * weggooien, omdat de ingang een bekend bedrijf anders overslaat. Dat had
 * gekost: wie al gemaild is en wanneer, wie gereageerd heeft, en welke twaalf
 * buiten de bulk staan. Negen mensen hadden een tweede eerste mail gekregen.
 *
 * Nu ververst een nieuwe aanlevering de klaarstaande mail van een bedrijf dat
 * nog op "nieuw" staat, en blijft al het andere ongemoeid.
 */

const route = await readFile(new URL("../app/api/scan-prospects/route.ts", import.meta.url), "utf8");
const blok = route.slice(route.indexOf("if (uitslag.dubbel) {"), route.indexOf("const bevindingen ="));

// 1. Alleen wie nog nooit post kreeg wordt ververst
assert.ok(blok.includes('bekend?.status === "nieuw"'), "er wordt ook ververst bij een andere status");
assert.ok(
  !/bekend\?\.status !== "niet_mailen"|bekend\b[^\n]*niet_mailen/.test(blok),
  "de controle is omgekeerd opgeschreven: dan wordt alles behalve niet-mailen ververst"
);

// 2. Zonder nieuwe tekst gebeurt er niets
assert.ok(
  blok.includes("g.onderwerp?.trim() && g.mailtekst?.trim()"),
  "een aanlevering zonder mailtekst wist de klaarstaande mail"
);

// 3. Alleen mail 1 wordt aangeraakt
assert.ok(blok.includes("eq(prospectMails.nummer, 1)"), "ook mail 2 en 3 worden aangeraakt");

// 4. De prospect zelf wordt nooit verwijderd of van status veranderd
assert.ok(!/delete\(prospects\)/.test(blok), "de prospect zelf wordt verwijderd");
assert.ok(!/update\(prospects\)/.test(blok), "de status van een bekende prospect wordt overschreven");

// 5. De scan hoort terug te krijgen wat er gebeurd is
assert.ok(route.includes("ververst,"), "het antwoord meldt niet hoeveel er ververst zijn");
assert.match(route, /ververst\s*\n?\s*\?/, "er komt geen uitleg mee over wat er ververst is");

// 6. De bestaande rem blijft: zonder bevestigde bevinding geen mailstroom
assert.match(route, /magMailen\s*\?\s*"nieuw"\s*:\s*"niet_mailen"/, "de rem op niet-mailbare prospects is weg");

// 7. En de verwijderknop blijft weigeren iemand van de niet-mailen-lijst te wissen
const acties = await readFile(new URL("../app/admin/acties.ts", import.meta.url), "utf8");
const verwijder = acties.slice(acties.indexOf("export async function prospectVerwijderen"));
assert.ok(
  verwijder.slice(0, verwijder.indexOf("delete(prospects)")).includes('p.status === "niet_mailen"'),
  "iemand van de niet-mailen-lijst kan weer gewist worden"
);

console.log("scan-verversen: ok");
