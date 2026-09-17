/**
 * Het AI-maandbudget van een site: het vaste bedrag per maand, plus eventueel
 * een eenmalige verhoging voor één bepaalde maand. Die extra ruimte vervalt
 * vanzelf zodra de maand voorbij is — niemand hoeft hem terug te zetten.
 */

export type BudgetSite = {
  aiMaandbudgetUsd: number;
  /** Eenmalige extra ruimte in hele dollars */
  aiExtraUsd: number | null;
  /** De maand (YYYY-MM) waarvoor die extra ruimte geldt */
  aiExtraMaand: string | null;
};

/** Geldt de eenmalige verhoging nog in deze maand? */
export function extraGeldt(site: BudgetSite, maand: string): boolean {
  return Boolean(site.aiExtraUsd && site.aiExtraUsd > 0 && site.aiExtraMaand === maand);
}

/** Het budget dat deze maand echt geldt (vast bedrag plus eenmalige extra). */
export function maandbudgetVoor(site: BudgetSite, maand: string): number {
  return site.aiMaandbudgetUsd + (extraGeldt(site, maand) ? (site.aiExtraUsd ?? 0) : 0);
}

/** Huidige maand als YYYY-MM (Nederlandse tijdzone, zoals de rest van de app). */
export function huidigeMaand(nu = new Date()): string {
  return nu.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }).slice(0, 7);
}

/** Eerste dag van de maand erna: dan vervalt de extra ruimte. */
export function vervaltOp(maand: string): string {
  const [jaar, m] = maand.split("-").map(Number);
  return new Date(Date.UTC(jaar, m, 1)).toISOString().slice(0, 10);
}
