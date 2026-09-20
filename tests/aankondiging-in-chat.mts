/**
 * Aankondigingen van WordSwap: één keer schermvullend over de pagina heen,
 * op precies ÉÉN plek gerenderd. De eerdere opzet (balk op de pagina plus
 * een tweede exemplaar in de chat) had twee losse geheugentjes: klikte je de
 * één weg, dan bleef de ander staan (20-09). En wegklikken telt per account,
 * anders krijg je op je telefoon de hele stapel opnieuw.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

// 1. Precies één plek: het portaal, als overlay boven alles (chat = z-80)
const page = await readFile("app/portal/page.tsx", "utf8");
assert.ok(/<Aankondigingen lijst=\{aankondigingenLijst\} \/>/.test(page), "het portaal toont de aankondigingen niet");
const chat = await readFile("app/portal/Chat.tsx", "utf8");
assert.ok(!/Aankondigingen/.test(chat), "de chat rendert een twééde exemplaar — dan blijft er na wegklikken altijd één staan");
const comp = await readFile("app/portal/Aankondigingen.tsx", "utf8");
assert.ok(/fixed inset-0 z-\[90\]/.test(comp), "de overlay dekt de schermvullende chat (z-80) niet af");
assert.ok(/Oké, ik heb het gezien/.test(comp), "de sluitknop ontbreekt");
assert.ok(/max-h-\[85dvh\] overflow-y-auto/.test(comp), "lange aankondigingen passen niet op een telefoonscherm");
assert.ok(!/mb-6 space-y-3/.test(comp), "de oude balk-variant bestaat nog naast de overlay");

// 2. Wegklikken telt per account, met de browser als snelle eerste laag
assert.ok(/wordswap-aankondigingen-weg/.test(comp), "het browser-geheugen is verdwenen");
assert.ok(/fetch\("\/api\/aankondiging-gezien"/.test(comp), "wegklikken wordt niet per account bewaard");
const api = await readFile("app/api/aankondiging-gezien/route.ts", "utf8");
assert.ok(/onConflictDoNothing/.test(api) && /auth\(\)/.test(api), "de gezien-route is niet veilig of niet idempotent");
assert.ok(/aankondigingenGezien/.test(page) && /isNull\(aankondigingenGezien\.aankondigingId\)/.test(page), "het portaal filtert al-geziene aankondigingen niet weg");
const schema = await readFile("db/schema.ts", "utf8");
assert.ok(/aankondigingen_gezien/.test(schema), "de gezien-tabel ontbreekt in het schema");

// 3. Verwijderen ruimt eerst de gezien-administratie op (verwijzing blokkeerde anders)
const acties = await readFile("app/admin/acties.ts", "utf8");
const blok = acties.slice(acties.indexOf("aankondigingBijwerken"), acties.indexOf("aankondigingBijwerken") + 1200);
assert.ok(/delete\(aankondigingenGezien\)/.test(blok), "verwijderen ruimt de gezien-regels niet eerst op");
assert.ok(
  blok.indexOf("delete(aankondigingenGezien)") < blok.indexOf("delete(aankondigingen)"),
  "de gezien-regels worden pas ná de aankondiging verwijderd",
);

// 4. De eerste chatstatus blijft neutraal, ongeacht de vraag
const route = await readFile("app/api/chat/route.ts", "utf8");
assert.ok(!route.includes("Ik werk verder op het openstaande concept"), "de concept-openingsstatus overrulet weer elke vraag");
assert.ok(/stuur\(\{ type: "status", tekst: "Momentje\.\.\." \}\);/.test(route), "de neutrale openingsstatus ontbreekt");

console.log("aankondigingen: één overlay boven alles, wegklikken per account, verwijderen werkt, chatopening neutraal");
