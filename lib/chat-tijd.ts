/**
 * Hoeveel tijd krijgt één chatbeurt? Het WhatsApp-kanaal geeft een kortere
 * tijd mee, zodat de beurt ruim vóór de grens van het kanaal stopt en er
 * altijd nog iets opgeleverd kan worden. Het portaal geeft niets mee en hoort
 * de volle tijd te krijgen.
 */

/** Ondergrens: korter dan dit heeft geen zin, dan komt er nooit iets af. */
export const KORTSTE_BEURT_S = 120;

/** Een meegegeven maximum binnen veilige grenzen houden; niets meegegeven is
 * de volle tijd. Let op de nulwaarden: een ontbrekend formulierveld komt
 * binnen als null en Number(null) is 0, niet NaN. Dat werd stilletjes de
 * ondergrens, waardoor elke portaalbeurt mét bijlage al na 40 seconden afbrak
 * met de melding dat de tijdslimiet bereikt was. */
export function grensVan(waarde: unknown, volledig: number): number {
  if (waarde === null || waarde === undefined || waarde === "") return volledig;
  const n = Number(waarde);
  if (!Number.isFinite(n)) return volledig;
  return Math.min(volledig, Math.max(KORTSTE_BEURT_S, Math.round(n)));
}
