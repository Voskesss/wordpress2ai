/**
 * Opzeggen met een vaste einddatum, zodat het systeem doet wat we beloven:
 * er wordt niets meer afgeschreven, de website blijft werken tot het einde van
 * de betaalde periode en blijft daarna nóg een maand online (rustig verhuizen).
 * Tot die tijd kan de opzegging ongedaan gemaakt worden.
 *
 * De incasso blijft bij Mollie staan tot vlak vóór de eerstvolgende
 * afschrijving en wordt dan door de dagelijkse cron gestopt. Zo wordt er nooit
 * nog een keer afgeschreven, terwijl de machtiging intact blijft: bedenkt
 * iemand zich, dan loopt het abonnement gewoon door zonder nieuwe betaallink.
 *
 * Alle datums zijn YYYY-MM-DD (Nederlandse tijdzone), net als bij Mollie.
 */

/** Zoveel dagen vóór de eerstvolgende afschrijving stoppen we de incasso bij
 * Mollie: ruim genoeg dat er nooit nog een keer wordt afgeschreven, ook niet
 * als de dagelijkse cron een keer overslaat. */
export const STOP_MARGE_DAGEN = 2;

/** Dezelfde dag, één maand later; loopt de maand niet zo ver, dan de laatste dag. */
export function maandErbij(datum: string): string {
  const [jaar, maand, dag] = datum.split("-").map(Number);
  // maand is 1-gebaseerd; dag 0 van de maand daarna is de laatste dag ervan
  const laatsteDagVolgendeMaand = new Date(Date.UTC(jaar, maand + 1, 0)).getUTCDate();
  const d = new Date(Date.UTC(jaar, maand, Math.min(dag, laatsteDagVolgendeMaand)));
  return d.toISOString().slice(0, 10);
}

export type OpzegDatums = {
  /** Tot wanneer is er betaald: de site blijft gewoon te gebruiken. */
  betaaldTot: string;
  /** Vanaf deze dag mag de website offline: betaalde periode plus één maand. */
  offlineNa: string;
};

/** Datums bij een opzegging. Zonder lopende incasso (geen volgende afschrijving
 * bekend) rekenen we vanaf vandaag, zodat er altijd een einddatum vastligt. */
export function opzegDatums(betaaldTot: string | null, vandaag: string): OpzegDatums {
  const tot = betaaldTot && betaaldTot >= vandaag ? betaaldTot : vandaag;
  return { betaaldTot: tot, offlineNa: maandErbij(tot) };
}

/** Mag de klant de website nog aanpassen? Tot en met de laatste betaalde dag. */
export function magNogWerken(betaaldTot: string | null, vandaag: string): boolean {
  return !betaaldTot || vandaag <= betaaldTot;
}

/** Mag de website offline? Pas na de extra maand. */
export function magOffline(offlineNa: string | null, vandaag: string): boolean {
  return Boolean(offlineNa && vandaag >= offlineNa);
}

/** Startdatum voor de incasso als een opzegging wordt teruggedraaid: verder
 * waar hij gebleven was (de eerstvolgende afschrijfdatum), en nooit in het
 * verleden — dan pas vanaf morgen. */
export function herstartDatum(betaaldTot: string | null, vandaag: string): string {
  return betaaldTot && betaaldTot > vandaag ? betaaldTot : dagErbij(vandaag);
}

/** Zoveel dagen later (YYYY-MM-DD); een negatief aantal gaat terug in de tijd. */
export function dagErbij(datum: string, aantal = 1): string {
  const [jaar, maand, dag] = datum.split("-").map(Number);
  return new Date(Date.UTC(jaar, maand - 1, dag + aantal)).toISOString().slice(0, 10);
}

/** Wanneer de incasso bij Mollie gestopt wordt: net vóór de eerstvolgende
 * afschrijving, en nooit in het verleden (dan vandaag, dus meteen). */
export function stopIncassoOp(betaaldTot: string | null, vandaag: string): string {
  if (!betaaldTot) return vandaag;
  const stop = dagErbij(betaaldTot, -STOP_MARGE_DAGEN);
  return stop < vandaag ? vandaag : stop;
}

/** Datum in gewone taal: "12 oktober 2026". */
export function datumInWoorden(datum: string): string {
  return new Date(`${datum}T12:00:00`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
