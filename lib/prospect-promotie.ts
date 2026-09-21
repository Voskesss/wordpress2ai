import { db } from "@/db";
import { leadPost, leads, prospects } from "@/db/schema";
import { and, eq, isNull, ne } from "drizzle-orm";
import { haalLeadPost, soverinIngesteld, type PostItem } from "@/lib/soverin";
// Dezelfde sleutel als de leadronde, anders komt dezelfde mail twee keer in de tijdlijn.
import { berichtSleutel } from "@/lib/leads-bijwerken";

/**
 * Een prospect die terugmailt wordt een lead.
 *
 * Waarom die scheiding er is: de outreach is koud en massaal (de scan levert
 * er honderden), leads zijn de mensen met wie iets loopt. Zou alles meteen een
 * lead zijn, dan verzuipen Aad en Remco tussen de scanregels en werkt de
 * opvolg-cadans nergens meer voor.
 *
 * De omgekeerde beweging is dus het moment dat het echt wordt: iemand
 * antwoordt. Dan verhuist hij, mét de reactie die we net gevonden hebben,
 * zodat de tijdlijn niet bij nul begint.
 */

/** Hoe ver terug we kijken in de mailbox bij elke ronde. */
const DAGEN_TERUG = 30;

export type PromotieVerslag = { gevonden: number; gepromoveerd: string[]; fout?: string };

export async function promoveerReagerendeProspects(): Promise<PromotieVerslag> {
  if (!soverinIngesteld()) return { gevonden: 0, gepromoveerd: [], fout: "Soverin niet ingesteld" };

  // Alleen wie we gemaild hebben en nog geen lead is: daarvóór valt er niets
  // te beantwoorden.
  const open = await db
    .select()
    .from(prospects)
    .where(and(isNull(prospects.leadId), ne(prospects.status, "niet_mailen")));
  const metMail = open.filter((p) => p.email && p.email.includes("@") && p.status !== "nieuw");
  if (!metMail.length) return { gevonden: 0, gepromoveerd: [] };

  let items: PostItem[];
  try {
    items = await haalLeadPost(
      metMail.map((p) => p.email.trim().toLowerCase()),
      new Date(Date.now() - DAGEN_TERUG * 86_400_000),
    );
  } catch (e) {
    return { gevonden: 0, gepromoveerd: [], fout: String(e).slice(0, 200) };
  }

  // Alleen binnenkomende post telt als reactie; onze eigen verzonden mail niet.
  const binnen = items.filter((i) => i.richting === "in");
  const perMail = new Map(metMail.map((p) => [p.email.trim().toLowerCase(), p]));
  const gepromoveerd: string[] = [];

  for (const item of binnen) {
    const prospect = perMail.get(item.email);
    if (!prospect || prospect.leadId) continue;

    const [nieuweLead] = await db
      .insert(leads)
      .values({
        naam: prospect.bedrijf,
        email: prospect.email,
        telefoon: prospect.telefoon,
        website: prospect.website,
        bron: prospect.bron ?? "Websitescan",
        soort: "klant",
        status: "nieuw",
        oordeel: prospect.observatie,
        notities: [
          `Reageerde op onze outreach op ${item.datum.toLocaleDateString("nl-NL", { day: "numeric", month: "long", timeZone: "Europe/Amsterdam" })}.`,
          prospect.plaats ? `Plaats: ${prospect.plaats}` : null,
          prospect.prijs ? `Richtprijs uit de scan: ${prospect.prijs}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      })
      .returning({ id: leads.id });

    // De reactie meteen in de tijdlijn, anders begint het gesprek bij nul.
    await db
      .insert(leadPost)
      .values({
        leadId: nieuweLead.id,
        richting: item.richting,
        bron: item.bron,
        onderwerp: item.onderwerp,
        fragment: item.fragment,
        messageId: berichtSleutel(item),
        datum: item.datum,
      })
      .onConflictDoNothing();

    await db
      .update(prospects)
      .set({ leadId: nieuweLead.id, status: "gereageerd" })
      .where(eq(prospects.id, prospect.id));
    prospect.leadId = nieuweLead.id;
    gepromoveerd.push(prospect.bedrijf);
  }

  return { gevonden: binnen.length, gepromoveerd };
}
