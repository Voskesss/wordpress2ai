/**
 * Bewaakt het bijhalen van de hoofdversie aan het begin van een beurt op een
 * openstaand concept (gezien 19-09: "geel" gepubliceerd terwijl een oud
 * concept openstond; "oranje" daarna in dat oude concept → conflict pas
 * zichtbaar bij publiceren). Bronchecks, zelfde stijl als vangnet-basis.mts.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const route = await readFile("app/api/chat/route.ts", "utf8");

// 1. Het bijhalen gebeurt VÓÓR het laden van de werkmap van het concept —
//    anders werkt de beurt alsnog op de oude stand.
const mergePlek = route.indexOf("mergeBranches(site.githubRepo, openConcept.branch");
const laadPlek = route.indexOf("laadWerkmap(site.githubRepo, openConcept.branch)");
assert.ok(mergePlek > 0, "route haalt de hoofdversie niet bij in het concept (mergeBranches ontbreekt)");
assert.ok(laadPlek > 0, "werkmap-laadpunt niet gevonden");
assert.ok(mergePlek < laadPlek, "hoofdversie wordt pas ná het laden van de werkmap bijgehaald");

// 2. Een botsing stopt de beurt eerlijk: melding met de weggooi-route, en een
//    return vóórdat er ook maar iets wordt gebouwd.
const conflictBlok = route.slice(mergePlek, laadPlek);
assert.ok(conflictBlok.includes('"conflict"'), "conflictuitkomst wordt niet behandeld");
assert.ok(/Weggooien/.test(conflictBlok), "conflictmelding legt niet uit hoe de eigenaar verder kan (Weggooien)");
assert.ok(/return;/.test(conflictBlok), "beurt gaat na een conflict gewoon door in plaats van te stoppen");

// 3. Een storing bij het bijhalen mag een beurt nooit blokkeren: de catch
//    valt terug op doorwerken op de oude stand.
assert.ok(
  /catch[\s\S]{0,300}?"al-bij"/.test(conflictBlok),
  "storing bij het bijhalen blokkeert de beurt (geen terugval naar doorwerken)",
);

console.log("bijhalen-hoofdversie: volgorde, conflictmelding en terugval kloppen");
