import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { sites } from "@/db/schema";

/**
 * Hoeveel websites heeft de ingelogde gebruiker? Alleen voor het menu-label
 * "Mijn website" of "Mijn websites". Stond in de root layout (currentUser +
 * database bij elke paginaweergave), waardoor geen enkele pagina van
 * wordswap.nl nog klaargezet kon worden. Nu vraagt het menu het zelf op,
 * en alleen als iemand is ingelogd.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ meerdere: false });
  try {
    const rijen = await db
      .select({ id: sites.id })
      .from(sites)
      .where(and(eq(sites.clerkUserId, userId), eq(sites.isDemo, false)))
      .limit(2);
    return Response.json({ meerdere: rijen.length > 1 }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ meerdere: false });
  }
}
