import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { nederlandseTijd } from "../lib/afspraken";

/**
 * Een afspraak met de hand vastleggen: Jos heeft het al per mail of telefoon
 * geregeld, de planlink is nooit gebruikt, en toch moet het gesprek in de
 * agenda staan.
 *
 * Twee dingen mogen hier nooit stuk: er gaat GEEN mail uit (de ander heeft
 * zijn afspraak al van Jos zelf gehad), en 14:00 is echt 14:00.
 */

// 1. Wandkloktijd blijft wandkloktijd, ook rond de zomertijd.
//    Zonder dit staat een afspraak een uur verkeerd in de agenda, en dat merk
//    je pas als er iemand voor niets zit te wachten.
const winter = nederlandseTijd("2026-01-15", "14:00");
assert.equal(winter.toISOString(), "2026-01-15T13:00:00.000Z", "wintertijd: 14:00 hoort 13:00 UTC te zijn");
const zomer = nederlandseTijd("2026-07-15", "14:00");
assert.equal(zomer.toISOString(), "2026-07-15T12:00:00.000Z", "zomertijd: 14:00 hoort 12:00 UTC te zijn");
// De dag van de overgang zelf (klok vooruit in de nacht van 28 op 29 maart)
assert.equal(
  nederlandseTijd("2026-03-29", "14:00").toISOString(),
  "2026-03-29T12:00:00.000Z",
  "op de dag dat de klok verzet wordt klopt het middaguur niet"
);

const bron = await readFile(new URL("../app/admin/acties-afspraken.ts", import.meta.url), "utf8");
const begin = bron.indexOf("export async function afspraakHandmatig");
assert.ok(begin > -1, "afspraakHandmatig bestaat niet");
const actie = bron.slice(begin, bron.indexOf("export async function", begin + 10));

// 2. Geen mail. Dit is de hele reden dat deze actie apart bestaat.
for (const verboden of ["mailVanJos", "bouwAfspraakBevestiging", "maakIcs"]) {
  assert.ok(!actie.includes(verboden), `afspraakHandmatig verstuurt of bouwt post (${verboden})`);
}

// 3. Meteen bevestigd, anders blokkeert hij het tijdvak niet in bezetteTijden()
//    en kan iemand anders via de planlink op hetzelfde moment boeken.
assert.ok(/status:\s*"bevestigd"/.test(actie), "de handmatige afspraak staat niet meteen op bevestigd");

// 4. De tijd via nederlandseTijd, niet met new Date() in elkaar geplakt.
assert.ok(actie.includes("nederlandseTijd(datum, tijd)"), "de tijd wordt niet via nederlandseTijd omgerekend");

// 5. Een half ingevuld formulier wordt geweigerd, anders krijg je een afspraak
//    op 1 januari 1970 in je agenda.
assert.ok(/\\d\{4\}-\\d\{2\}-\\d\{2\}/.test(actie), "de datum wordt niet gecontroleerd");
assert.ok(/\\d\{2\}:\\d\{2\}/.test(actie), "de tijd wordt niet gecontroleerd");

// 6. De leadstatus schuift mee naar "Afspraak gepland".
assert.ok(actie.includes("werkLeadStatusBijAfspraak"), "de leadstatus schuift niet mee");

// 7. En het formulier staat er ook echt, anders kan Jos er niet bij.
const vak = await readFile(new URL("../app/admin/leads/AfspraakVak.tsx", import.meta.url), "utf8");
assert.ok(vak.includes("action={afspraakHandmatig}"), "het formulier hangt niet aan de actie");
for (const veld of ['name="datum"', 'name="tijd"', 'name="duur"']) {
  assert.ok(vak.includes(veld), `veld ontbreekt in het formulier: ${veld}`);
}

console.log("afspraak-handmatig: ok");
