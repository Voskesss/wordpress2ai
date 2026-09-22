/**
 * De leadstatus meeschrijven met de agenda: staat er een bevestigde afspraak in
 * de toekomst, dan hoort de lead op "Afspraak gepland" te staan, en anders niet
 * meer. Zo klopt de leadlijst zonder dat Jos het handmatig moet bijhouden.
 *
 * Welke statussen meeschuiven staat in statusBijAfspraak() in lib/leads.ts,
 * zodat die regel zonder database te testen is.
 *
 * Geen "use server": deze functie wordt alleen vanaf de server aangeroepen,
 * vanuit de afspraakacties.
 */
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { afspraken, leads } from "@/db/schema";
import { statusBijAfspraak } from "@/lib/leads";

export async function werkLeadStatusBijAfspraak(leadId: number): Promise<void> {
  const [lead] = await db.select({ status: leads.status }).from(leads).where(eq(leads.id, leadId));
  if (!lead) return;

  const komend = await db
    .select({ id: afspraken.id })
    .from(afspraken)
    .where(and(eq(afspraken.leadId, leadId), eq(afspraken.status, "bevestigd"), gt(afspraken.start, new Date())))
    .limit(1);

  const nieuw = statusBijAfspraak(lead.status, komend.length > 0);
  if (!nieuw) return;
  await db.update(leads).set({ status: nieuw, bijgewerkt: new Date() }).where(eq(leads.id, leadId));
}
