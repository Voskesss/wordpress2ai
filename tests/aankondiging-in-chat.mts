/**
 * Het portaal opent met de chat schermvullend, dus een aankondiging die
 * alleen bovenaan de pagina staat ziet bijna niemand (20-09). Hij moet dus
 * óók bovenaan het gesprek staan, met hetzelfde wegklik-geheugen.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const chat = await readFile("app/portal/Chat.tsx", "utf8");
assert.ok(/import Aankondigingen from "\.\/Aankondigingen"/.test(chat), "de chat kent het aankondigingen-blok niet");
assert.ok(/<Aankondigingen lijst=\{aankondigingen\} overlay \/>/.test(chat), "de chat toont de aankondiging niet als overlay");

// En als overlay over de hele pagina, niet als meescrollend blokje in de lijst
const comp0 = await readFile("app/portal/Aankondigingen.tsx", "utf8");
assert.ok(/fixed inset-0/.test(comp0), "de aankondiging-overlay dekt de pagina niet af");
assert.ok(/Oké, ik heb het gezien/.test(comp0), "de wegklik-knop ontbreekt in de overlay");
assert.ok(/max-h-\[85dvh\] overflow-y-auto/.test(comp0), "lange aankondigingen passen niet op een telefoonscherm");

const page = await readFile("app/portal/page.tsx", "utf8");
assert.ok(/aankondigingen=\{aankondigingenLijst\}/.test(page), "het portaal geeft de aankondigingen niet aan de chat door");

// Eén wegklik-geheugen voor beide plekken: het component zelf bewaart in localStorage
const comp = await readFile("app/portal/Aankondigingen.tsx", "utf8");
assert.ok(/wordswap-aankondigingen-weg/.test(comp), "het wegklik-geheugen van aankondigingen is verdwenen");

console.log("aankondiging-in-chat: aankondigingen staan ook bovenaan het gesprek");

// De eerste status is neutraal: "Ik werk verder op het openstaande concept..."
// las als een niet-passend antwoord op elke willekeurige vraag (20-09).
{
  const route = await readFile("app/api/chat/route.ts", "utf8");
  assert.ok(!route.includes("Ik werk verder op het openstaande concept"), "de concept-openingsstatus staat er nog en overrulet elke vraag");
  assert.ok(/stuur\(\{ type: "status", tekst: "Momentje\.\.\." \}\);/.test(route), "de neutrale openingsstatus ontbreekt");
}
console.log("openingsstatus: neutraal, ongeacht de vraag");

// Wegklikken telt per ACCOUNT, niet alleen per browser: anders krijg je op
// je telefoon de hele stapel oude aankondigingen opnieuw (20-09).
{
  const comp = await readFile("app/portal/Aankondigingen.tsx", "utf8");
  assert.ok(/fetch\("\/api\/aankondiging-gezien"/.test(comp), "wegklikken wordt niet per account bewaard");
  const api = await readFile("app/api/aankondiging-gezien/route.ts", "utf8");
  assert.ok(/onConflictDoNothing/.test(api) && /auth\(\)/.test(api), "de gezien-route is niet veilig of niet idempotent");
  const page = await readFile("app/portal/page.tsx", "utf8");
  assert.ok(/aankondigingenGezien/.test(page) && /isNull\(aankondigingenGezien\.aankondigingId\)/.test(page), "het portaal filtert al-geziene aankondigingen niet weg");
  const schema = await readFile("db/schema.ts", "utf8");
  assert.ok(/aankondigingen_gezien/.test(schema), "de gezien-tabel ontbreekt in het schema");
}
console.log("aankondiging-gezien: wegklikken telt per account, op elk apparaat");

// Verwijderen van een aankondiging ruimt eerst de wegklik-administratie op,
// anders blokkeert de verwijzing in aankondigingen_gezien de verwijdering.
{
  const acties = await readFile("app/admin/acties.ts", "utf8");
  const blok = acties.slice(acties.indexOf("aankondigingBijwerken"), acties.indexOf("aankondigingBijwerken") + 1200);
  assert.ok(/delete\(aankondigingenGezien\)/.test(blok), "verwijderen ruimt de gezien-regels niet eerst op");
  assert.ok(
    blok.indexOf("delete(aankondigingenGezien)") < blok.indexOf("delete(aankondigingen)"),
    "de gezien-regels worden pas ná de aankondiging verwijderd",
  );
}
console.log("aankondiging-verwijderen: gezien-administratie gaat netjes eerst weg");
