import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { abonnementen, betaalverzoeken, betalingen, sites } from "@/db/schema";
import { euro, inclBtwCent, mollie, SITE_URL, type MolliePayment } from "@/lib/mollie";

export const dynamic = "force-dynamic";

/** Maakt pas bij het klikken een verse Mollie-betaling, zodat de gemailde link nooit verloopt. */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pagina = `${SITE_URL}/betalen/${token}`;
  const [v] = await db.select().from(betaalverzoeken).where(eq(betaalverzoeken.token, token));
  if (!v || v.wijze !== "link") return new NextResponse("Niet gevonden", { status: 404 });
  if (v.status !== "open") return NextResponse.redirect(pagina, 303);

  const [site] = await db.select().from(sites).where(eq(sites.id, v.siteId));
  let [abo] = await db.select().from(abonnementen).where(eq(abonnementen.siteId, v.siteId));
  const bedragIncl = inclBtwCent(v.bedragExclCent);

  let betaling: MolliePayment;
  try {
    let customerId = abo?.mollieCustomerId ?? undefined;
    if (v.soort === "eerste") {
      if (!abo || abo.status !== "wacht_op_eerste") return NextResponse.redirect(pagina, 303);
      if (!customerId) {
        customerId = (
          await mollie<{ id: string }>("/customers", {
            methode: "POST",
            body: { name: abo.klantBedrijf ?? abo.naam, email: abo.email, metadata: { siteId: v.siteId } },
          })
        ).id;
        [abo] = await db
          .update(abonnementen)
          .set({ mollieCustomerId: customerId, bijgewerkt: new Date() })
          .where(eq(abonnementen.id, abo.id))
          .returning();
      }
    }
    betaling = await mollie<MolliePayment>("/payments", {
      methode: "POST",
      body: {
        amount: { currency: "EUR", value: euro(bedragIncl) },
        description: `WordSwap ${site?.naam ?? ""}: ${v.omschrijving}`.slice(0, 255),
        redirectUrl: `${SITE_URL}/betaald${v.soort === "los" ? "?soort=los" : ""}`,
        webhookUrl: `${SITE_URL}/api/mollie/webhook`,
        ...(customerId ? { customerId } : {}),
        sequenceType: v.soort === "eerste" ? "first" : "oneoff",
        ...(v.soort === "eerste" ? { method: "ideal" } : {}),
        metadata: { siteId: v.siteId, verzoekId: v.id, soort: v.soort },
      },
    });
  } catch (e) {
    console.error("Betaling starten mislukt:", e);
    return NextResponse.redirect(`${pagina}?fout=1`, 303);
  }

  await db
    .insert(betalingen)
    .values({
      siteId: v.siteId,
      molliePaymentId: betaling.id,
      soort: v.soort === "eerste" ? "eerste" : "los",
      bedragCent: bedragIncl,
      status: betaling.status,
      omschrijving: v.omschrijving,
    })
    .onConflictDoNothing();
  await db.update(betaalverzoeken).set({ molliePaymentId: betaling.id }).where(eq(betaalverzoeken.id, v.id));

  const checkout = betaling._links.checkout?.href;
  return checkout ? NextResponse.redirect(checkout, 303) : NextResponse.redirect(`${pagina}?fout=1`, 303);
}
