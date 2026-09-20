/**
 * "Klaar" mag pas aan het eind. De chat streamt zijn tekst meteen naar het
 * scherm, dus een tussenzin als "Klaar. Ik heb de video op twee plekken
 * gezet" leest als eindantwoord terwijl de agent daarna nog minuten
 * doorwerkt (gezien 20-09: daarna volgde nog stap 19, 200 seconden).
 * Twee kanten: de instructie aan de AI, en de weergave in het portaal.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const route = await readFile("app/api/chat/route.ts", "utf8");
const chat = await readFile("app/portal/Chat.tsx", "utf8");

// 1. De AI krijgt de regel mee, vóór de andere gespreksregels
assert.ok(route.includes('"KLAAR" ZEG JE PAS ALS JE KLAAR BENT'), "de regel over afronden ontbreekt in de systeemprompt");
assert.ok(
  route.indexOf('"KLAAR" ZEG JE PAS') < route.indexOf("KORT ANTWOORD VAN DE EIGENAAR"),
  "de regel staat niet bij de andere gespreksregels",
);

// 2. Tekst die binnenkomt terwijl er gewerkt wordt, ziet er niet uit als een
//    eindantwoord (rustige stijl + kopregel).
const live = chat.slice(chat.indexOf("{bezig && liveTekst && ("), chat.indexOf("{bezig && liveTekst && (") + 700);
assert.ok(/Terwijl ik werk/.test(live), "lopende tekst krijgt geen kopregel die zegt dat het nog niet af is");
assert.ok(!/text-stone-800/.test(live), "lopende tekst wordt nog als gewoon eindantwoord opgemaakt");

console.log("klaar-pas-als-klaar: instructie staat er, en lopende tekst leest niet als eindantwoord");
