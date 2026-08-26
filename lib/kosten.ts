import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiKosten } from "@/db/schema";

/** Telt werkelijk AI-verbruik op bij de maandregel van een site. */
export async function registreerAiKosten(
  siteId: number,
  bron: "chat" | "bouw",
  verbruik: { tokensIn?: number; tokensUit?: number; kostenUsd?: number }
) {
  const maand = new Date().toISOString().slice(0, 7);
  const tokensIn = Math.round(verbruik.tokensIn ?? 0);
  const tokensUit = Math.round(verbruik.tokensUit ?? 0);
  const micro = Math.round((verbruik.kostenUsd ?? 0) * 1_000_000);
  const bestaand = await db
    .select({ id: aiKosten.id })
    .from(aiKosten)
    .where(
      and(eq(aiKosten.siteId, siteId), eq(aiKosten.maand, maand), eq(aiKosten.bron, bron))
    );
  if (bestaand.length > 0) {
    await db
      .update(aiKosten)
      .set({
        beurten: sql`${aiKosten.beurten} + 1`,
        tokensIn: sql`${aiKosten.tokensIn} + ${tokensIn}`,
        tokensUit: sql`${aiKosten.tokensUit} + ${tokensUit}`,
        kostenMicroUsd: sql`${aiKosten.kostenMicroUsd} + ${micro}`,
      })
      .where(eq(aiKosten.id, bestaand[0].id));
  } else {
    await db.insert(aiKosten).values({
      siteId,
      maand,
      bron,
      beurten: 1,
      tokensIn,
      tokensUit,
      kostenMicroUsd: micro,
    });
  }
}
