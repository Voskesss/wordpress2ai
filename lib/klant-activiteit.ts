import { and, eq, max, ne } from "drizzle-orm";
import { db } from "@/db";
import { messages } from "@/db/schema";

/**
 * Wanneer was een klant voor het laatst actief? Voor de klantenlijst in de
 * admin (Jos, 10-10-2026): in één lijst zien wie inlogt en wie de chat
 * gebruikt, zonder elke klant apart te openen.
 */

/** Laatste chatbericht van de klantkant per site (ook teamleden en WhatsApp),
 * zonder de berichten van de beheerder zelf. Eén query voor alle sites. */
export async function laatsteChatPerSite(beheerderId: string): Promise<Map<number, string>> {
  const uit = new Map<number, string>();
  try {
    const rijen = await db
      .select({ siteId: messages.siteId, laatst: max(messages.aangemaakt) })
      .from(messages)
      .where(and(eq(messages.rol, "klant"), ne(messages.clerkUserId, beheerderId)))
      .groupBy(messages.siteId);
    for (const r of rijen) if (r.laatst) uit.set(r.siteId, new Date(r.laatst).toISOString());
  } catch (e) {
    console.error("Laatste chat per site opvragen mislukt:", e);
  }
  return uit;
}

/** Zuiver: het laatste moment uit wat Clerk over een gebruiker weet. Inloggen
 * gebeurt zelden (een sessie blijft weken geldig), dus "laatst actief" telt mee. */
export function laatsteMoment(u: { lastSignInAt?: number | null; lastActiveAt?: number | null }): string | null {
  const t = Math.max(u.lastSignInAt ?? 0, u.lastActiveAt ?? 0);
  return t > 0 ? new Date(t).toISOString() : null;
}

/** Laatst in het portaal per gebruiker, uit Clerk, in porties van 100. */
export async function laatstInPortaal(userIds: string[]): Promise<Map<string, string>> {
  const uit = new Map<string, string>();
  const uniek = [...new Set(userIds.filter(Boolean))];
  if (!uniek.length) return uit;
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const clerk = await clerkClient();
    for (let i = 0; i < uniek.length; i += 100) {
      const deel = uniek.slice(i, i + 100);
      const { data } = await clerk.users.getUserList({ userId: deel, limit: 100 });
      for (const u of data) {
        const m = laatsteMoment(u);
        if (m) uit.set(u.id, m);
      }
    }
  } catch (e) {
    console.error("Laatste inlog uit Clerk opvragen mislukt:", e);
  }
  return uit;
}
