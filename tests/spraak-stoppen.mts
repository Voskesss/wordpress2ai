import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * Inspreken ging aan maar niet meer uit. Het rode knopje bleef pulseren en
 * reageerde nergens op.
 *
 * Drie oorzaken, elk genoeg op zichzelf:
 * 1. We riepen stop() aan. Die vraagt de browser het laatste stukje nog af te
 *    maken, en op een telefoon gebeurt dat soms niet. abort() kapt er direct
 *    mee.
 * 2. Het knopje ging pas uit in onend, en die komt in datzelfde geval nooit.
 * 3. De knop stond op disabled zodra de AI bezig was, dus dan kon je er
 *    helemaal niets meer mee.
 */

const chat = await readFile(new URL("../app/portal/Chat.tsx", import.meta.url), "utf8");

const stoppen = chat.slice(chat.indexOf("function stopSpraak"), chat.indexOf("function wisselSpraak"));
assert.ok(stoppen.length > 50, "stopSpraak bestaat niet meer");

// 1. Direct afkappen, met stop() als terugval
assert.ok(stoppen.includes("abort"), "er wordt niet afgekapt; stop() blijft op een telefoon hangen");
assert.ok(stoppen.includes("rec?.stop()"), "zonder terugval op stop() doet het niets in een browser zonder abort");

// 2. Het knopje gaat meteen uit, niet pas in onend
assert.ok(
  stoppen.indexOf("setLuistert(false)") < stoppen.indexOf("abort"),
  "het knopje gaat pas uit nadat het afkappen gelukt is, en juist dat mislukt",
);

// 3. En de knop is bedienbaar zolang hij luistert
assert.ok(
  chat.includes("disabled={bezig && !luistert}"),
  "de microfoonknop staat uit terwijl hij luistert, dan kun je hem niet meer stoppen",
);

// 4. Versturen stopt het luisteren ook
const versturen = chat.slice(chat.indexOf("async function verstuur("), chat.indexOf("async function verstuur(") + 900);
assert.ok(versturen.includes("if (luistert) stopSpraak();"), "de microfoon blijft openstaan nadat je verstuurd hebt");

// 5. En het scherm verlaten ook
assert.ok(
  /useEffect\(\(\) => \{\s*return \(\) => \{\s*const rec = herkenningRef\.current;/.test(chat),
  "de microfoon blijft openstaan als je het scherm verlaat",
);

console.log("spraak-stoppen: ok");
