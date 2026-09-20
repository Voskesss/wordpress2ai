/**
 * Wat een site deze maand aan AI heeft verbruikt, als aandeel van zijn
 * maandruimte. Dít is wat de chat echt begrenst — niet het aantal
 * wijzigingen. Een klant die "8 van 30 wijzigingen" ziet en tóch wordt
 * geblokkeerd, voelt zich terecht bedonderd (20-09), dus tonen we de maat
 * die er werkelijk toe doet.
 *
 * Bewust géén bedragen richting de klant: een meter die in euro's tikt maakt
 * mensen huiverig om hun eigen website te gebruiken. Een percentage vertelt
 * wat ze moeten weten — hoeveel ruimte er nog is.
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiKosten, sites } from "@/db/schema";
import { maandbudgetVoor, huidigeMaand } from "./ai-budget";

export type Verbruik = {
  /** Percentage van de maandruimte dat op is (0-100, afgekapt) */
  procent: number;
  /** Alleen voor de admin: wat er echt is uitgegeven en wat de ruimte is */
  gebruiktUsd: number;
  budgetUsd: number;
};

export async function verbruikVan(
  site: typeof sites.$inferSelect,
  maand = huidigeMaand(),
): Promise<Verbruik | null> {
  if (site.isDemo) return null; // demo heeft zijn eigen daglimiet
  const budgetUsd = maandbudgetVoor(site, maand);
  if (!(budgetUsd > 0)) return null;
  const [rij] = await db
    .select({ micro: sql<number>`COALESCE(SUM(${aiKosten.kostenMicroUsd}), 0)` })
    .from(aiKosten)
    .where(and(eq(aiKosten.siteId, site.id), eq(aiKosten.maand, maand)));
  const gebruiktUsd = Number(rij?.micro ?? 0) / 1_000_000;
  return {
    procent: Math.min(100, Math.round((gebruiktUsd / budgetUsd) * 100)),
    gebruiktUsd,
    budgetUsd,
  };
}
