import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isAfmelding, eigenDeel } from "../lib/afmelding";

/**
 * Wie terugmailde werd een warme lead. Ook wie terugmailde om met rust
 * gelaten te worden: die belandde met een 🎉 tussen de echte leads, met
 * opvolging en al.
 *
 * De valkuil zat in de aanhaling: onze eigen mail staat vaak onder het
 * antwoord, en daar staat de knop "Val mij niet meer lastig" in. Telde die
 * mee, dan gold élke reactie als afmelding en stopte de hele outreach.
 */

// 1. Echte afmeldverzoeken worden herkend
for (const zin of [
  "Graag verwijderen uit jullie bestand.",
  "haal me van die lijst aub",
  "Ik wil geen mail meer ontvangen",
  "Niet meer mailen alsjeblieft",
  "Stop met mailen.",
  "unsubscribe",
  "Please remove me from your list",
  "Afmelden graag",
]) {
  assert.ok(isAfmelding(null, zin), `niet herkend als afmelding: ${JSON.stringify(zin)}`);
}

// 2. Onze eigen knoptekst in de aanhaling telt niet mee
const metOnzeMail = `Hoi Jos, klinkt interessant. Kun je bellen?

Op 21 september 2026 schreef Jos van WordSwap:
Val mij niet meer lastig
Eén klik en je hoort nooit meer iets van ons`;
assert.equal(isAfmelding("Re: Even over je website", metOnzeMail), false,
  "onze eigen knoptekst in de aanhaling maakt van een geïnteresseerde een afmelding");

// 3. Ook zonder ">" maar mét een Van:-blok van Outlook
const outlook = `Ja hoor, graag meer informatie.

Van: Jos van WordSwap
Verzonden: maandag 21 september
Onderwerp: Even over je website
Val mij niet meer lastig`;
assert.equal(isAfmelding(null, outlook), false, "een Outlook-aanhaling wordt niet weggeknipt");
assert.ok(!eigenDeel(outlook).includes("val mij niet"), "eigenDeel laat de aanhaling staan");

// 4. Gewone reacties blijven gewone reacties
for (const zin of [
  "Interessant, wanneer kun je bellen?",
  "Wij hebben net een nieuwe site laten maken, maar bedankt.",
  "Kun je me wat meer vertellen over de kosten?",
  "Ik ben op vakantie tot 3 oktober.",
]) {
  assert.equal(isAfmelding(null, zin), false, `onterecht als afmelding gezien: ${JSON.stringify(zin)}`);
}

// 5. Een lege reactie is geen afmelding
assert.equal(isAfmelding(null, null), false);
assert.equal(isAfmelding("", "   "), false);

// 6. De promotie maakt er geen lead van maar zet hem op niet-mailen
const promotie = await readFile(new URL("../lib/prospect-promotie.ts", import.meta.url), "utf8");
const blok = promotie.slice(promotie.indexOf("isAfmelding(item"), promotie.indexOf("const [nieuweLead]"));
assert.ok(blok.includes('"niet_mailen"'), "een afmelding komt niet op de niet-mailen-lijst");
assert.ok(blok.includes("continue;"), "na een afmelding wordt alsnog een lead aangemaakt");
assert.ok(
  promotie.indexOf("isAfmelding(item") < promotie.indexOf("insert(leads)"),
  "de afmeldcontrole staat na het aanmaken van de lead"
);

// 7. Jos ziet het terug in het verslag van de ronde
const bijwerken = await readFile(new URL("../lib/leads-bijwerken.ts", import.meta.url), "utf8");
assert.ok(bijwerken.includes("uitslag.afgemeld.length"), "afmeldingen worden niet gemeld in het verslag");

console.log("afmelding: ok");
