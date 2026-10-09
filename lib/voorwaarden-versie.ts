/**
 * Versies van de algemene voorwaarden (Jos, 09-10-2026). De nieuwe tekst
 * (aanvullingen voor de beroepsaansprakelijkheidsverzekering) staat online
 * vanaf nu, maar geldt pas vanaf INGANG: wezenlijke wijzigingen kondigen we
 * volgens art. 13 minimaal een maand vooraf aan. Tot dan geldt de vorige versie.
 *
 * Een akkoord (vinkje bij opleveringsakkoord of eerste betaling) slaan we op
 * met VOORWAARDEN_VERSIE: dat is de tekst die de klant op dat moment te zien kreeg.
 */
export const VOORWAARDEN_VERSIE = "2026-11-09";
export const VOORWAARDEN_INGANG = "2026-11-09";
export const VORIGE_VERSIE = "2026-09-17";
export const VORIGE_PAD = "/voorwaarden/17-september-2026";
export const VOORWAARDEN_SOORT = "algemene-voorwaarden";

/** Geldt de nieuwe versie al? Datum als YYYY-MM-DD, in Nederlandse tijd. */
export function nieuweVersieGeldt(nu = new Date()): boolean {
  const vandaag = nu.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  return vandaag >= VOORWAARDEN_INGANG;
}
