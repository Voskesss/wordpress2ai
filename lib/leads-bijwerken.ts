/**
 * Eén bijwerkronde voor de leadsbak, gebruikt door de cron én de knop in
 * /admin/leads: nieuwe Meta-leads binnenhalen, Soverin-post ophalen (reacties +
 * eigen verzonden mails), statussen meebewegen en opvolg-concepten klaarzetten.
 * Er wordt hier nooit gemaild — concepten wachten op Jos.
 */

import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { afspraken, leadPost, leads, verzondenMails } from "@/db/schema";
import { LEAD_STATUSSEN } from "@/lib/leads";
import { conceptAchterhaald, maakStap, volgendeStap } from "@/lib/lead-opvolging";
import { haalMetaLeads, metaIngesteld } from "@/lib/meta-leads";
import { haalLeadPost, soverinIngesteld, type PostItem } from "@/lib/soverin";

const OPEN_STATUSSEN = LEAD_STATUSSEN.filter((s) => s.open).map((s) => s.waarde);
const BACKFILL_PER_KEER = 10;
const SYNC_DAGEN_TERUG = 5;

export function berichtSleutel(item: PostItem): string {
  return item.messageId ?? `${item.bron}-${item.datum.toISOString()}-${(item.onderwerp ?? "").slice(0, 60)}`;
}

/** Nieuwe Meta-leads in de bak zetten; bestaande worden op meta-id of e-mailadres herkend. */
async function metaBinnenhalen(verslag: string[]): Promise<void> {
  if (!metaIngesteld()) {
    verslag.push("Meta niet ingesteld (META_LEADS_TOKEN)");
    return;
  }
  try {
    const items = await haalMetaLeads();
    const bestaand = await db.select({ id: leads.id, email: leads.email, metaLeadId: leads.metaLeadId }).from(leads);
    const opMetaId = new Map(bestaand.filter((l) => l.metaLeadId).map((l) => [l.metaLeadId!, l.id]));
    const opEmail = new Map(bestaand.filter((l) => l.email).map((l) => [l.email!.trim().toLowerCase(), l.id]));
    let nieuw = 0;
    let gekoppeld = 0;
    for (const item of items) {
      if (opMetaId.has(item.metaId)) continue;
      const viaEmail = item.email ? opEmail.get(item.email.trim().toLowerCase()) : undefined;
      if (viaEmail) {
        // Bestond al (bijv. met de hand ingevoerd): alleen het meta-id en lege velden aanvullen
        await db
          .update(leads)
          .set({
            metaLeadId: item.metaId,
            telefoon: sql`COALESCE(${leads.telefoon}, ${item.telefoon})`,
            website: sql`COALESCE(${leads.website}, ${item.website})`,
            bijgewerkt: new Date(),
          })
          .where(eq(leads.id, viaEmail));
        gekoppeld++;
        continue;
      }
      await db.insert(leads).values({
        naam: item.naam,
        email: item.email,
        telefoon: item.telefoon,
        website: item.website,
        bron: "Meta-advertentie",
        soort: "klant",
        status: "nieuw",
        metaLeadId: item.metaId,
        notities: `Meta-lead van ${item.aangemaakt.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Amsterdam" })}.`,
        aangemaakt: item.aangemaakt,
      });
      if (item.email) opEmail.set(item.email.trim().toLowerCase(), -1);
      nieuw++;
    }
    verslag.push(`Meta: ${items.length} leads bekeken, ${nieuw} nieuw, ${gekoppeld} aan bestaande gekoppeld`);
  } catch (e) {
    verslag.push(`Meta overgeslagen: ${String(e).slice(0, 200)}`);
  }
}

