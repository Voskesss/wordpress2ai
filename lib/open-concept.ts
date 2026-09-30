/**
 * Heeft deze site een open concept van de klant? De werkversie (wv-*) draagt
 * dat concept; opnieuw uitrollen vanaf de repo gooit het weg. Vaste regel:
 * wv-workers nooit overschrijven zolang er een concept open staat
 * (scripts/deploy-klant.mts deed dit al goed, bewaarSite in de admin niet:
 * gevonden 29-09 terwijl Dirk-Jan in concept werkte).
 */
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { changes } from "@/db/schema";

export const OPEN_STATUSSEN = ["concept", "publicatie_mislukt"] as const;

export async function openConcept(siteId: number): Promise<{ id: number } | null> {
  const [rij] = await db
    .select({ id: changes.id })
    .from(changes)
    .where(and(eq(changes.siteId, siteId), inArray(changes.status, [...OPEN_STATUSSEN])))
    .limit(1);
  return rij ?? null;
}
