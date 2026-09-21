import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * De chat opende op een breed scherm vanzelf schermvullend. In het portaal is
 * dat precies goed: de klant komt binnen om aan zijn site te werken. In de
 * admin niet: daar kom je meestal voor iets anders op de klantpagina, en dan
 * sprong het gesprek bij elke herlading over je scherm heen.
 */

const chat = await readFile(new URL("../app/portal/Chat.tsx", import.meta.url), "utf8");
const adminPagina = await readFile(new URL("../app/admin/klant/[id]/page.tsx", import.meta.url), "utf8");
const portaal = await readFile(new URL("../app/portal/page.tsx", import.meta.url), "utf8");

// 1. Het openen is een keuze geworden, niet een vaste regel
assert.match(chat, /startVolledig = true/, "de keuze hoort standaard aan te staan");
assert.match(
  chat,
  /if \(startVolledig && window\.innerWidth >= 1280\)/,
  "het openen kijkt niet naar de keuze",
);

// 2. De admin zet hem uit
assert.match(adminPagina, /startVolledig=\{false\}/, "admin opent nog steeds schermvullend");

// 3. Het portaal laat hem staan: daar is het gedrag gewenst, dus geen
//    startVolledig meegeven (of expliciet true)
const portaalChat = portaal.slice(portaal.indexOf("<Chat"));
assert.ok(
  !/startVolledig=\{false\}/.test(portaalChat.slice(0, 900)),
  "het portaal hoort schermvullend te blijven openen",
);

// 4. De knop om het zelf te doen blijft bestaan
assert.match(chat, /setVolledigScherm\(!volledigScherm\)/, "de knop Maak groot is verdwenen");
assert.match(chat, /Escape/, "met Escape moet je er nog uit kunnen");

console.log("chat-volledig: ok");
