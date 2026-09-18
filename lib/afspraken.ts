/**
 * Afspraken inplannen per klant. Jos zet per klant dagen klaar met een tijdvak
 * en een gespreksduur; de klant kiest een starttijd (steeds op het hele of
 * halve uur). Een bevestigde afspraak blokkeert die tijd bij álle klanten, dus
 * dubbel boeken kan niet.
 *
 * Alles hier is pure rekenwerk (geen database, geen mail), zodat het te testen
 * is. Datums zijn YYYY-MM-DD en tijden HH:MM in Nederlandse tijd.
 */

/** Starttijden staan altijd op :00 of :30, ook bij een gesprek van een uur. */
export const STAP_MINUTEN = 30;

export type Blok = { datum: string; van: string; tot: string; duurMinuten: number };
export type Bezet = { start: Date; duurMinuten: number };

/** "09:30" → 570 minuten na middernacht. */
export function minutenVan(tijd: string): number {
  const [u, m] = tijd.split(":").map(Number);
  return u * 60 + m;
}

/** 570 → "09:30". */
export function tijdVan(minuten: number): string {
  const u = Math.floor(minuten / 60);
  return `${String(u).padStart(2, "0")}:${String(minuten % 60).padStart(2, "0")}`;
}

/**
 * Datum en tijd in Nederlandse tijd omrekenen naar een echt tijdstip.
 * Zomer- en wintertijd gaan vanzelf goed: we zoeken de UTC-tijd waarvan de
 * Nederlandse klok precies deze datum en tijd aanwijst.
 */
export function nederlandseTijd(datum: string, tijd: string): Date {
  const [jaar, maand, dag] = datum.split("-").map(Number);
  const [uur, min] = tijd.split(":").map(Number);
  // Eerste gok: alsof Nederland op UTC zou lopen, daarna corrigeren met het
  // werkelijke verschil op dat moment (1 of 2 uur).
  const gok = Date.UTC(jaar, maand - 1, dag, uur, min);
  const verschil = zoneVerschilMs(new Date(gok));
  const raak = new Date(gok - verschil);
  // Vlak rond de klokwisseling kan het verschil net anders zijn: nog één ronde
  const tweede = zoneVerschilMs(raak);
  return tweede === verschil ? raak : new Date(gok - tweede);
}

/** Hoeveel loopt de Nederlandse klok voor op UTC, op dit moment (in ms). */
function zoneVerschilMs(moment: Date): number {
  const nl = new Date(moment.toLocaleString("en-US", { timeZone: "Europe/Amsterdam" }));
  const utc = new Date(moment.toLocaleString("en-US", { timeZone: "UTC" }));
  return nl.getTime() - utc.getTime();
}

/** Overlappen twee afspraken elkaar? */
export function overlapt(a: Bezet, b: Bezet): boolean {
  const aEind = a.start.getTime() + a.duurMinuten * 60_000;
  const bEind = b.start.getTime() + b.duurMinuten * 60_000;
  return a.start.getTime() < bEind && b.start.getTime() < aEind;
}

/**
 * De keuzemogelijkheden binnen één klaargezet tijdvak: starttijden per half
 * uur, waarbij het hele gesprek nog binnen het tijdvak past, de tijd nog niet
 * bezet is en het niet in het verleden ligt.
 */
export function vrijeStarttijden(blok: Blok, bezet: Bezet[], nu: Date): { tijd: string; start: Date }[] {
  const uit: { tijd: string; start: Date }[] = [];
  const laatsteStart = minutenVan(blok.tot) - blok.duurMinuten;
  for (let m = minutenVan(blok.van); m <= laatsteStart; m += STAP_MINUTEN) {
    if (m % STAP_MINUTEN !== 0) continue;
    const tijd = tijdVan(m);
    const start = nederlandseTijd(blok.datum, tijd);
    if (start.getTime() <= nu.getTime()) continue;
    const kandidaat = { start, duurMinuten: blok.duurMinuten };
    if (bezet.some((b) => overlapt(kandidaat, b))) continue;
    uit.push({ tijd, start });
  }
  return uit;
}

/** Alle keuzes over meerdere dagen, op volgorde van tijd. */
export function vrijeMomenten(
  blokken: Blok[],
  bezet: Bezet[],
  nu: Date,
): { datum: string; duurMinuten: number; tijden: { tijd: string; start: Date }[] }[] {
  return blokken
    .map((blok) => ({ datum: blok.datum, duurMinuten: blok.duurMinuten, tijden: vrijeStarttijden(blok, bezet, nu) }))
    .filter((d) => d.tijden.length > 0)
    .sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));
}

/** "dinsdag 22 september 2026 om 10:00" — voor mails en schermen. */
export function momentInWoorden(start: Date, duurMinuten: number): string {
  const opties: Intl.DateTimeFormatOptions = {
    timeZone: "Europe/Amsterdam",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  const dag = start.toLocaleDateString("nl-NL", opties);
  const tijd = start.toLocaleTimeString("nl-NL", { timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit" });
  const eind = new Date(start.getTime() + duurMinuten * 60_000).toLocaleTimeString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dag} van ${tijd} tot ${eind}`;
}

/** Duur in gewone taal: "een half uur", "1 uur", "1,5 uur". */
export function duurInWoorden(minuten: number): string {
  if (minuten === 30) return "een half uur";
  if (minuten === 60) return "1 uur";
  if (minuten % 60 === 0) return `${minuten / 60} uur`;
  return `${String(minuten / 60).replace(".", ",")} uur`;
}

function icsTijd(d: Date): string {
  return `${d.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
}

/** Tekst zoals een agenda hem verwacht: regels afbreken en komma's ontsnappen. */
function icsTekst(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (t) => `\\${t}`);
}

/**
 * Agendabestand (.ics) dat in elke agenda werkt: bijlage bij de bevestiging,
 * zodat Jos en de klant het met één klik in hun agenda zetten.
 */
export function maakIcs(afspraak: {
  id: number | string;
  start: Date;
  duurMinuten: number;
  titel: string;
  omschrijving: string;
  organisator: { naam: string; email: string };
  deelnemerEmail?: string | null;
  gemaaktOp?: Date;
}): string {
  const eind = new Date(afspraak.start.getTime() + afspraak.duurMinuten * 60_000);
  const regels = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WordSwap//Afspraken//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:afspraak-${afspraak.id}@wordswap.nl`,
    `DTSTAMP:${icsTijd(afspraak.gemaaktOp ?? afspraak.start)}`,
    `DTSTART:${icsTijd(afspraak.start)}`,
    `DTEND:${icsTijd(eind)}`,
    `SUMMARY:${icsTekst(afspraak.titel)}`,
    `DESCRIPTION:${icsTekst(afspraak.omschrijving)}`,
    `ORGANIZER;CN=${icsTekst(afspraak.organisator.naam)}:mailto:${afspraak.organisator.email}`,
    ...(afspraak.deelnemerEmail
      ? [`ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${afspraak.deelnemerEmail}`]
      : []),
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  // Agenda's willen CRLF als regeleinde
  return `${regels.join("\r\n")}\r\n`;
}

/** Hulp bij het klaarzetten: de eerstvolgende werkdagen als suggestie. */
export function komendeWerkdagen(aantal = 5, vanaf = new Date()): string[] {
  const uit: string[] = [];
  const d = new Date(vanaf);
  while (uit.length < aantal) {
    d.setDate(d.getDate() + 1);
    const dag = d.getDay();
    if (dag !== 0 && dag !== 6) uit.push(d.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }));
  }
  return uit;
}

