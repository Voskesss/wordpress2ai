/**
 * Het mailadres (en de naam) van de klant achter een site: eerst het
 * abonnement, anders het uitnodigingsadres, anders het Clerk-account.
 * Bewust een gewone module (geen "use server"): wordt alleen op de server
 * aangeroepen en is dus niet als losse actie van buitenaf bereikbaar.
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { abonnementen, sites } from "@/db/schema";

export async function klantAdres(site: typeof sites.$inferSelect): Promise<{ email: string; naam: string } | null> {
  const [abo] = await db
    .select({ email: abonnementen.email, naam: abonnementen.naam })
    .from(abonnementen)
    .where(eq(abonnementen.siteId, site.id))
    .catch(() => []);
  if (abo?.email) return { email: abo.email, naam: abo.naam };
  if (site.uitnodigingEmail) return { email: site.uitnodigingEmail, naam: site.naam };
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${site.clerkUserId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    });
    if (!res.ok) return null;
    const u = (await res.json()) as { email_addresses?: { email_address: string }[]; first_name?: string };
    const email = u.email_addresses?.[0]?.email_address;
    return email ? { email, naam: u.first_name ?? site.naam } : null;
  } catch {
    return null;
  }
}
