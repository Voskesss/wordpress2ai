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
