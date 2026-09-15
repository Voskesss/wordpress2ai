"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { abonnementen, betalingen, facturen, sites } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { mailFactuur } from "@/lib/factuur";
import { handtekening } from "@/lib/mailer";
import { euro, euroTekst, inclBtwCent, mollie, SITE_URL, type MolliePayment } from "@/lib/mollie";

function terug(siteId: number, melding: string): never {
  redirect(`/admin/klant/${siteId}?abonnement=${encodeURIComponent(melding)}#abonnement`);
}

function bedragVeld(formData: FormData, naam: string): number {
  const w = String(formData.get(naam) ?? "").trim().replace(",", ".");
  return w === "" ? 0 : Number(w);
}

/** Maakt (of vernieuwt) de betaallink voor de eerste betaling: eenmalige omzetting + eerste maand. */
export async function startAbonnement(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return;
  const naam = String(formData.get("naam") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const klantBedrijf = String(formData.get("bedrijf") ?? "").trim() || null;
  const klantAdres = String(formData.get("adres") ?? "").trim() || null;
  const maand = bedragVeld(formData, "bedrag");
  const eenmalig = bedragVeld(formData, "eenmalig");
  if (!naam || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) terug(siteId, "Vul een naam en geldig e-mailadres in.");
  if (!(maand >= 1 && maand <= 1000)) terug(siteId, "Vul een maandbedrag tussen €1 en €1000 in.");
  if (!(eenmalig >= 0 && eenmalig <= 20000)) terug(siteId, "Vul een geldig bedrag voor de omzetting in (of laat het leeg).");

  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return;
  const [bestaand] = await db.select().from(abonnementen).where(eq(abonnementen.siteId, siteId));
  if (bestaand?.status === "actief") terug(siteId, "Er loopt al een actieve incasso. Stop die eerst.");

  const maandCent = Math.round(maand * 100);
  const eenmaligCent = Math.round(eenmalig * 100);
  const eersteIncl = inclBtwCent(maandCent + eenmaligCent);
  let link: string;
  let klantId: string;
  let betalingId: string;
  try {
    klantId =
      bestaand?.mollieCustomerId ??
      (await mollie<{ id: string }>("/customers", {
        methode: "POST",
        body: { name: klantBedrijf ?? naam, email, metadata: { siteId } },
      })).id;
    const betaling = await mollie<MolliePayment>("/payments", {
      methode: "POST",
      body: {
        amount: { currency: "EUR", value: euro(eersteIncl) },
        description: eenmaligCent > 0 ? `WordSwap ${site.naam}: omzetting en eerste maand` : `WordSwap ${site.naam}: eerste maand`,
        redirectUrl: `${SITE_URL}/betaald`,
        webhookUrl: `${SITE_URL}/api/mollie/webhook`,
        customerId: klantId,
        sequenceType: "first",
        method: "ideal",
        metadata: { siteId },
      },
    });
    link = betaling._links.checkout?.href ?? "";
    betalingId = betaling.id;
  } catch (e) {
    terug(siteId, `Mollie gaf een fout: ${e instanceof Error ? e.message : String(e)}`);
  }

  const waarden = {
    email,
    naam,
    klantBedrijf,
    klantAdres,
    maandbedragCent: maandCent,
    eenmaligCent,
    status: "wacht_op_eerste" as const,
    mollieCustomerId: klantId,
    mollieMandateId: null,
    mollieSubscriptionId: null,
    betaallink: link,
    bijgewerkt: new Date(),
  };
  await db
    .insert(abonnementen)
    .values({ siteId, ...waarden })
    .onConflictDoUpdate({ target: abonnementen.siteId, set: waarden });
  await db
    .insert(betalingen)
    .values({
      siteId,
      molliePaymentId: betalingId,
      soort: "eerste",
      bedragCent: eersteIncl,
      status: "open",
      omschrijving: eenmaligCent > 0 ? "Omzetting en eerste maand" : "Eerste maand",
    })
    .onConflictDoNothing();
  revalidatePath(`/admin/klant/${siteId}`);
  terug(siteId, "Betaallink aangemaakt. Stuur hem naar de klant.");
}

/** Mailt de betaallink naar de klant. */
export async function mailBetaallink(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return;
  const [abo] = await db.select().from(abonnementen).where(eq(abonnementen.siteId, siteId));
  if (!abo?.betaallink) terug(siteId, "Er is geen openstaande betaallink.");
  const key = process.env.RESEND_API_KEY;
  if (!key) terug(siteId, "RESEND_API_KEY ontbreekt.");
  const basisFrom = process.env.RESEND_FROM ?? "WordSwap <onboarding@resend.dev>";
  const adres = basisFrom.match(/<([^>]+)>/)?.[1] ?? basisFrom;
  const eersteIncl = inclBtwCent(abo.maandbedragCent + abo.eenmaligCent);
  const voornaam = abo.naam.split(" ")[0];
  const uitleg =
    abo.eenmaligCent > 0
      ? `<p>Via de knop hieronder betaal je in één keer de omzetting van je website (${euroTekst(abo.eenmaligCent)}) en je eerste maand hosting, beheer en AI-portaal (${euroTekst(abo.maandbedragCent)}). Samen is dat <strong>${euroTekst(eersteIncl)} inclusief btw</strong>.</p>
<p>Daarna wordt alleen het maandbedrag van ${euroTekst(abo.maandbedragCent)} (${euroTekst(inclBtwCent(abo.maandbedragCent))} inclusief btw) automatisch afgeschreven.</p>`
      : `<p>Via de knop hieronder start je je maandbedrag van <strong>${euroTekst(abo.maandbedragCent)} per maand</strong> (${euroTekst(eersteIncl)} inclusief btw) voor hosting, beheer en het AI-portaal.</p>`;
  const html = `<p>Beste ${voornaam},</p>
<p>Fijn dat je website bij WordSwap draait!</p>
${uitleg}
<p><a href="${abo.betaallink}" style="display:inline-block;background:#31956B;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">Betalen via iDEAL</a></p>
<p>Met deze betaling geef je ook toestemming om het maandbedrag voortaan automatisch af te schrijven, zodat je er verder niet meer aan hoeft te denken. Je krijgt bij elke betaling automatisch een factuur. Opzeggen kan altijd per maand: een mailtje is genoeg.</p>
<p>Met vriendelijke groet,</p>${handtekening(false)}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `Jos van WordSwap <${adres}>`,
      to: [abo.email],
      bcc: ["jos@wordswap.nl"],
      subject: "Je betaling voor WordSwap",
      html,
      reply_to: ["jos@wordswap.nl"],
    }),
  });
  terug(siteId, res.ok ? `Betaallink gemaild naar ${abo.email} (kopie naar jos@wordswap.nl).` : "Mailen mislukt, probeer het opnieuw.");
}

/** Stopt de maandelijkse incasso bij Mollie. */
export async function stopAbonnement(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return;
  const [abo] = await db.select().from(abonnementen).where(eq(abonnementen.siteId, siteId));
  if (!abo) return;
  if (abo.mollieCustomerId && abo.mollieSubscriptionId) {
    try {
      await mollie(`/customers/${abo.mollieCustomerId}/subscriptions/${abo.mollieSubscriptionId}`, { methode: "DELETE" });
    } catch (e) {
      terug(siteId, `Stoppen bij Mollie mislukt: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  await db
    .update(abonnementen)
    .set({ status: "gestopt", mollieSubscriptionId: null, betaallink: null, bijgewerkt: new Date() })
    .where(eq(abonnementen.id, abo.id));
  terug(siteId, "Incasso gestopt. Er wordt niets meer afgeschreven.");
}

/** Stuurt een factuur opnieuw naar de klant. */
export async function factuurOpnieuwMailen(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  const id = Number(formData.get("factuurId"));
  if (!Number.isInteger(siteId) || !Number.isInteger(id)) return;
  const [f] = await db.select().from(facturen).where(eq(facturen.id, id));
  if (!f) return;
  const gelukt = await mailFactuur(f);
  terug(siteId, gelukt ? `Factuur ${f.nummer} opnieuw gemaild naar ${f.klantEmail}.` : "Mailen van de factuur mislukt.");
}
