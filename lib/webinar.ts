/**
 * Webinars en inschrijvingen. Een inschrijving (formulier "webinar") hoort bij
 * één sessie via het veld webinar_id. Oudere inschrijvingen hebben alleen de
 * titel (veld "webinar"); die koppelen we op titel zolang die uniek is.
 */

export type WebinarSessie = {
  id: number;
  titel: string;
  wanneer: Date;
};

export function formatWanneer(d: Date): string {
  return d.toLocaleString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
}

/** Leesbare naam van een sessie, zoals hij in mails en het admin staat. */
export function webinarLabel(w: WebinarSessie): string {
  return `${w.titel} (${formatWanneer(w.wanneer)})`;
}

/** Hoort een inschrijving bij deze sessie? Eerst op id, anders (oude
 * inschrijvingen zonder id) op titel. */
export function hoortBij(velden: Record<string, unknown>, w: WebinarSessie): boolean {
  const id = velden.webinar_id;
  if (id !== undefined && id !== null && String(id) !== "") return String(id) === String(w.id);
  return velden.webinar === w.titel;
}

/**
 * Datum + tijd zoals Jos ze invult (Nederlandse tijd) omzetten naar het echte moment.
 * De server draait in UTC; zonder deze omrekening zou 20:00 als 20:00 UTC (= 22:00 in NL)
 * worden opgeslagen. Houdt rekening met zomer- en wintertijd.
 */
export function amsterdamseTijdNaarDatum(datum: string, tijd: string): Date {
  const alsUtc = new Date(`${datum}T${tijd.length === 5 ? `${tijd}:00` : tijd}Z`);
  if (isNaN(alsUtc.getTime())) return alsUtc;
  const delen = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Amsterdam",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(alsUtc);
  const deel = (t: string) => Number(delen.find((p) => p.type === t)?.value);
  const inAmsterdam = Date.UTC(deel("year"), deel("month") - 1, deel("day"), deel("hour"), deel("minute"));
  return new Date(alsUtc.getTime() - (inAmsterdam - alsUtc.getTime()));
}
