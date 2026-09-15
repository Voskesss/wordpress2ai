import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { abonnementen, betalingen } from "@/db/schema";
import { factuurBijBetaling } from "@/lib/factuur";
import { euro, inclBtwCent, mollie, SITE_URL, volgendeMaand, type MolliePayment } from "@/lib/mollie";

export const dynamic = "force-dynamic";

async function meldJos(onderwerp: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const basisFrom = process.env.RESEND_FROM ?? "WordSwap <onboarding@resend.dev>";
  const adres = basisFrom.match(/<([^>]+)>/)?.[1] ?? basisFrom;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: `WordSwap <${adres}>`, to: ["jos@wordswap.nl"], subject: onderwerp, html }),
  }).catch((e) => console.error("Melding aan Jos mislukt:", e));
}

// Mollie stuurt alleen een id mee; de echte status halen we altijd zelf op,
// zodat een nagemaakt verzoek niets kan veranderen.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const id = String(form?.get("id") ?? "");
  if (!/^tr_\w+$/.test(id)) return new NextResponse("ok");

  let betaling: MolliePayment;
  try {
    betaling = await mollie<MolliePayment>(`/payments/${id}`);
  } catch (e) {
    console.error("Mollie-betaling ophalen mislukt:", e);
    return new NextResponse("later opnieuw", { status: 500 });
  }

  const [abo] = betaling.customerId
    ? await db.select().from(abonnementen).where(eq(abonnementen.mollieCustomerId, betaling.customerId))
    : [];
  const siteId = abo?.siteId ?? Number(betaling.metadata?.siteId);
  if (!Number.isInteger(siteId)) return new NextResponse("ok");

  const bedragCent = Math.round(Number(betaling.amount.value) * 100);
  const soort = betaling.sequenceType === "first" ? "eerste" : "maand";
  await db
    .insert(betalingen)
    .values({ siteId, molliePaymentId: id, soort, bedragCent, status: betaling.status, omschrijving: betaling.description })
    .onConflictDoUpdate({
      target: betalingen.molliePaymentId,
      set: { status: betaling.status, bijgewerkt: new Date() },
    });

  if (!abo) return new NextResponse("ok");

  // Eerste betaling gelukt → machtiging staat, dan de maandelijkse incasso starten.
  // Die bevat alleen het maandbedrag; de eenmalige omzetting zat in de eerste betaling.
  if (betaling.sequenceType === "first" && betaling.status === "paid" && !abo.mollieSubscriptionId) {
    const maandIncl = inclBtwCent(abo.maandbedragCent);
    try {
      const sub = await mollie<{ id: string }>(`/customers/${abo.mollieCustomerId}/subscriptions`, {
        methode: "POST",
        body: {
          amount: { currency: "EUR", value: euro(maandIncl) },
          interval: "1 month",
          startDate: volgendeMaand(),
          description: `WordSwap maandbedrag ${abo.naam} (${siteId})`,
          mandateId: betaling.mandateId,
          webhookUrl: `${SITE_URL}/api/mollie/webhook`,
          metadata: { siteId },
        },
      });
      await db
        .update(abonnementen)
        .set({
          status: "actief",
          mollieMandateId: betaling.mandateId ?? null,
          mollieSubscriptionId: sub.id,
          betaallink: null,
          bijgewerkt: new Date(),
        })
        .where(eq(abonnementen.id, abo.id));
      await meldJos(
        `💶 Incasso gestart: ${abo.naam}`,
        `<p>${abo.naam} heeft de eerste betaling gedaan (${betaling.amount.value} euro). Vanaf ${volgendeMaand()} schrijft Mollie maandelijks ${euro(maandIncl)} euro af.</p>`,
      );
    } catch (e) {
      console.error("Abonnement aanmaken mislukt:", e);
      await meldJos(
        `⚠️ Incasso niet gestart: ${abo.naam}`,
        `<p>De eerste betaling van ${abo.naam} is binnen, maar het maandelijkse abonnement kon niet worden aangemaakt: ${String(e)}</p><p>Kijk in de admin bij deze klant.</p>`,
      );
      return new NextResponse("later opnieuw", { status: 500 });
    }
  }

  if (betaling.status === "paid") {
    try {
      await factuurBijBetaling(betaling);
    } catch (e) {
      console.error("Factuur maken mislukt:", e);
      await meldJos(`⚠️ Factuur niet gemaakt: ${abo.naam}`, `<p>Betaling ${id} is binnen, maar de factuur kon niet worden gemaakt: ${String(e)}</p>`);
      return new NextResponse("later opnieuw", { status: 500 });
    }
  }

  // Maandelijkse incasso mislukt (bijv. te weinig saldo of teruggeboekt)
  if (betaling.sequenceType === "recurring" && ["failed", "expired", "canceled"].includes(betaling.status)) {
    await db.update(abonnementen).set({ status: "mislukt", bijgewerkt: new Date() }).where(eq(abonnementen.id, abo.id));
    await meldJos(
      `⚠️ Incasso mislukt: ${abo.naam}`,
      `<p>De maandelijkse incasso van ${betaling.amount.value} euro bij ${abo.naam} is mislukt (${betaling.details?.bankReason ?? betaling.status}).</p><p>Mollie probeert het niet automatisch opnieuw. Neem even contact op met de klant.</p>`,
    );
  }
  if (betaling.sequenceType === "recurring" && betaling.status === "paid" && abo.status === "mislukt") {
    await db.update(abonnementen).set({ status: "actief", bijgewerkt: new Date() }).where(eq(abonnementen.id, abo.id));
  }

  return new NextResponse("ok");
}
