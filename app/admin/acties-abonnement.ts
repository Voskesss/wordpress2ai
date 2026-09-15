"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { abonnementen, betalingen, sites } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { handtekening } from "@/lib/mailer";
import { euro, euroTekst, inclBtwCent, mollie, SITE_URL, type MolliePayment } from "@/lib/mollie";

function terug(siteId: number, melding: string): never {
  redirect(`/admin/klant/${siteId}?abonnement=${encodeURIComponent(melding)}#abonnement`);
}

/** Maakt (of vernieuwt) de betaallink voor de eerste maand. Betaalt de klant, dan start de incasso vanzelf. */
export async function startAbonnement(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return;
  const naam = String(formData.get("naam") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const bedrag = Number(String(formData.get("bedrag") ?? "").replace(",", "."));
  if (!naam || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) terug(siteId, "Vul een naam en geldig e-mailadres in.");
  if (!(bedrag >= 1 && bedrag <= 1000)) terug(siteId, "Vul een maandbedrag tussen €1 en €1000 in.");

  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return;
  const [bestaand] = await db.select().from(abonnementen).where(eq(abonnementen.siteId, siteId));
  if (bestaand?.status === "actief") terug(siteId, "Er loopt al een actieve incasso. Stop die eerst.");

  const exclCent = Math.round(bedrag * 100);
  const inclCent = inclBtwCent(exclCent);
  let link: string;
  let klantId: string;
  let betalingId: string;
  try {
    klantId =
      bestaand?.mollieCustomerId ??
      (await mollie<{ id: string }>("/customers", {
        methode: "POST",
        body: { name: naam, email, metadata: { siteId } },
      })).id;
    const betaling = await mollie<MolliePayment>("/payments", {
      methode: "POST",
      body: {
        amount: { currency: "EUR", value: euro(inclCent) },
        description: `WordSwap — ${site.naam} — eerste maand`,
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
    maandbedragCent: exclCent,
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
    .values({ siteId, molliePaymentId: betalingId, soort: "eerste", bedragCent: inclCent, status: "open", omschrijving: `Eerste maand` })
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
  const incl = inclBtwCent(abo.maandbedragCent);
  const voornaam = abo.naam.split(" ")[0];
  const html = `<p>Beste ${voornaam},</p>
<p>Fijn dat je website bij WordSwap draait! Via de knop hieronder start je je maandbedrag van <strong>${euroTekst(abo.maandbedragCent)} per maand</strong> (${euroTekst(incl)} inclusief btw) voor hosting, beheer en het AI-portaal.</p>
<p><a href="${abo.betaallink}" style="display:inline-block;background:#31956B;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">Start mijn maandbedrag via iDEAL</a></p>
<p>Je betaalt nu de eerste maand via iDEAL. Daarmee geef je ook toestemming om het maandbedrag voortaan automatisch af te schrijven, zodat je er verder niet meer aan hoeft te denken. Opzeggen kan altijd per maand: een mailtje is genoeg.</p>
<p>Met vriendelijke groet,</p>${handtekening(false)}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `Jos van WordSwap <${adres}>`,
      to: [abo.email],
      bcc: ["jos@wordswap.nl"],
      subject: "Je maandbedrag voor WordSwap starten",
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
