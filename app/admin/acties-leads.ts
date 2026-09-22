"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { afspraakBlokken, afspraken, leadActies, leadPost, leads, sites, verzondenMails } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { LEAD_STATUSSEN } from "@/lib/leads";
import { slugify } from "@/lib/actueel";
import { haalSiteTekst, schrijfLeadMail } from "@/lib/lead-mail-ai";
import type { MailStap } from "@/lib/lead-opvolging";
import { werkLeadsBij } from "@/lib/leads-bijwerken";

function veld(formData: FormData, naam: string): string | null {
  const w = String(formData.get(naam) ?? "").trim();
  return w || null;
}

function leadVelden(formData: FormData) {
  const status = String(formData.get("status") ?? "nieuw");
  return {
    naam: veld(formData, "naam") ?? "Onbekend",
    email: veld(formData, "email"),
    telefoon: veld(formData, "telefoon"),
    website: veld(formData, "website")?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? null,
    bron: veld(formData, "bron"),
    soort: formData.get("soort") === "partner" ? "partner" : "klant",
    status: LEAD_STATUSSEN.some((s) => s.waarde === status) ? status : "nieuw",
    notities: veld(formData, "notities"),
    oordeel: veld(formData, "oordeel"),
  };
}

function datumVeld(formData: FormData): string | null {
  const d = veld(formData, "datum");
  return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

export async function leadToevoegen(formData: FormData) {
  await requireAdmin();
  const [nieuw] = await db.insert(leads).values(leadVelden(formData)).returning({ id: leads.id });
  const eersteActie = veld(formData, "actie");
  if (nieuw && eersteActie) {
    await db.insert(leadActies).values({ leadId: nieuw.id, tekst: eersteActie, datum: datumVeld(formData) });
  }
  revalidatePath("/admin/leads");
}

export async function actieToevoegen(formData: FormData) {
  await requireAdmin();
  const leadId = Number(formData.get("leadId"));
  const tekst = veld(formData, "actie");
  if (!Number.isInteger(leadId) || !tekst) return;
  await db.insert(leadActies).values({ leadId, tekst, datum: datumVeld(formData) });
  revalidatePath("/admin/leads");
}

/** Vinkt een actie af, of zet een afgevinkte actie terug op open. */
export async function actieAfvinken(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const gedaan = formData.get("gedaan") === "1";
  await db
    .update(leadActies)
    .set({ gedaan, gedaanOp: gedaan ? new Date() : null })
    .where(eq(leadActies.id, id));
  revalidatePath("/admin/leads");
}

export async function actieVerwijderen(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await db.delete(leadActies).where(eq(leadActies.id, id));
  revalidatePath("/admin/leads");
}

export async function leadBijwerken(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await db
    .update(leads)
    .set({ ...leadVelden(formData), bijgewerkt: new Date() })
    .where(eq(leads.id, id));
  revalidatePath("/admin/leads");
}

export async function leadVerwijderen(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  // Een prospect die deze lead werd wijst er nog naar; zonder dit losmaken
  // weigert de database (prospects_lead_id_fkey) en zie je een kale fout.
  // De prospect zelf blijft staan met zijn status, dus wie op niet-mailen
  // staat blijft daar.
  const { prospects } = await import("@/db/schema");
  await db.update(prospects).set({ leadId: null }).where(eq(prospects.leadId, id));
  // Klaargezette dagen en afspraken van deze lead horen ook weg. Zonder dit
  // blijft een bevestigde kennismaking tijd blokkeren in bezetteTijden(),
  // terwijl er niemand meer is om mee af te spreken.
  await db.delete(afspraakBlokken).where(eq(afspraakBlokken.leadId, id));
  await db.delete(afspraken).where(eq(afspraken.leadId, id));
  await db.delete(leadActies).where(eq(leadActies.leadId, id));
  await db.delete(leadPost).where(eq(leadPost.leadId, id));
  await db.delete(leads).where(eq(leads.id, id));
  revalidatePath("/admin/leads");
}

/** Dezelfde ronde als de cron, maar op de knop in /admin/leads — zodat Jos
 * direct kan zien wat er binnenkomt in plaats van op het halfuur te wachten. */
export async function leadsNuBijwerken(): Promise<{ verslag: string[]; op: string }> {
  await requireAdmin();
  const verslag = await werkLeadsBij();
  revalidatePath("/admin/leads");
  return {
    verslag,
    op: new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" }),
  };
}

/** De leadmail (opnieuw) laten schrijven door de AI, met de volledige context:
 * gegevens, oordeel, website-inhoud, mail-tijdlijn, huidige tekst en Jos' aanwijzing. */
export async function conceptMetAi(
  _vorige: unknown,
  formData: FormData,
): Promise<{ gelukt: boolean; melding: string }> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { gelukt: false, melding: "Lead niet gevonden." };
  const [lead] = await db.select().from(leads).where(eq(leads.id, id));
  if (!lead) return { gelukt: false, melding: "Lead niet gevonden." };

  const adres = lead.email?.trim().toLowerCase();
  const postRijen = await db.select().from(leadPost).where(eq(leadPost.leadId, id));
  const verzonden = adres
    ? (await db.select().from(verzondenMails)).filter((m) => m.aan.trim().toLowerCase() === adres)
    : [];
  const dag = (d: Date) => d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", timeZone: "Europe/Amsterdam" });
  const tijdlijn = [
    ...verzonden.map((m) => ({ d: m.verzonden, regel: `${dag(m.verzonden)}: gemaild — "${m.onderwerp}"` })),
    ...postRijen.map((p) => ({
      d: p.datum,
      regel: `${dag(p.datum)}: ${p.richting === "in" ? "reactie van de lead" : "gemaild"}${p.onderwerp ? ` — "${p.onderwerp}"` : ""}${p.fragment ? ` · ${p.fragment.slice(0, 150)}` : ""}`,
    })),
  ]
    .sort((a, b) => a.d.getTime() - b.d.getTime())
    .map((x) => x.regel);

  const soort: MailStap = (lead.conceptSoort as MailStap | null) ?? "eerste";
  const concept = await schrijfLeadMail({
    soort,
    naam: lead.naam,
    website: lead.website,
    oordeel: lead.oordeel,
    notities: lead.notities,
    siteTekst: await haalSiteTekst(lead.website),
    tijdlijn,
    huidig: lead.conceptOnderwerp && lead.conceptTekst ? { onderwerp: lead.conceptOnderwerp, tekst: lead.conceptTekst } : null,
    instructie: veld(formData, "instructie"),
  });
  if (!concept) return { gelukt: false, melding: "De AI kon geen tekst maken — probeer het zo nog eens." };

  await db
    .update(leads)
    .set({ conceptSoort: soort, conceptOnderwerp: concept.onderwerp, conceptTekst: concept.tekst, conceptKlaarOp: new Date(), bijgewerkt: new Date() })
    .where(eq(leads.id, id));
  revalidatePath("/admin/leads");
  return { gelukt: true, melding: "Klaar — de nieuwe tekst staat in het kaartje bovenaan de pagina." };
}

