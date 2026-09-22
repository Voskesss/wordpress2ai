import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { OPDRACHTEN } from "../app/portal/DemoOpdrachten";

/**
 * Wat een demo doodslaat is het lege invoerveld: iemand komt binnen, weet niet
 * wat hij moet typen, tikt iets halfslachtigs en gaat weg met de indruk dat
 * het tegenvalt. Deze knoppen halen dat weg: één klik en de opdracht gaat
 * meteen weg.
 *
 * Twee dingen bewaken: dat het alléén in de demo gebeurt (een klant moet zijn
 * eigen site nooit ongevraagd zien veranderen), en dat de voorbeelden
 * verschillend van aard blijven, want anders lijkt het één trucje.
 */

const chat = await readFile(new URL("../app/portal/Chat.tsx", import.meta.url), "utf8");
const strip = await readFile(new URL("../app/portal/DemoOpdrachten.tsx", import.meta.url), "utf8");
const welkom = await readFile(new URL("../app/portal/DemoWelkom.tsx", import.meta.url), "utf8");

// 1. De strip verschijnt alleen in de demo
assert.ok(
  chat.includes("{isDemo && !bezig && !concept && <DemoOpdrachten />}"),
  "de suggestieknoppen horen alleen in de demo, niet tijdens een lopende beurt en niet naast een open concept",
);

// 2. En direct versturen kan ook alleen daar
const luisteraar = chat.slice(chat.indexOf("function opStart"), chat.indexOf("window.addEventListener(\"wp2ai-startopdracht\""));
assert.ok(luisteraar.includes("if (direct && isDemo)"), "een suggestie kan buiten de demo ongevraagd verstuurd worden");
assert.ok(
  luisteraar.indexOf("verstuur(tekst)") > luisteraar.indexOf("isDemo"),
  "er wordt verstuurd voordat er gecontroleerd is of dit de demo is"
);

// 3. Een gewone tekst (zoals het portaal die stuurt) wordt alleen klaargezet
assert.ok(
  luisteraar.includes('typeof ruw === "string" ? false'),
  "een oude, kale opdracht zou nu ineens verstuurd kunnen worden"
);

// 4. Vier voorbeelden, verschillend van aard, allemaal echte opdrachten
assert.ok(OPDRACHTEN.length >= 4, "te weinig voorbeelden om breedte te laten zien");
for (const o of OPDRACHTEN) {
  assert.ok(o.tekst.length > 25, `te vage opdracht: ${o.kop}`);
  assert.ok(o.uitleg.length > 10, `${o.kop} legt niet uit wat er gebeurt`);
  assert.ok(!o.tekst.includes("—") && !o.uitleg.includes("—"), `lang streepje bij ${o.kop}`);
}
assert.equal(new Set(OPDRACHTEN.map((o) => o.tekst)).size, OPDRACHTEN.length, "twee voorbeelden doen hetzelfde");

// 5. Het welkomscherm zet geen tekst meer klaar: dan zou de bezoeker die
//    eerst moeten wegwerken voor hij op een suggestie kan klikken
assert.ok(
  !welkom.includes("wp2ai-startopdracht"),
  "het welkomscherm zet nog een opdracht klaar in de invoerbalk"
);
assert.ok(welkom.includes("onClick={sluit}"), "de welkomknop doet iets anders dan sluiten");

// 6. De strip is weg te klikken; niemand wil hem eeuwig zien
assert.ok(strip.includes("setWeg(true)"), "de suggesties zijn niet te verbergen");

// 7. Geen opdracht mag het menu raken. De demosite heeft geen delen-map, dus
//    het menu staat in elke pagina apart: één menu-item toevoegen is daar
//    zeven bestanden herschrijven en minuten wachten. Precies niet wat je een
//    bezoeker als eerste indruk wilt geven.
for (const o of OPDRACHTEN) {
  assert.ok(
    !/\bmenu\b|alle pagina|elke pagina|nieuwe pagina/i.test(o.tekst),
    `opdracht "${o.kop}" raakt meerdere pagina's en laat de demo traag ogen`
  );
}

