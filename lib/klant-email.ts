import { eq } from "drizzle-orm";
import { db } from "@/db";
import { abonnementen, sites } from "@/db/schema";

/**
 * Het e-mailadres van de klant van een site, voor mails namens WordSwap.
 * Volgorde: abonnement → klantaccount (Clerk) → openstaande uitnodiging.
 * Geeft null als er geen klant is — ook als de site nog op een beheerdersaccount
 * staat, zodat een "klantmail" nooit bij Jos zelf of een collega-beheerder belandt.
 */
export async function klantEmailVoorSite(siteId: number): Promise<{ email: string; naam: string } | null> {
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site || site.isDemo) return null;

  const [abo] = await db.select().from(abonnementen).where(eq(abonnementen.siteId, siteId)).catch(() => []);
  if (abo?.email) return { email: abo.email, naam: abo.naam };

  if (site.clerkUserId) {
    try {
      const res = await fetch(`https://api.clerk.com/v1/users/${site.clerkUserId}`, {
        headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
        cache: "no-store",
      });
      if (res.ok) {
        const u = (await res.json()) as {
          email_addresses?: { email_address: string }[];
          first_name?: string | null;
          last_name?: string | null;
          public_metadata?: { role?: string };
        };
        const email = u.email_addresses?.[0]?.email_address;
        if (u.public_metadata?.role !== "admin" && email) {
          return { email, naam: [u.first_name, u.last_name].filter(Boolean).join(" ") || site.naam };
        }
      }
    } catch {
      /* val door naar de uitnodiging */
    }
  }

  if (site.uitnodigingEmail) return { email: site.uitnodigingEmail, naam: site.naam };
  return null;
}