/** De mailtekst van een klaarstaande stap opslaan: Jos maakt de inhoud (samen
 * met de chat), plakt hem in het kaartje en bewaart hem hier. */
export async function bewaarConcept(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const onderwerp = veld(formData, "onderwerp");
  const tekst = veld(formData, "tekst");
  if (!Number.isInteger(id) || !onderwerp || !tekst) return;
  await db
    .update(leads)
    .set({ conceptOnderwerp: onderwerp, conceptTekst: tekst, conceptKlaarOp: new Date(), bijgewerkt: new Date() })
    .where(eq(leads.id, id));
  revalidatePath("/admin/leads");
}

/** Klaarstaande opvolgstap overslaan: de tekst verdwijnt, de soort blijft staan
 * zodat de cron precies deze stap niet opnieuw klaarzet. */
export async function conceptOverslaan(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await db
    .update(leads)
    .set({ conceptOnderwerp: null, conceptTekst: null, conceptKlaarOp: null, bijgewerkt: new Date() })
    .where(eq(leads.id, id));
  revalidatePath("/admin/leads");
}

/** De formulier-stap is met de hand gedaan: vastleggen in de tijdlijn en het concept opruimen. */
export async function formulierGedaan(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await db.insert(leadPost).values({
    leadId: id,
    richting: "uit",
    bron: "contactformulier",
    onderwerp: "Bericht via hun eigen contactformulier",
    fragment: null,
    messageId: `formulier-${id}-${Date.now()}`,
    datum: new Date(),
  });
  await db
    .update(leads)
    .set({ conceptOnderwerp: null, conceptTekst: null, conceptKlaarOp: null, bijgewerkt: new Date() })
    .where(eq(leads.id, id));
  revalidatePath("/admin/leads");
}

export type KlantUitkomst = { ok: boolean; melding: string; siteId?: number };

/**
 * Lead wordt klant: maakt de klantrij aan, koppelt hem aan de lead en zet de
 * leadstatus op "klant geworden".
 *
 * De kennismakingsafspraak blijft bewust aan de lead hangen en verhuist niet
 * mee: dat gesprek hoorde bij de leadfase en staat zo op de juiste plek in de
 * tijdlijn. Het agenda-overzicht laat afspraken van klanten én leads zien, dus
 * een komende kennismaking verdwijnt niet uit beeld door deze knop.
 */
export async function leadWordtKlant(
  _vorige: KlantUitkomst | null,
  formData: FormData,
): Promise<KlantUitkomst> {
  const admin = await requireAdmin();
  const id = Number(formData.get("leadId"));
  if (!Number.isInteger(id) || id <= 0) return { ok: false, melding: "Onbekende lead." };
  const [lead] = await db.select().from(leads).where(eq(leads.id, id));
  if (!lead) return { ok: false, melding: "Onbekende lead." };
  if (lead.siteId) return { ok: false, melding: "Deze lead is al klant." };

  const repo = slugify(String(formData.get("repo") ?? "").trim() || lead.naam);
  if (!repo) return { ok: false, melding: "Vul een repo-naam in." };
  const [bestaat] = await db.select({ id: sites.id }).from(sites).where(eq(sites.githubRepo, repo));
  if (bestaat) return { ok: false, melding: `Er is al een klant met repo ${repo}; kies een andere naam.` };

  const [site] = await db
    .insert(sites)
    .values({
      clerkUserId: admin.id,
      naam: lead.naam,
      githubRepo: repo,
      domein: lead.website || null,
      // Nog geen eigen account: hierdoor weet klantAdres() al waar de mail heen
      // moet, en wordt de klant gekoppeld zodra hij zelf inlogt.
      uitnodigingEmail: lead.email || null,
    })
    .returning({ id: sites.id });
  if (!site) return { ok: false, melding: "De klant aanmaken lukte niet." };

  await db.update(leads).set({ siteId: site.id, status: "klant", bijgewerkt: new Date() }).where(eq(leads.id, id));
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  return { ok: true, melding: `${lead.naam} staat nu als klant in de lijst.`, siteId: site.id };
}