// 8. De demo draait op hetzelfde model als een klantsite
const chatRoute = await readFile(new URL("../app/api/chat/route.ts", import.meta.url), "utf8");
assert.ok(
  !/isDemo\s*\?\s*"claude-haiku/.test(chatRoute),
  "de demo draait weer op het snelle model en oogt daardoor trager dan het product is"
);

// 9. De beheerder valt buiten de daggrens van de demo: hij moet hem kunnen
//    testen zonder na tien berichten buitengesloten te worden
const daggrens = chatRoute.slice(chatRoute.indexOf("vandaagBerichten.length >= 10"), chatRoute.indexOf("vandaagBerichten.length >= 10") + 120);
assert.ok(daggrens.includes("!(await isBeheerder())"), "de beheerder loopt tegen zijn eigen daggrens aan");

// 10. En de melding houdt zich aan de streepjesregel
const melding = chatRoute.slice(chatRoute.indexOf("Je hebt het maximum van de demo"), chatRoute.indexOf("Je hebt het maximum van de demo") + 200);
assert.ok(!melding.includes("—"), "lang streepje in de daggrens-melding");

// 11. De ingeklapte conceptstrook is alleen voor de demo op een telefoon.
//     Gemeten op 390px breed: de gewone strook is 176 pixels hoog, deze 48.
//     Een klant houdt de gewone strook, ook op zijn telefoon.
assert.ok(chat.includes("{concept && isMobiel && ("), "de ingeklapte strook staat niet achter isMobiel");
assert.ok(chat.includes("{concept && !isMobiel && ("), "de gewone strook hoort alleen op een computer");

// 12. En in die strook blijft elke actie bereikbaar; niets mag stilletjes
//     verdwijnen omdat het scherm smal is
const strook = await readFile(new URL("../app/portal/ConceptStripMobiel.tsx", import.meta.url), "utf8");
for (const [wat, zoek] of [
  ["publiceren", "onPubliceer"],
  ["het concept bekijken", "onBekijk"],
  ["stap terug", "onStapTerug"],
  ["concept weggooien", "onVerwerp"],
] as const) {
  assert.ok(strook.includes(zoek), `${wat} is niet meer te doen op een telefoon`);
}
// Elke knop moet een naam hebben voor een schermlezer: de twee pictogrammen
// zeggen zonder label niets.
assert.equal(
  (strook.match(/aria-label=/g) ?? []).length,
  3,
  "niet elke pictogramknop heeft een naam voor een schermlezer",
);
assert.ok(strook.includes("aria-expanded"), "het uitklapmenu meldt niet of het open staat");
// De twee pictogrammen staan in de balk zelf, niet alleen achter de puntjes
const balk = strook.slice(strook.indexOf("<div className=\"flex items-center"), strook.indexOf("meerOpen && ("));
for (const [wat, teken] of [["stap terug", "↩"], ["weggooien", "✕"]] as const) {
  assert.ok(balk.includes(teken), `${wat} staat niet als pictogram in de balk zelf`);
}
assert.ok(!strook.includes("—"), "lang streepje in de conceptstrook");

// 13. Weggooien is niet terug te draaien en staat op een telefoon als klein
//     kruisje naast "stap terug". Eén mistik kost al je werk, dus dat vragen
//     we na. Op de computer staat er een heel woord op de knop.
assert.ok(strook.includes("window.confirm("), "weggooien vraagt niets na, terwijl het naast stap terug staat");
assert.ok(
  strook.indexOf("weggooienMetVraag") < strook.indexOf("onClick={onStapTerug}") ||
    strook.includes("onClick={weggooienMetVraag}"),
  "de kruisjesknop gooit nog rechtstreeks weg",
);
assert.ok(!strook.includes("onClick={onVerwerp}"), "ergens gooit een knop nog zonder navraag weg");

// 14. Vingers zijn geen muisaanwijzers: de pictogrammen zijn minstens 40px
const maat = strook.match(/h-(\d+) w-\1 shrink-0/)?.[1];
assert.ok(Number(maat) >= 10, `pictogramknoppen van h-${maat} (${Number(maat) * 4}px) zijn te klein om te raken`);

console.log("demo-opdrachten: ok");
