import { db } from "@/db";
import { aiKosten } from "@/db/schema";

/** Append-only kostenlog; gelijktijdige aanvragen verliezen geen verbruik. */
export async function registreerAiKosten(
  siteId: number,
  bron: "chat" | "bouw",
  verbruik: { tokensIn?: number; tokensUit?: number; kostenUsd?: number },
) {
  const maand = new Date().toISOString().slice(0, 7);
  const tokensIn = Math.round(verbruik.tokensIn ?? 0);
  const tokensUit = Math.round(verbruik.tokensUit ?? 0);
  const micro = Math.round((verbruik.kostenUsd ?? 0) * 1_000_000);
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
