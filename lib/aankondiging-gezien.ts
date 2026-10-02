/**
 * Wie heeft een aankondiging al gezien (weggeklikt), en wie nog niet? Zo weet
 * je wanneer hij weg kan (wens Jos, 02-10-2026). Doelgroep: elk account met
 * een echte site, zonder demo's en zonder je eigen account (sites die nog op
 * een uitnodiging wachten staan op naam van de beheerder en tellen dus niet).
 * Zuivere functie, zodat dit zonder database te testen is.
 */

export type SiteVoorGezien = { naam: string; clerkUserId: string; isDemo: boolean; githubRepo: string };
export type GezienRij = { aankondigingId: number; clerkUserId: string };
export type GezienOverzicht = { totaal: number; gezien: string[]; nietGezien: string[] };

export function gezienOverzicht(
  sitesLijst: SiteVoorGezien[],
  gezienRijen: GezienRij[],
  aankondigingId: number,
  beheerderId: string,
): GezienOverzicht {
  // Eén account kan meerdere sites hebben: één klant, met de sitenamen erbij
  const perAccount = new Map<string, string[]>();
  for (const s of sitesLijst) {
    if (s.isDemo || s.githubRepo === "wordswap" || !s.clerkUserId || s.clerkUserId === beheerderId) continue;
    perAccount.set(s.clerkUserId, [...(perAccount.get(s.clerkUserId) ?? []), s.naam]);
  }
  const zag = new Set(gezienRijen.filter((r) => r.aankondigingId === aankondigingId).map((r) => r.clerkUserId));
  const gezien: string[] = [];
  const nietGezien: string[] = [];
  for (const [id, namen] of perAccount) (zag.has(id) ? gezien : nietGezien).push(namen.sort().join(", "));
  return { totaal: perAccount.size, gezien: gezien.sort(), nietGezien: nietGezien.sort() };
}