export async function werkLeadsBij(): Promise<string[]> {
  const verslag: string[] = [];

  await metaBinnenhalen(verslag);

  const open = await db.select().from(leads).where(inArray(leads.status, OPEN_STATUSSEN));
  const metMail = open.filter((l) => l.email?.includes("@"));

  // Een afspraak (aangevraagd of bevestigd) telt als contact: geen mails meer
  // klaarzetten voor iemand met wie al een gesprek gepland staat
  try {
    const afspraakMails = new Set(
      (await db.select({ email: afspraken.email, status: afspraken.status }).from(afspraken))
        .filter((a) => a.email && a.status !== "geannuleerd")
        .map((a) => a.email!.trim().toLowerCase()),
    );
    for (const lead of metMail) {
      if (!afspraakMails.has(lead.email!.trim().toLowerCase())) continue;
      const nieuweStatus = lead.status === "nieuw" || lead.status === "wacht_op_reactie" ? "in_gesprek" : lead.status;
      if (nieuweStatus === lead.status && !lead.conceptTekst && !lead.conceptSoort) continue;
      await db
        .update(leads)
        .set({ status: nieuweStatus, conceptSoort: null, conceptOnderwerp: null, conceptTekst: null, conceptKlaarOp: null, bijgewerkt: new Date() })
        .where(eq(leads.id, lead.id));
      lead.status = nieuweStatus;
      lead.conceptSoort = null;
      lead.conceptTekst = null;
      verslag.push(`${lead.naam}: afspraak in de agenda gezien → opvolging gestopt`);
    }
  } catch (e) {
    verslag.push(`Afspraken-controle overgeslagen: ${String(e).slice(0, 120)}`);
  }

  // 0. Prospects uit de outreach die terugmailden worden leads. Dit eerst,
  // zodat zo iemand in dezelfde ronde meteen de rest van de behandeling
  // krijgt in plaats van pas over een half uur.
  try {
    const { promoveerReagerendeProspects } = await import("@/lib/prospect-promotie");
    const uitslag = await promoveerReagerendeProspects();
    if (uitslag.gepromoveerd.length)
      verslag.push(`Outreach: ${uitslag.gepromoveerd.join(", ")} reageerde(n) en staat/staan nu bij de leads`);
    else if (uitslag.fout) verslag.push(`Outreach-promotie overgeslagen: ${uitslag.fout}`);
  } catch (e) {
    verslag.push(`Outreach-promotie overgeslagen: ${String(e).slice(0, 160)}`);
  }

  // 1. Soverin: nieuwe post ophalen (en voor nieuwe leads eenmalig de hele geschiedenis)
  if (soverinIngesteld() && metMail.length > 0) {
    const terugblik = metMail.filter((l) => !l.soverinDoorzocht).slice(0, BACKFILL_PER_KEER);
    const bijhouden = metMail.filter((l) => !terugblik.includes(l));
    const sinds = new Date(Date.now() - SYNC_DAGEN_TERUG * 86_400_000);
    try {
      const items = [
        ...(await haalLeadPost(terugblik.map((l) => l.email!), null)),
        ...(await haalLeadPost(bijhouden.map((l) => l.email!), sinds)),
      ];
      const leadPerMail = new Map(metMail.map((l) => [l.email!.trim().toLowerCase(), l.id]));
      let nieuw = 0;
      for (const item of items) {
        const leadId = leadPerMail.get(item.email);
        if (!leadId) continue;
        const klaar = await db
          .insert(leadPost)
          .values({
            leadId,
            richting: item.richting,
            bron: item.bron,
            onderwerp: item.onderwerp,
            fragment: item.fragment,
            messageId: berichtSleutel(item),
            datum: item.datum,
          })
          .onConflictDoNothing()
          .returning({ id: leadPost.id });
        nieuw += klaar.length;
      }
      if (terugblik.length > 0) {
        await db
          .update(leads)
          .set({ soverinDoorzocht: true })
          .where(inArray(leads.id, terugblik.map((l) => l.id)));
      }
      verslag.push(`Soverin: ${nieuw} nieuwe postregels (terugblik voor ${terugblik.length} leads)`);
    } catch (e) {
      verslag.push(`Soverin overgeslagen: ${String(e).slice(0, 200)}`);
    }
  } else {
    verslag.push(soverinIngesteld() ? "Geen open leads met e-mail" : "Soverin niet ingesteld (SOVERIN_IMAP_USER/PASSWORD)");
  }

  // 2. Tijdlijn per lead samenstellen (systeem-mails + Soverin-post)
  const alleVerzonden = await db.select({ aan: verzondenMails.aan, verzonden: verzondenMails.verzonden }).from(verzondenMails);
  const post = metMail.length > 0 ? await db.select().from(leadPost).where(inArray(leadPost.leadId, metMail.map((l) => l.id))) : [];
  const nu = new Date();

  for (const lead of metMail) {
    const adres = lead.email!.trim().toLowerCase();
    const eigen = post.filter((p) => p.leadId === lead.id);
    const uitMomenten = [
      ...alleVerzonden.filter((m) => m.aan.trim().toLowerCase() === adres).map((m) => m.verzonden),
      ...eigen.filter((p) => p.richting === "uit").map((p) => p.datum),
    ].sort((a, b) => a.getTime() - b.getTime());
    const heeftReactie = eigen.some((p) => p.richting === "in");

    // Nieuwe lead zonder enige mail én zonder concept → eerste mail klaarzetten,
    // bewust ZONDER tekst: de inhoud maakt Jos (samen met de chat) en plakt hij
    // in het kaartje. Iedereen krijgt er één, ook een minder sterke match.
    if (lead.status === "nieuw" && !heeftReactie && uitMomenten.length === 0 && !lead.conceptSoort && !lead.conceptTekst) {
      await db
        .update(leads)
        .set({ conceptSoort: "eerste", conceptOnderwerp: null, conceptTekst: null, conceptKlaarOp: nu, bijgewerkt: nu })
        .where(eq(leads.id, lead.id));
      verslag.push(`${lead.naam}: eerste mail klaargezet — tekst nog maken`);
      continue;
    }

    // Reactie binnen → in gesprek, klaarstaand concept vervalt
    if (heeftReactie && (lead.status === "nieuw" || lead.status === "wacht_op_reactie")) {
      await db
        .update(leads)
        .set({ status: "in_gesprek", conceptSoort: null, conceptOnderwerp: null, conceptTekst: null, conceptKlaarOp: null, bijgewerkt: nu })
        .where(eq(leads.id, lead.id));
      verslag.push(`${lead.naam}: reactie gezien → in gesprek`);
      continue;
    }

    // Eerste mail is de deur uit → wacht op reactie
    if (lead.status === "nieuw" && uitMomenten.length > 0) {
      await db.update(leads).set({ status: "wacht_op_reactie", bijgewerkt: nu }).where(eq(leads.id, lead.id));
      lead.status = "wacht_op_reactie";
      verslag.push(`${lead.naam}: mail verstuurd → wacht op reactie`);
    }

    // Klaarstaande mail achterhaald? Er is ná het klaarzetten een mail de deur
    // uit gegaan — ook als Jos die zelf vanuit zijn eigen postvak stuurde.
    // De soort blijft staan, zodat de cadans deze stap niet opnieuw klaarzet.
    const laatsteUit = uitMomenten.at(-1) ?? null;
    if (conceptAchterhaald(lead.conceptKlaarOp, laatsteUit)) {
      await db
        .update(leads)
        .set({ conceptOnderwerp: null, conceptTekst: null, conceptKlaarOp: null, bijgewerkt: nu })
        .where(eq(leads.id, lead.id));
      lead.conceptKlaarOp = null;
      lead.conceptTekst = null;
      verslag.push(`${lead.naam}: klaarstaande mail opgeruimd (was al verstuurd)`);
    }

    // 3. Cadans: volgende stap klaarzetten (nooit versturen)
    if (lead.status !== "wacht_op_reactie") continue;
    const stap = volgendeStap({
      aantalUit: uitMomenten.length,
      laatsteUit: uitMomenten.at(-1) ?? null,
      heeftReactie,
      nu,
    });
    if (!stap || lead.conceptSoort === stap) continue; // zelfde soort = staat al klaar of bewust overgeslagen
    const concept = maakStap(stap, lead.naam, lead.website);
    await db
      .update(leads)
      .set({ conceptSoort: stap, conceptOnderwerp: concept.onderwerp, conceptTekst: concept.tekst, conceptKlaarOp: nu, bijgewerkt: nu })
      .where(eq(leads.id, lead.id));
    verslag.push(`${lead.naam}: ${stap} klaargezet`);
  }

  return verslag;
}
