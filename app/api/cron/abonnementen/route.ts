import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { abonnementen } from "@/db/schema";
import { euro, inclBtwCent, mollie, vandaagNl } from "@/lib/mollie";
import { mailVanJos } from "@/lib/wordswap-mail";

export const dynamic = "force-dynamic";

/** Dagelijks: geplande wijzigingen van het maandbedrag doorvoeren en geplande opzeggingen uitvoeren. */
export async function GET(req: Request) {
  const geheim = process.env.CRON_SECRET;
  if (!geheim || req.headers.get("authorization") !== `Bearer ${geheim}`) {
    return new NextResponse("Geen toegang", { status: 401 });
  }
  const vandaag = vandaagNl();
  const lopend = await db.select().from(abonnementen).where(inArray(abonnementen.status, ["actief", "mislukt"]));
  const gedaan: string[] = [];
  const fouten: string[] = [];

  for (const abo of lopend) {
    const pad = `/customers/${abo.mollieCustomerId}/subscriptions/${abo.mollieSubscriptionId}`;
    const heeftIncasso = Boolean(abo.mollieCustomerId && abo.mollieSubscriptionId);

    if (abo.stoptOp && abo.stoptOp <= vandaag) {
      try {
        if (heeftIncasso) await mollie(pad, { methode: "DELETE" });
        await db
          .update(abonnementen)
          .set({ status: "gestopt", mollieSubscriptionId: null, stoptOp: null, nieuwBedragCent: null, nieuwBedragVanaf: null, bijgewerkt: new Date() })
          .where(eq(abonnementen.id, abo.id));
        gedaan.push(`${abo.naam}: opgezegd per ${abo.stoptOp}`);
      } catch (e) {
        fouten.push(`${abo.naam}: opzeggen mislukt (${String(e)})`);
      }
      continue;
    }

    if (abo.nieuwBedragCent && abo.nieuwBedragVanaf && abo.nieuwBedragVanaf <= vandaag) {
      try {
        if (heeftIncasso) {
          await mollie(pad, {
            methode: "PATCH",
            body: { amount: { currency: "EUR", value: euro(inclBtwCent(abo.nieuwBedragCent)) } },
          });
        }
        await db
          .update(abonnementen)
          .set({ maandbedragCent: abo.nieuwBedragCent, nieuwBedragCent: null, nieuwBedragVanaf: null, bijgewerkt: new Date() })
          .where(eq(abonnementen.id, abo.id));
        gedaan.push(`${abo.naam}: maandbedrag nu ${euro(abo.nieuwBedragCent)} excl. btw`);
      } catch (e) {
        fouten.push(`${abo.naam}: bedrag wijzigen mislukt (${String(e)})`);
      }
    }
  }

  if (gedaan.length || fouten.length) {
    await mailVanJos({
      naar: "jos@wordswap.nl",
      bcc: false,
      onderwerp: fouten.length ? "⚠️ Abonnementen: niet alles gelukt" : "💶 Abonnementen bijgewerkt",
      html: `${gedaan.length ? `<p>Uitgevoerd:</p><ul>${gedaan.map((g) => `<li>${g}</li>`).join("")}</ul>` : ""}${
        fouten.length ? `<p>Mislukt, kijk even in de admin:</p><ul>${fouten.map((g) => `<li>${g}</li>`).join("")}</ul>` : ""
      }`,
    });
  }
  return NextResponse.json({ gedaan, fouten });
}
