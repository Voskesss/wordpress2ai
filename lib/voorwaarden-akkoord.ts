import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { akkoorden } from "@/db/schema";
import { VOORWAARDEN_SOORT, VOORWAARDEN_VERSIE } from "@/lib/voorwaarden-versie";

/**
 * Aantoonbaar akkoord op de algemene voorwaarden: wie, welke versie, wanneer
 * en waar (Jos, 09-10-2026, voor de beroepsaansprakelijkheidsverzekering).
 * De plek (oplevering of betaling) staat in de versie achter een #, zodat er
 * geen kolom bij hoeft.
 */
export type AkkoordPlek = "oplevering" | "betaling";

/** Zuiver: is het vinkje echt aangevinkt? (een formulier stuurt "on") */
export const vinkjeGezet = (waarde: FormDataEntryValue | null) => waarde === "on" || waarde === "1" || waarde === "ja";

export async function legVoorwaardenAkkoordVast(o: { clerkUserId: string; email: string | null; plek: AkkoordPlek }) {
  try {
    await db.insert(akkoorden).values({
      clerkUserId: o.clerkUserId,
      email: o.email,
      soort: VOORWAARDEN_SOORT,
      versie: `${VOORWAARDEN_VERSIE}#${o.plek}`,
    });
  } catch (e) {
    // Vastleggen mag het akkoord of de betaling nooit tegenhouden, maar het moet wel opvallen
    console.error("Akkoord op de voorwaarden vastleggen mislukt:", e);
  }
}

/** Alle akkoorden op de voorwaarden van deze gebruiker, nieuwste eerst (voor de admin). */
export async function voorwaardenAkkoordenVan(clerkUserId: string) {
  return db
    .select()
    .from(akkoorden)
    .where(and(eq(akkoorden.clerkUserId, clerkUserId), eq(akkoorden.soort, VOORWAARDEN_SOORT)))
    .orderBy(desc(akkoorden.id))
    .catch(() => []);
}
