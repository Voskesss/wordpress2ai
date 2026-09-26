/**
 * Kieskaartjes met beeld (wens Jos 26-09, via Aimia): "ik wil kunnen kiezen
 * uit icoontjes die jij maakt". De chat levert per variant een regel
 * KEUZES-BEELD: naam :: <svg/> en het portaal toont die als aanklikbare
 * kaartjes. Dit test het ECHTE pad: de parser en de svg-sanering zelf,
 * plus de bedrading (huisregel, weergave, WhatsApp-terugval) en de
 * publiceer-rem voor het oudere pagina-keuzeblok (wp2ai-keuzeblok).
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { parseKeuzesBeeld, saneerSvg, MAX_KAARTJES } from "../lib/keuze-beeld";
import { splitsKeuzes } from "../lib/whatsapp/berichten";

const okSvg = `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#7c3aed" stroke-width="2"/></svg>`;

// 1. Het echte pad: twee nette regels worden twee kaartjes, de tekst wordt schoon
{
  const bericht = `Hier zijn twee icoontjes in je huisstijl:\nKEUZES-BEELD: Sleutel :: ${okSvg}\nKEUZES-BEELD: Tandwiel :: ${okSvg}\nKEUZES: ✏️ Ik wil iets anders`;
  const { schoon, kaartjes } = parseKeuzesBeeld(bericht);
  assert.equal(kaartjes.length, 2, "twee nette regels horen twee kaartjes te geven");
  assert.equal(kaartjes[0].naam, "Sleutel");
  assert.equal(kaartjes[1].svg, okSvg);
  assert.ok(!schoon.includes("KEUZES-BEELD"), "de KEUZES-BEELD-regels horen uit de tekst te verdwijnen");
  assert.ok(schoon.includes("KEUZES: ✏️"), "de gewone KEUZES-regel moet blijven staan voor de knoppen-parser");
}

// 2. De sanering weigert alles waarmee een kaartje meer zou zijn dan een plaatje
for (const [kapot, waarom] of [
  [`<svg viewBox="0 0 24 24"><script>alert(1)</script></svg>`, "script"],
  [`<svg viewBox="0 0 24 24"><circle cx="1" cy="1" r="1" onclick="x()"/></svg>`, "on-attribuut"],
  [`<svg viewBox="0 0 24 24"><a href="https://x"><circle cx="1" cy="1" r="1"/></a></svg>`, "href/link"],
  [`<svg viewBox="0 0 24 24"><use xlink:href="#x"/></svg>`, "use/xlink"],
  [`<svg viewBox="0 0 24 24"><foreignObject><div>x</div></foreignObject></svg>`, "foreignObject"],
  [`<svg viewBox="0 0 24 24"><image href="data:image/png;base64,x"/></svg>`, "image/data-uri"],
  [`<svg viewBox="0 0 24 24"><style>*{fill:red}</style></svg>`, "style-element"],
  [`<svg viewBox="0 0 24 24"><!-- x --><circle cx="1" cy="1" r="1"/></svg>`, "commentaar"],
  [`<svg><circle cx="1" cy="1" r="1"/></svg>`, "zonder viewBox (schaalt niet)"],
  [`<svg viewBox="0 0 24 24"><rect width="9" height="9" fill="url( 'https://x' )"/></svg>`, "externe url in fill"],
  [`<svg viewBox="0 0 24 24">${"<circle cx='1' cy='1' r='1'/>".repeat(200)}</svg>`, "te groot"],
] as const) {
  assert.equal(saneerSvg(kapot), null, `de sanering laat dit door: ${waarom}`);
}
assert.equal(saneerSvg(okSvg), okSvg, "een net icoon met viewBox hoort er wél doorheen");
assert.ok(
  saneerSvg(`<svg viewBox="0 0 24 24"><defs><linearGradient id="g"><stop offset="0" stop-color="#7c3aed"/></linearGradient></defs><rect width="24" height="24" fill="url(#g)"/></svg>`),
  "een kleurverloop met eigen id hoort gewoon te mogen (kleurstalen)",
);

// 3. Een kapotte regel verdwijnt uit de tekst maar wordt géén kaartje
{
  const { schoon, kaartjes } = parseKeuzesBeeld(`Kijk:\nKEUZES-BEELD: Boef :: <svg viewBox="0 0 1 1"><script>x</script></svg>\nKlaar.`);
  assert.equal(kaartjes.length, 0, "een afgekeurde svg mag geen kaartje worden");
  assert.ok(!schoon.includes("script"), "de afgekeurde regel hoort niet als platte tekst te blijven staan");
}

// 4. Bovengrens: nooit meer dan het maximum aantal kaartjes
{
  const regels = Array.from({ length: 20 }, (_, i) => `KEUZES-BEELD: Icoon ${i} :: ${okSvg}`).join("\n");
  assert.equal(parseKeuzesBeeld(regels).kaartjes.length, MAX_KAARTJES, "de bovengrens op het aantal kaartjes werkt niet");
}

// 5. WhatsApp kan geen svg tonen: daar worden de namen gewone keuzes
{
  const { schoon, keuzes } = splitsKeuzes(`Welke wil je?\nKEUZES-BEELD: Sleutel :: ${okSvg}\nKEUZES-BEELD: Tandwiel :: ${okSvg}`);
  assert.deepEqual(keuzes, ["Sleutel", "Tandwiel"], "de kaartjes horen in WhatsApp een keuzelijst te worden");
  assert.ok(!schoon.includes("svg"), "er mag geen svg-code in het WhatsApp-bericht lekken");
}

// 6. Bedrading in het portaal: kaartjes worden aanklikbaar gerenderd en
// een tik stuurt de keuze als gewoon bericht terug
const chat = await readFile("app/portal/Chat.tsx", "utf8");
assert.ok(/parseKeuzesBeeld/.test(chat), "de chat gebruikt de kaartjes-parser niet");
assert.ok(/kaartjes\.map\(\(kaart\)/.test(chat), "de kaartjes worden niet gerenderd");
assert.ok(/verstuur\(`Ik kies "\$\{kaart\.naam\}"`\)/.test(chat), "een tik op een kaartje verstuurt de keuze niet als bericht");
assert.ok(/dangerouslySetInnerHTML=\{\{ __html: kaart\.svg \}\}/.test(chat), "de gesaneerde svg wordt niet getoond");
// Het chatvenster blijft open zolang er kaartjes op een antwoord staan
assert.equal((chat.match(/parseKeuzesBeeld\([^)]*\)\.kaartjes\.length > 0/g) ?? []).length, 3, "niet elke chat-open-check telt de kaartjes mee");
// Zichtbare ingang achter de drie puntjes (wens Jos 26-09): een knop die de
// startzin klaarzet zonder al getypte tekst te overschrijven
assert.ok(/aria-label="Icoontjes laten maken"/.test(chat), "de icoontjes-knop achter de drie puntjes ontbreekt");
assert.ok(/v\.trim\(\) \? v : "Maak een paar icoontjes waar ik uit kan kiezen voor "/.test(chat), "de startzin ontbreekt of overschrijft getypte tekst");

// 7. De huisregel: kaartjes zijn de standaard, het pagina-keuzeblok de
// uitzondering mét verplichte marker
const route = await readFile("app/api/chat/route.ts", "utf8");
assert.ok(/KIESKAARTJES MET BEELD/.test(route), "de huisregel voor kieskaartjes ontbreekt");
assert.ok(/KEUZES-BEELD: <korte naam/.test(route), "het exacte regelformaat staat niet in de huisregel");
assert.ok(/wp2ai-keuzeblok/.test(route), "de verplichte marker voor het pagina-keuzeblok staat niet in de huisregel");
assert.ok(/[Ww]ijzig bij het aanbieden dus nog NIETS/.test(route), "de regel dat aanbieden geen wijziging is ontbreekt");

// 8. De publiceer-rem: een pagina met een openstaand keuzeblok gaat niet live
const pub = await readFile("app/api/publiceer/route.ts", "utf8");
assert.ok(/if \(inhoud\.includes\("wp2ai-keuzeblok"\)\)/.test(pub), "de publiceer-route toetst de pagina-inhoud niet echt op de keuzeblok-marker");
assert.ok(/status === "concept"/.test(pub.slice(pub.indexOf("Keuzeblok-bewaking"))), "de rem moet alleen vóór de merge gelden (bij een herkansing zit het al in main)");
assert.ok(/leesBestand\(rij\.site\.githubRepo, pad, rij\.change\.branch\)/.test(pub), "de rem leest de pagina's niet van de conceptbranch");
{
  const bewaking = pub.slice(pub.indexOf("Keuzeblok-bewaking"));
  assert.ok(/status: 409/.test(bewaking.slice(0, bewaking.indexOf("isDemo"))), "een openstaand keuzeblok hoort publiceren te weigeren met een nette melding");
}

console.log("Kieskaartjes: parser, sanering, WhatsApp-terugval, huisregel en publiceer-rem kloppen");
