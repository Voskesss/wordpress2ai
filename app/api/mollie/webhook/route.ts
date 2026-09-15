import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { abonnementen, betaalverzoeken, betalingen } from "@/db/schema";
import { creditBijTerugbetaling, factuurBijBetaling } from "@/lib/factuur";
import { centVan, euro, inclBtwCent, mollie, SITE_URL, volgendeMaand, type MolliePayment } from "@/lib/mollie";
import { mailVanJos } from "@/lib/wordswap-mail";

export const dynamic = "force-dynamic";

function meldJos(onderwerp: string, html: string) {
  return mailVanJos({ naar: "jos@wordswap.nl", onderwerp, html, bcc: false });
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

  const meta = betaling.metadata ?? {};
  const isLos = meta.soort === "los";
  let abo = betaling.customerId
    ? (await db.select().from(abonnementen).where(eq(abonnementen.mollieCustomerId, betaling.customerId)))[0]
    : undefined;
  const siteIdMeta = Number(meta.siteId);
  if (!abo && Number.isInteger(siteIdMeta)) {
    abo = (await db.select().from(abonnementen).where(eq(abonnementen.siteId, siteIdMeta)))[0];
  }
  const siteId = abo?.siteId ?? siteIdMeta;
  if (!Number.isInteger(siteId)) return new NextResponse("ok");
  const klantNaam = abo?.naam ?? `site ${siteId}`;
  const mislukt = ["failed", "expired", "canceled"].includes(betaling.status);

  await db
    .insert(betalingen)
    .values({
      siteId,
      molliePaymentId: id,
      soort: isLos ? "los" : betaling.sequenceType === "first" ? "eerste" : "maand",
      bedragCent: centVan(betaling.amount),
      status: betaling.status,
      omschrijving: betaling.description,
    })
    .onConflictDoUpdate({
      target: betalingen.molliePaymentId,
      set: { status: betaling.status, bijgewerkt: new Date() },
    });

  const verzoekId = Number(meta.verzoekId);
  if (Number.isInteger(verzoekId) && verzoekId > 0) {
    if (betaling.status === "paid") {
      await db
        .update(betaalverzoeken)
        .set({ status: "betaald", betaaldOp: new Date(), molliePaymentId: id })
        .where(eq(betaalverzoeken.id, verzoekId));
    } else if (mislukt && betaling.sequenceType === "recurring") {
      await db.update(betaalverzoeken).set({ status: "mislukt" }).where(eq(betaalverzoeken.id, verzoekId));
    }
  }

  // Eerste betaling gelukt → machtiging staat, dan de maandelijkse incasso starten.
  // Die bevat alleen het maandbedrag; de eenmalige omzetting zat in de eerste betaling.
  if (!isLos && abo && betaling.sequenceType === "first" && betaling.status === "paid" && !abo.mollieSubscriptionId) {
    const maandIncl = inclBtwCent(abo.maandbedragCent);
    try {
      const sub = await mollie<{ id: string }>(`/customers/${betaling.customerId}/subscriptions`, {
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
          mollieCustomerId: betaling.customerId ?? abo.mollieCustomerId,
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
      await meldJos(`⚠️ Factuur niet gemaakt: ${klantNaam}`, `<p>Betaling ${id} is binnen, maar de factuur kon niet worden gemaakt: ${String(e)}</p>`);
      return new NextResponse("later opnieuw", { status: 500 });
    }
  }

  // Terugboeking door de bank → creditfactuur en een seintje
  if (centVan(betaling.amountChargedBack) > 0) {
    try {
      const gemaakt = await creditBijTerugbetaling(betaling, "terugboeking");
      if (gemaakt) {
        await meldJos(
          `⚠️ Terugboeking: ${klantNaam}`,
          `<p>De bank van ${klantNaam} heeft ${betaling.amountChargedBack?.value} euro teruggeboekt (betaling ${id}). Er is automatisch een creditfactuur gemaakt en gemaild. Neem even contact op met de klant.</p>`,
        );
      }
    } catch (e) {
      console.error("Creditfactuur bij terugboeking mislukt:", e);
      return new NextResponse("later opnieuw", { status: 500 });
    }
  }

  if (betaling.sequenceType === "recurring" && mislukt) {
    if (isLos) {
      await meldJos(
        `⚠️ Afschrijving losse opdracht mislukt: ${klantNaam}`,
        `<p>De afschrijving "${betaling.description}" van ${betaling.amount.value} euro is mislukt (${betaling.details?.bankReason ?? betaling.status}). Stuur de klant eventueel een betaallink.</p>`,
      );
    } else if (abo) {
      await db.update(abonnementen).set({ status: "mislukt", bijgewerkt: new Date() }).where(eq(abonnementen.id, abo.id));
      await meldJos(
        `⚠️ Incasso mislukt: ${abo.naam}`,
        `<p>De maandelijkse incasso van ${betaling.amount.value} euro bij ${abo.naam} is mislukt (${betaling.details?.bankReason ?? betaling.status}).</p><p>Mollie probeert het niet automatisch opnieuw. Neem even contact op met de klant.</p>`,
      );
    }
  }
  if (!isLos && abo && betaling.sequenceType === "recurring" && betaling.status === "paid" && abo.status === "mislukt") {
    await db.update(abonnementen).set({ status: "actief", bijgewerkt: new Date() }).where(eq(abonnementen.id, abo.id));
  }

  return new NextResponse("ok");
}
