import { NextResponse } from "next/server";
import { eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { abonnementen, sites } from "@/db/schema";
import { euro, inclBtwCent, mollie, vandaagNl } from "@/lib/mollie";
import { datumInWoorden, magOffline } from "@/lib/opzegging";
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

  // Opgezegde sites: na de betaalde periode gaat de site op slot (geen
  // wijzigingen meer), en op de dag dat hij offline mag krijgt Jos een seintje.
  // Offline halen doet hij zelf — dat is niet terug te draaien.
  const opgezegdeSites = await db
    .select({ id: sites.id, naam: sites.naam, status: sites.status, offlineNa: sites.offlineNa, siteSlug: sites.siteSlug })
    .from(sites)
    .where(isNotNull(sites.offlineNa));
  for (const site of opgezegdeSites) {
    const [abo] = await db
      .select({ betaaldTot: abonnementen.betaaldTot })
      .from(abonnementen)
      .where(eq(abonnementen.siteId, site.id));
    const betaaldTot = abo?.betaaldTot ?? null;
    if (betaaldTot && vandaag > betaaldTot && site.status !== "opgezegd") {
      await db.update(sites).set({ status: "opgezegd" }).where(eq(sites.id, site.id));
      gedaan.push(`${site.naam}: betaalde periode voorbij, site staat op opgezegd (blijft nog online tot ${site.offlineNa})`);
    }
    if (magOffline(site.offlineNa, vandaag) && site.offlineNa === vandaag) {
      await mailVanJos({
        naar: "jos@wordswap.nl",
        bcc: false,
        onderwerp: `📦 Website mag offline: ${site.naam}`,
        html: `<p>De extra maand na de opzegging van <strong>${site.naam}</strong> is voorbij (${datumInWoorden(site.offlineNa)}).</p>
<p>Je mag de website nu offline halen. Loop eerst de vertrek-stappen na: DNS-overzicht gemaild, klant heeft zijn bestanden, domein verhuisd.</p>
<p><a href="https://www.wordswap.nl/admin/klant/${site.id}">Naar de klant in de admin</a></p>`,
      });
      gedaan.push(`${site.naam}: extra maand voorbij, seintje gestuurd dat de site offline mag`);
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
