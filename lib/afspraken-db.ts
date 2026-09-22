/**
 * Gegevens ophalen voor de afsprakenmodule. Bewust GEEN "use server"-bestand:
 * daar is elke geëxporteerde functie van buitenaf aanroepbaar, en deze
 * functies doen zelf geen rechtencontrole. Ze worden alleen aangeroepen vanaf
 * de server (adminpagina en planpagina), nooit vanuit de browser.
 *
 * Een blok of afspraak hoort bij precies één eigenaar: een klant met een site,
 * of een potentiële klant uit de leadlijst. De database bewaakt dat met een
 * CHECK, hier werken we met het type Eigenaar zodat de rest van de code nooit
 * zelf hoeft te kiezen tussen siteId en leadId.
 */
import { and, eq, gte, inArray, isNotNull, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { afspraakBlokken, afspraken, leads, sites } from "@/db/schema";
import type { Eigenaar } from "@/lib/afspraken";

// De pure kant van het eigenaarschap woont in lib/afspraken.ts, zodat het
// zonder database te testen is; hier staat alleen wat drizzle nodig heeft.
export { eigenaarKolommen, eigenaarPad, eigenaarVan, type Eigenaar } from "@/lib/afspraken";

/** Filter om de blokken van deze eigenaar te vinden. */
export function blokVan(e: Eigenaar): SQL {
  return e.soort === "site" ? eq(afspraakBlokken.siteId, e.id) : eq(afspraakBlokken.leadId, e.id);
}

/** Filter om de afspraken van deze eigenaar te vinden. */
export function afspraakVan(e: Eigenaar): SQL {
  return e.soort === "site" ? eq(afspraken.siteId, e.id) : eq(afspraken.leadId, e.id);
}

/**
 * Wie hoort bij deze planlink? De code staat bij een klant op de site en bij
 * een potentiële klant op de lead. Een lead heeft geen account, dus daar is
 * clerkUserId altijd leeg en loopt het altijd via de gewone, niet-ingelogde weg.
 */
export async function eigenaarViaToken(
  token: string,
): Promise<{ eigenaar: Eigenaar; naam: string; clerkUserId: string | null } | null> {
  if (!token || token.length < 20) return null;
  const [site] = await db
    .select({ id: sites.id, naam: sites.naam, clerkUserId: sites.clerkUserId })
    .from(sites)
    .where(eq(sites.afspraakToken, token));
  if (site) return { eigenaar: { soort: "site", id: site.id }, naam: site.naam, clerkUserId: site.clerkUserId };
  const [lead] = await db
    .select({ id: leads.id, naam: leads.naam })
    .from(leads)
    .where(eq(leads.afspraakToken, token));
  if (lead) return { eigenaar: { soort: "lead", id: lead.id }, naam: lead.naam, clerkUserId: null };
  return null;
}

/** Alles wat de klant- of leadpagina nodig heeft: klaargezette dagen, aanvragen en de planlink. */
export async function afspraakStand(eigenaar: Eigenaar) {
  const vandaag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  const linkOp =
    eigenaar.soort === "site"
      ? db
          .select({ token: sites.afspraakToken, mailOp: sites.afspraakMailOp })
          .from(sites)
          .where(eq(sites.id, eigenaar.id))
      : db
          .select({ token: leads.afspraakToken, mailOp: leads.afspraakMailOp })
          .from(leads)
          .where(eq(leads.id, eigenaar.id));
  const [blokken, rijen, [link]] = await Promise.all([
    db.select().from(afspraakBlokken).where(blokVan(eigenaar)),
    db
      .select()
      .from(afspraken)
      .where(and(afspraakVan(eigenaar), inArray(afspraken.status, ["aangevraagd", "bevestigd"]))),
    linkOp,
  ]);
  return {
    blokken: blokken
      .filter((b) => b.datum >= vandaag)
      .sort((a, b) => (a.datum + a.van < b.datum + b.van ? -1 : 1)),
    afspraken: rijen.sort((a, b) => a.start.getTime() - b.start.getTime()),
    token: link?.token ?? null,
    mailOp: link?.mailOp ?? null,
  };
}

/** Alle bevestigde afspraken vanaf nu — die blokkeren tijd bij élke klant en lead. */
export async function bezetteTijden() {
  return db
    .select({ start: afspraken.start, duurMinuten: afspraken.duurMinuten })
    .from(afspraken)
    .where(and(eq(afspraken.status, "bevestigd"), gte(afspraken.start, new Date())));
}

/** Alle komende aanvragen en bevestigde afspraken, over klanten én leads heen,
 * op volgorde van de afspraakdatum — voor het agenda-overzicht in de admin. */
export async function alleKomendeAfspraken() {
  const nu = Date.now();
  const open = inArray(afspraken.status, ["aangevraagd", "bevestigd"]);
  const [vanKlanten, vanLeads] = await Promise.all([
    db
      .select({ afspraak: afspraken, naam: sites.naam })
      .from(afspraken)
      .innerJoin(sites, eq(sites.id, afspraken.siteId))
      .where(and(open, isNotNull(afspraken.siteId))),
    db
      .select({ afspraak: afspraken, naam: leads.naam })
      .from(afspraken)
      .innerJoin(leads, eq(leads.id, afspraken.leadId))
      .where(and(open, isNotNull(afspraken.leadId))),
  ]);
  return [
    ...vanKlanten.map((r) => ({ ...r, soort: "site" as const, siteNaam: r.naam })),
    ...vanLeads.map((r) => ({ ...r, soort: "lead" as const, siteNaam: r.naam })),
  ]
    .filter((r) => r.afspraak.start.getTime() + r.afspraak.duurMinuten * 60_000 > nu)
    .sort((a, b) => a.afspraak.start.getTime() - b.afspraak.start.getTime());
}

export type LeadAfspraakRijen = {
  blokken: (typeof afspraakBlokken.$inferSelect)[];
  afspraken: (typeof afspraken.$inferSelect)[];
};

/** Alle leads met een afspraakstand, in één ronde — voor de leadlijst. */
export async function afsprakenPerLead(): Promise<Map<number, LeadAfspraakRijen>> {
  const vandaag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  const [blokken, rijen] = await Promise.all([
    db.select().from(afspraakBlokken).where(isNotNull(afspraakBlokken.leadId)),
    db
      .select()
      .from(afspraken)
      .where(and(isNotNull(afspraken.leadId), inArray(afspraken.status, ["aangevraagd", "bevestigd"]))),
  ]);
  const perLead = new Map<number, LeadAfspraakRijen>();
  const vak = (id: number) => {
    if (!perLead.has(id)) perLead.set(id, { blokken: [], afspraken: [] });
    return perLead.get(id)!;
  };
  for (const b of blokken) if (b.leadId && b.datum >= vandaag) vak(b.leadId).blokken.push(b);
  for (const a of rijen) if (a.leadId) vak(a.leadId).afspraken.push(a);
  for (const stand of perLead.values()) {
    stand.blokken.sort((a, b) => (a.datum + a.van < b.datum + b.van ? -1 : 1));
    stand.afspraken.sort((a, b) => a.start.getTime() - b.start.getTime());
  }
  return perLead;
}
