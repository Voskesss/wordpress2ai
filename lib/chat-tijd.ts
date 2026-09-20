/**
 * Hoeveel tijd krijgt één chatbeurt? Het WhatsApp-kanaal geeft een kortere
 * tijd mee, zodat de beurt ruim vóór de grens van het kanaal stopt en er
 * altijd nog iets opgeleverd kan worden. Het portaal geeft niets mee en hoort
 * de volle tijd te krijgen.
 */

/** Ondergrens: korter dan dit heeft geen zin, dan komt er nooit iets af. */
export const KORTSTE_BEURT_S = 120;

/** Hoe lang een portaalbeurt hoogstens duurt vóór de agent zichzelf netjes
 * afrondt. Bewust ruim onder de harde grens van het platform (800 s): wie
 * langer bezig is, is aan het doorploeteren, en dan is een eerlijk "dit was
 * een grote klus, dit heb ik af" meer waard dan nog eens zes minuten wachten
 * (gezien 20-09: een beurt van negen minuten die nog niet klaar was). Grote
 * klussen leveren zo nog steeds op wat er staat; de eigenaar vraagt de rest
 * in een volgend bericht. */
export const PORTAAL_BEURT_S = 360;

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
