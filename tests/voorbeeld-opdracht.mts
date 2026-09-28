/**
 * Wens Jos 28-09: het voorbeeld in de chat-hint ("zet de openingstijden op
 * zaterdag tot 17:00") komt nu uit de echte pagina van de klant. Staan er
 * openingstijden, dan blijft de klassieker; anders een echte prijs, knop of
 * kop; en lukt er niets, dan de vaste zin als vangnet.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { voorbeeldOpdracht } from "../lib/voorbeeld-opdracht";

// Openingstijden op de site → het klassieke voorbeeld is dan gewoon raak
assert.equal(
  voorbeeldOpdracht(`<html><body><h2>Openingstijden</h2><p>Maandag 9-17</p></body></html>`),
  "zet de openingstijden op zaterdag tot 17:00",
);

// Geen openingstijden, wel een prijs → de prijs wint
assert.equal(
  voorbeeldOpdracht(`<html><body><h1>Rijles</h1><p>Autorijles € 62,50 per les</p><a href="/x">Gratis proefles</a></body></html>`),
  "pas de prijs van € 62,50 aan",
);

// Geen prijs, wel een knop → de knop, met de echte tekst erin
assert.equal(
  voorbeeldOpdracht(`<html><body><h1>Welkom bij ons</h1><a class="knop" href="/proefles">Gratis proefles</a></body></html>`),
  'maak de knop "Gratis proefles" opvallender',
);

// Nietszeggende knoppen ("Menu", "Lees meer") slaan we over, dan pakt hij de kop
assert.equal(
  voorbeeldOpdracht(`<html><body><a href="#">Menu</a><a href="#">Lees meer</a><h2>Leren rijden zonder stress</h2></body></html>`),
  'maak de tekst onder "Leren rijden zonder stress" wat korter',
);

// Een kop vol opmaak-tags wordt schone tekst
assert.equal(
  voorbeeldOpdracht(`<html><body><h1>Rij <span class="groen">ontspannen</span> weg</h1></body></html>`),
  'maak de tekst onder "Rij ontspannen weg" wat korter',
);

// Helemaal niets bruikbaars → vaste zin als vangnet, nooit leeg
assert.equal(voorbeeldOpdracht(`<html><body><p>x</p></body></html>`), "zet de openingstijden op zaterdag tot 17:00");
assert.equal(voorbeeldOpdracht(""), "zet de openingstijden op zaterdag tot 17:00");

// Een veel te lange of rare knoptekst komt niet in de zin terecht
{
  const uit = voorbeeldOpdracht(`<html><body><a href="#">${"heel ".repeat(30)}lang</a></body></html>`);
  assert.ok(!uit.includes("heel heel"), "een ellenlange knoptekst hoort niet in het voorbeeld");
}

// Bedrading in de chat: voorbeeld wordt opgehaald via de voorbeeldweergave
// van de site zelf, en de hint valt terug op de vaste zin
const chat = await readFile("app/portal/Chat.tsx", "utf8");
assert.ok(/hintVoorbeeld, setHintVoorbeeld/.test(chat), "de hint kent geen dynamisch voorbeeld");
assert.ok(/\/site-weergave\/\$\{previewAccess\}\//.test(chat), "het voorbeeld wordt niet uit de eigen site gelezen");
assert.ok(/voorbeeldOpdracht\(await res\.text\(\)\)/.test(chat), "de pagina-inhoud gaat niet door de voorbeeld-kiezer");
assert.ok(/\{hintVoorbeeld \?\? "zet de openingstijden op zaterdag tot 17:00"\}/.test(chat), "de vaste zin als vangnet ontbreekt in de hint");
assert.ok(!/Typ wat je veranderd wilt hebben — bijvoorbeeld/.test(chat), "het lange streepje is terug in de hinttekst");

console.log("Voorbeeld-opdracht: echte pagina-inhoud in de hint, vaste zin als vangnet");
