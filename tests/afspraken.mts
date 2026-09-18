import assert from "node:assert/strict";
import {
  duurInWoorden,
  maakIcs,
  momentInWoorden,
  nederlandseTijd,
  overlapt,
  vrijeMomenten,
  vrijeStarttijden,
} from "../lib/afspraken";

const nu = nederlandseTijd("2026-09-18", "09:00");

// Starttijden per half uur, en het hele gesprek moet binnen het tijdvak passen
{
  const uur = vrijeStarttijden({ datum: "2026-09-22", van: "09:00", tot: "11:00", duurMinuten: 60 }, [], nu);
  assert.deepEqual(uur.map((t) => t.tijd), ["09:00", "09:30", "10:00"]); // 10:30 zou tot 11:30 lopen
  const half = vrijeStarttijden({ datum: "2026-09-22", van: "09:00", tot: "10:30", duurMinuten: 30 }, [], nu);
  assert.deepEqual(half.map((t) => t.tijd), ["09:00", "09:30", "10:00"]);
}

// Een bevestigde afspraak blokkeert overlappende tijden — ook die van een andere klant
{
  const bezet = [{ start: nederlandseTijd("2026-09-22", "10:00"), duurMinuten: 60 }];
  const vrij = vrijeStarttijden({ datum: "2026-09-22", van: "09:00", tot: "12:00", duurMinuten: 60 }, bezet, nu);
  assert.deepEqual(vrij.map((t) => t.tijd), ["09:00", "11:00"]); // 09:30 en 10:30 lopen erdoorheen
}

// Tijden in het verleden verdwijnen vanzelf
{
  const vandaag = vrijeStarttijden({ datum: "2026-09-18", van: "08:00", tot: "11:00", duurMinuten: 30 }, [], nu);
  assert.deepEqual(vandaag.map((t) => t.tijd), ["09:30", "10:00", "10:30"]); // 09:00 is nu, dus weg
}

// Dagen zonder vrije tijd vallen weg; de rest staat op volgorde
{
  const bezet = [{ start: nederlandseTijd("2026-09-23", "09:00"), duurMinuten: 60 }];
  const dagen = vrijeMomenten(
    [
      { datum: "2026-09-24", van: "14:00", tot: "15:00", duurMinuten: 60 },
      { datum: "2026-09-23", van: "09:00", tot: "10:00", duurMinuten: 60 },
    ],
    bezet,
    nu,
  );
  assert.deepEqual(dagen.map((d) => d.datum), ["2026-09-24"]);
}

// Overlap-rekenwerk: aansluitende afspraken mogen wel
{
  const a = { start: nederlandseTijd("2026-09-22", "10:00"), duurMinuten: 30 };
  const b = { start: nederlandseTijd("2026-09-22", "10:30"), duurMinuten: 30 };
  assert.equal(overlapt(a, b), false);
  assert.equal(overlapt(a, { start: nederlandseTijd("2026-09-22", "10:15"), duurMinuten: 30 }), true);
}

// Zomertijd (+2) en wintertijd (+1) gaan goed
assert.equal(nederlandseTijd("2026-09-22", "10:00").toISOString(), "2026-09-22T08:00:00.000Z");
assert.equal(nederlandseTijd("2026-12-22", "10:00").toISOString(), "2026-12-22T09:00:00.000Z");
// De nacht van de klokwisseling (25-10-2026, 03:00 → 02:00)
assert.equal(nederlandseTijd("2026-10-26", "10:00").toISOString(), "2026-10-26T09:00:00.000Z");

// Leesbare tekst voor mail en scherm
assert.equal(
  momentInWoorden(nederlandseTijd("2026-09-22", "10:00"), 60),
  "dinsdag 22 september 2026 van 10:00 tot 11:00",
);
assert.equal(duurInWoorden(30), "een half uur");
assert.equal(duurInWoorden(60), "1 uur");
assert.equal(duurInWoorden(90), "1,5 uur");
assert.equal(duurInWoorden(120), "2 uur");

// Agendabestand: klopt qua tijden en is niet stuk te krijgen met komma's
{
  const ics = maakIcs({
    id: 12,
    start: nederlandseTijd("2026-09-22", "10:00"),
    duurMinuten: 60,
    titel: "WordSwap: je nieuwe website, samen doorlopen",
    omschrijving: "We bellen over je website.\nTot dan!",
    organisator: { naam: "Jos Klijnhout", email: "jos@wordswap.nl" },
    deelnemerEmail: "klant@example.nl",
    gemaaktOp: nederlandseTijd("2026-09-18", "09:00"),
  });
  assert.match(ics, /DTSTART:20260922T080000Z/);
  assert.match(ics, /DTEND:20260922T090000Z/);
  assert.match(ics, /SUMMARY:WordSwap: je nieuwe website\\, samen doorlopen/);
  assert.match(ics, /DESCRIPTION:We bellen over je website\.\\nTot dan!/);
  assert.match(ics, /ATTENDEE[^\r\n]*mailto:klant@example\.nl/);
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n") && ics.trimEnd().endsWith("END:VCALENDAR"));
  assert.ok(!ics.includes("\n\n"));
}

console.log("PASS afspraken: halfuur-starttijden, duur past binnen het tijdvak, dubbelboeken geblokkeerd, zomertijd en agendabestand.");
