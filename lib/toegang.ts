import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { siteActiviteit, siteLeden, sites } from "@/db/schema";

/**
 * Wie mag wat op een site (teamleden, Jos 04-10-2026). Eén plek, zodat elke
 * route hetzelfde beslist:
 * - eigenaar: alles;
 * - meewerker (teamlid): bewerken, en per persoon ingesteld publiceren en de
 *   formulierberichten zien;
 * - beheerder (Jos): alles, net als nu in de meekijk-modus.
 * Betalen, opzeggen, akkoorden, privacy en het team zelf blijven van de
 * eigenaar; die acties kijken nog steeds naar sites.clerk_user_id.
 */

export const MAX_GRATIS_LEDEN = 3;

export type Rol = "eigenaar" | "meewerker" | "beheerder";
export type Toegang = { rol: Rol; magPubliceren: boolean; magBerichten: boolean };

type SiteKern = { id: number; clerkUserId: string };
type LidKern = { clerkUserId: string | null; magPubliceren: boolean; magBerichten: boolean };

/** Zuivere beslissing, zonder database: te testen. */
export function bepaalToegang(site: SiteKern, userId: string | null | undefined, lid: LidKern | null, beheerder: boolean): Toegang | null {
  if (!userId) return null;
  if (site.clerkUserId === userId) return { rol: "eigenaar", magPubliceren: true, magBerichten: true };
  if (lid && lid.clerkUserId === userId) return { rol: "meewerker", magPubliceren: lid.magPubliceren, magBerichten: lid.magBerichten };
  if (beheerder) return { rol: "beheerder", magPubliceren: true, magBerichten: true };
  return null;
}

export async function lidVan(siteId: number, userId: string) {
  const [lid] = await db
    .select()
    .from(siteLeden)
    .where(and(eq(siteLeden.siteId, siteId), eq(siteLeden.clerkUserId, userId)))
    .catch(() => []);
  return lid ?? null;
}

/** Toegang van de ingelogde gebruiker tot deze site, of null. */
export async function toegangTot(site: SiteKern, userId: string | null | undefined): Promise<Toegang | null> {
  if (!userId) return null;
  if (site.clerkUserId === userId) return bepaalToegang(site, userId, null, false);
  const lid = await lidVan(site.id, userId);
  if (lid) return bepaalToegang(site, userId, lid, false);
  const { isBeheerder } = await import("@/lib/auth");
  return bepaalToegang(site, userId, null, await isBeheerder());
}

export const magBewerken = async (site: SiteKern, userId: string | null | undefined) => (await toegangTot(site, userId)) !== null;
export const magPubliceren = async (site: SiteKern, userId: string | null | undefined) => Boolean((await toegangTot(site, userId))?.magPubliceren);
export const magBerichten = async (site: SiteKern, userId: string | null | undefined) => Boolean((await toegangTot(site, userId))?.magBerichten);

/** Site-id's waar deze gebruiker teamlid van is. */
export async function siteIdsAlsLid(userId: string): Promise<number[]> {
  const rijen = await db.select({ siteId: siteLeden.siteId }).from(siteLeden).where(eq(siteLeden.clerkUserId, userId)).catch(() => []);
  return rijen.map((r) => r.siteId);
}

/** Openstaande uitnodigingen koppelen zodra iemand met dat adres inlogt. */
export async function koppelUitnodigingen(userId: string, emails: string[]) {
  if (!emails.length) return;
  const { inArray, isNull } = await import("drizzle-orm");
  await db
    .update(siteLeden)
    .set({ clerkUserId: userId })
    .where(and(inArray(siteLeden.email, emails), isNull(siteLeden.clerkUserId)))
    .catch(() => {});
}

/** Naam voor in het logboek: teamlidnaam, anders Clerk-naam, anders e-mail. */
export async function naamVan(siteId: number, userId: string | null | undefined): Promise<string> {
  if (!userId) return "Onbekend";
  const lid = await lidVan(siteId, userId);
  if (lid) return lid.naam;
  const [site] = await db.select({ clerkUserId: sites.clerkUserId }).from(sites).where(eq(sites.id, siteId)).catch(() => []);
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const u = await (await clerkClient()).users.getUser(userId);
    const naam = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
    const basis = naam || u.emailAddresses[0]?.emailAddress || "Onbekend";
    if (site?.clerkUserId === userId) return basis;
    return u.publicMetadata?.role === "admin" ? `${basis} (WordSwap)` : basis;
  } catch {
    return site?.clerkUserId === userId ? "Eigenaar" : "Onbekend";
  }
}

/** Iets in het logboek zetten. Mag nooit het eigenlijke werk laten mislukken. */
export async function logActiviteit(
  siteId: number,
  userId: string | null | undefined,
  soort: "concept" | "gepubliceerd" | "verworpen" | "teruggezet" | "upload" | "berichten" | "team" | "verzoek",
  omschrijving: string,
  changeId?: number | null,
) {
  try {
    await db.insert(siteActiviteit).values({
      siteId,
      clerkUserId: userId ?? null,
      naam: await naamVan(siteId, userId),
      soort,
      omschrijving: omschrijving.slice(0, 300),
      changeId: changeId ?? null,
    });
  } catch (e) {
    console.error("Logboek schrijven mislukt:", e);
  }
}

/** Wie werkte er aan dit concept, behalve deze gebruiker? Voor de waarschuwing
 * bij publiceren: "let op, Lisa werkte ook aan dit concept". */
export async function anderenInConcept(changeId: number, userId: string) {
  const rijen = await db
    .select({ clerkUserId: siteActiviteit.clerkUserId, naam: siteActiviteit.naam, omschrijving: siteActiviteit.omschrijving })
    .from(siteActiviteit)
    .where(and(eq(siteActiviteit.changeId, changeId), eq(siteActiviteit.soort, "concept")))
    .catch(() => []);
  return groepeerBijdragen(rijen, userId);
}

/** Zuiver: bijdragen per persoon, zonder de vrager zelf. */
export function groepeerBijdragen(rijen: { clerkUserId: string | null; naam: string; omschrijving: string }[], userId: string) {
  const per = new Map<string, { naam: string; wat: string[] }>();
  for (const r of rijen) {
    if (!r.clerkUserId || r.clerkUserId === userId) continue;
    const p = per.get(r.clerkUserId) ?? { naam: r.naam, wat: [] };
    p.wat.push(r.omschrijving);
    per.set(r.clerkUserId, p);
  }
  return [...per.values()];
}

