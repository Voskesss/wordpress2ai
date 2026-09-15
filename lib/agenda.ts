/** Agenda-uitnodigingen voor webinars: .ics-bestand (Apple, Outlook-app en de rest) en klik-links voor Google en Outlook.com. */

export const WEBINAR_DUUR_MIN = 30;

type Sessie = { id: number; titel: string; wanneer: Date; meetLink: string | null };

function eind(w: Sessie): Date {
  return new Date(w.wanneer.getTime() + WEBINAR_DUUR_MIN * 60_000);
}

/** 20260921T180000Z */
function icsTijd(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsTekst(t: string): string {
  return t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function omschrijving(w: Sessie): string {
  return `Gratis webinar van WordSwap met Jos Klijnhout. Maximaal ${WEBINAR_DUUR_MIN} minuten, je hoeft niets voor te bereiden.\n${
    w.meetLink ? `Deelnemen: ${w.meetLink}` : "De deelnamelink krijg je op tijd per mail."
  }`;
}

export function webinarIcs(w: Sessie): string {
  const regels = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WordSwap//Webinar//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:webinar-${w.id}@wordswap.nl`,
    `DTSTAMP:${icsTijd(new Date())}`,
    `DTSTART:${icsTijd(w.wanneer)}`,
    `DTEND:${icsTijd(eind(w))}`,
    `SUMMARY:${icsTekst(`Webinar WordSwap: ${w.titel}`)}`,
    `DESCRIPTION:${icsTekst(omschrijving(w))}`,
    `LOCATION:${icsTekst(w.meetLink ?? "Online")}`,
    `URL:${w.meetLink ?? "https://wordswap.nl/webinar"}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Over een half uur begint het webinar van WordSwap",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return regels.join("\r\n") + "\r\n";
}

export function googleAgendaLink(w: Sessie): string {
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `Webinar WordSwap: ${w.titel}`,
    dates: `${icsTijd(w.wanneer)}/${icsTijd(eind(w))}`,
    details: omschrijving(w),
    location: w.meetLink ?? "Online",
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

export function outlookAgendaLink(w: Sessie): string {
  const q = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: `Webinar WordSwap: ${w.titel}`,
    startdt: w.wanneer.toISOString(),
    enddt: eind(w).toISOString(),
    body: omschrijving(w),
    location: w.meetLink ?? "Online",
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${q.toString()}`;
}
