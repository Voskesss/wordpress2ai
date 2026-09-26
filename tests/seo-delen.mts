/**
 * SEO-uitbreiding (Jos 26-09): (1) deel-voorbeeld — hoe een pagina eruitziet
 * als iemand hem deelt via WhatsApp/Facebook (og-tags), instelbaar in het
 * Vindbaarheid-paneel met een foto uit de fotobank; (2) bedrijfsgegevens
 * voor Google en (3) alt-teksten via de chat, met huisregels zodat het
 * altijd op dezelfde manier gebeurt. Punt 4 (indexering-terugkoppeling)
 * staat bewust in de backlog.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { metaUit, zetMeta, zetDeelVoorbeeld, volledigAdres } from "../lib/deel-voorbeeld";

// 1a. Het echte pad: og-tags zetten, vervangen en weghalen
const kaal = `<html><head><title>Rijles</title></head><body></body></html>`;
{
  const met = zetDeelVoorbeeld(kaal, {
    kop: "Rijles bij Groene Golf",
    tekst: "Haal je rijbewijs relaxed.",
    fotoUrl: "https://test.nl/afbeeldingen/les.webp",
    paginaUrl: "https://test.nl/",
  });
  assert.equal(metaUit(met, "og:title"), "Rijles bij Groene Golf");
  assert.equal(metaUit(met, "og:description"), "Haal je rijbewijs relaxed.");
  assert.equal(metaUit(met, "og:image"), "https://test.nl/afbeeldingen/les.webp");
  assert.equal(metaUit(met, "og:url"), "https://test.nl/");
  assert.equal(metaUit(met, "twitter:card"), "summary_large_image", "zonder groot kaartje toont WhatsApp een piepklein thumbnailtje");

  // Vervangen in plaats van stapelen
  const anders = zetMeta(met, "og:title", "Nieuwe kop");
  assert.equal(metaUit(anders, "og:title"), "Nieuwe kop");
  assert.equal((anders.match(/og:title/g) ?? []).length, 1, "og:title hoort vervangen te worden, niet erbij gezet");

  // Leeg = weghalen, en dan vallen deel-apps terug op titel/omschrijving
  const weg = zetDeelVoorbeeld(met, { kop: "", tekst: "", fotoUrl: "" });
  assert.equal(metaUit(weg, "og:title"), "");
  assert.equal(metaUit(weg, "og:image"), "");
  assert.equal(metaUit(weg, "twitter:card"), "", "zonder foto hoort ook de twitter-kaart weg");
}
// Aanhalingstekens in de kop mogen de tag niet breken
{
  const met = zetMeta(kaal, "og:title", `Zo "relaxed" haal je hem`);
  assert.ok(met.includes("&quot;relaxed&quot;"), "aanhalingstekens horen ontsnapt te worden");
}
assert.equal(volledigAdres("https://test.nl/", "/afbeeldingen/x.webp"), "https://test.nl/afbeeldingen/x.webp");

// 1b. De route leest en schrijft de deel-velden en zet de foto om naar een
// volledig adres (deel-apps snappen geen relatieve paden)
const route = await readFile("app/api/vindbaarheid/route.ts", "utf8");
assert.ok(/deelKop: metaUit\(inhoud, "og:title"\)/.test(route), "de GET geeft het deel-voorbeeld niet terug");
assert.ok(/zetDeelVoorbeeld\(inhoud, velden\)/.test(route), "de POST schrijft het deel-voorbeeld niet");
assert.ok(/volledigAdres\(domein, fotoPad\)/.test(route), "de foto wordt niet omgezet naar een volledig adres");
assert.ok(/fotoPad\.includes\("\.\."\)/.test(route), "de padcontrole op de deel-foto ontbreekt");
assert.ok(/het deel-voorbeeld \(WhatsApp\/Facebook\)/.test(route), "de wijziging wordt niet benoemd in de uitleg");

// 1c. Het paneel: voorbeeldkaartje, foto kiezen uit de fotobank, en de
// velden gaan alleen mee als het blok is opengeklapt (anders wis je
// per ongeluk bestaande tags)
const paneel = await readFile("app/portal/Vindbaarheid.tsx", "utf8");
assert.ok(/Delen via WhatsApp en Facebook/.test(paneel), "het delen-blok ontbreekt in het paneel");
// Het paneel is een overlay over de hele pagina (26-09: hij groeide uit de
// chatkolom en de bovenkant was onbereikbaar), scrollbaar binnen het scherm
assert.ok(/fixed inset-0 z-\[85\]/.test(paneel), "het paneel is geen overlay over de pagina meer");
assert.ok(/max-h-\[85dvh\][^"]*overflow-y-auto/.test(paneel), "het paneel scrolt niet binnen het scherm (kleine schermen)");
assert.ok(/e\.stopPropagation\(\)/.test(paneel), "klikken ín de kaart zou hem sluiten (stopPropagation weg)");
assert.ok(/\/api\/fotobank\?siteId=/.test(paneel), "de fotokiezer haalt de fotobank niet op");
assert.ok(/\.\.\.\(deelOpen \? \{ deelKop, deelTekst, deelFoto \} : \{\}\)/.test(paneel), "de deel-velden gaan ook mee als het blok dicht is (wist bestaande tags)");

// 2+3. De chat-ingangen en de huisregels erachter
assert.ok(/Bedrijfsgegevens voor Google/.test(paneel), "de bedrijfsgegevens-knop ontbreekt");
assert.ok(/Alt-teksten controleren/.test(paneel), "de alt-teksten-knop ontbreekt");
assert.ok(/onOpdracht\("Zet mijn bedrijfsgegevens klaar voor Google/.test(paneel), "de bedrijfsgegevens-knop stuurt geen kant-en-klare opdracht");
const chat = await readFile("app/portal/Chat.tsx", "utf8");
assert.ok(/onOpdracht=\{\(tekst\) => \{/.test(chat), "de chat vangt de paneel-opdrachten niet op");
const huisregels = await readFile("lib/huisregels.ts", "utf8");
assert.ok(/BEDRIJFSGEGEVENS VOOR GOOGLE/.test(huisregels), "de huisregel voor bedrijfsgegevens ontbreekt");
assert.ok(/id="bedrijfsgegevens"/.test(huisregels), "zonder vast script-id stapelen er meerdere JSON-LD-blokken op");
assert.ok(/verzin NOOIT een adres, telefoonnummer of openingstijd/.test(huisregels), "de nooit-verzinnen-regel ontbreekt bij bedrijfsgegevens");
assert.ok(/ALT-TEKSTEN CONTROLEREN KAN/.test(huisregels), "de huisregel voor de alt-teksten-controle ontbreekt");
assert.ok(/decoratieve beelden krijgen alt=""/.test(huisregels), "de regel voor decoratieve beelden ontbreekt");

console.log("SEO-delen: og-tags door het echte pad, paneel, chat-ingangen en huisregels kloppen");
