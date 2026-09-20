/**
 * Het portaal opent met de chat schermvullend, dus een aankondiging die
 * alleen bovenaan de pagina staat ziet bijna niemand (20-09). Hij moet dus
 * óók bovenaan het gesprek staan, met hetzelfde wegklik-geheugen.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const chat = await readFile("app/portal/Chat.tsx", "utf8");
assert.ok(/import Aankondigingen from "\.\/Aankondigingen"/.test(chat), "de chat kent het aankondigingen-blok niet");
assert.ok(/<Aankondigingen lijst=\{aankondigingen\} \/>/.test(chat), "de chat toont de aankondigingen niet");
assert.ok(
  chat.indexOf("<Aankondigingen lijst={aankondigingen} />") < chat.indexOf("berichten.map((m, i)"),
  "de aankondiging staat niet bóven het gesprek",
);

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
