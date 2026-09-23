import { eq } from "drizzle-orm";
import { db } from "@/db";
import { abonnementen, sites } from "@/db/schema";
import { euro, inclBtwCent, mollie, SITE_URL, vandaagNl } from "@/lib/mollie";
import { datumInWoorden, herstartDatum } from "@/lib/opzegging";
import { mailVanJos, ontsnap } from "@/lib/wordswap-mail";

/**
 * Een opzegging ongedaan maken — door de klant zelf in het portaal of door Jos
 * in de admin. Drie situaties:
 * 1. De incasso staat nog: alleen de geplande stop weghalen, klaar.
 * 2. De incasso is al gestopt, maar de machtiging bestaat nog: nieuwe
 *    maandincasso aanmaken vanaf de eerstvolgende afschrijfdatum.
 * 3. Geen machtiging meer: de site blijft gewoon staan en Jos stuurt een
 *    nieuwe betaallink.
 */
export async function draaiOpzeggingTerug(
  siteId: number,
  door: "klant" | "beheerder",
): Promise<{ ok: boolean; melding: string }> {
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return { ok: false, melding: "Site niet gevonden." };
  const [abo] = await db.select().from(abonnementen).where(eq(abonnementen.siteId, siteId)).catch(() => []);
  const opgezegd = Boolean(site.offlineNa) || Boolean(abo?.stoptOp) || abo?.status === "gestopt";
  if (!opgezegd) return { ok: false, melding: "Er staat geen opzegging open." };
  const vandaag = vandaagNl();

  let melding: string;
  let nieuweIncasso: string | null = null;
  let handmatig = false;

  if (abo && abo.stoptOp && (abo.status === "actief" || abo.status === "mislukt")) {
    // De incasso is nog niet gestopt: alleen de geplande stop weghalen
    await db
      .update(abonnementen)
      .set({ stoptOp: null, betaaldTot: null, bijgewerkt: new Date() })
      .where(eq(abonnementen.id, abo.id));
    melding = "De opzegging is ingetrokken. Je incasso loopt gewoon door.";
  } else if (abo && abo.status === "gestopt" && abo.mollieCustomerId && abo.mollieMandateId) {
    // De incasso was al gestopt: opnieuw opzetten met dezelfde machtiging
    const start = herstartDatum(abo.betaaldTot, vandaag);
    try {
      const sub = await mollie<{ id: string }>(`/customers/${abo.mollieCustomerId}/subscriptions`, {
        methode: "POST",
        body: {
          amount: { currency: "EUR", value: euro(inclBtwCent(abo.maandbedragCent)) },
          interval: "1 month",
          startDate: start,
          description: `WordSwap maandbedrag ${abo.naam} (${siteId})`,
          mandateId: abo.mollieMandateId,
          webhookUrl: `${SITE_URL}/api/mollie/webhook`,
          metadata: { siteId: String(siteId) },
        },
      });
      await db
        .update(abonnementen)
        .set({ status: "actief", mollieSubscriptionId: sub.id, stoptOp: null, betaaldTot: null, bijgewerkt: new Date() })
        .where(eq(abonnementen.id, abo.id));
      nieuweIncasso = start;
      melding = `De opzegging is ingetrokken. De maandelijkse incasso loopt weer vanaf ${datumInWoorden(start)}.`;
    } catch (e) {
      handmatig = true;
      melding =
        "De opzegging is ingetrokken en je website blijft gewoon in de lucht. De automatische incasso moet opnieuw worden ingesteld; Jos neemt daarvoor contact met je op.";
      console.error("Incasso opnieuw starten mislukt:", e);
    }
  } else {
    handmatig = true;
    melding =
      "De opzegging is ingetrokken en je website blijft gewoon in de lucht. Voor de betaling neemt Jos contact met je op.";
  }

  // De site is weer een gewone klant: einddatum weg, status terug naar actief
  await db
    .update(sites)
    .set({ offlineNa: null, ...(site.status === "opgezegd" ? { status: "actief" as const } : {}) })
    .where(eq(sites.id, siteId));

  await mailVanJos({
    naar: "jos@wordswap.nl",
    bcc: false,
    onderwerp: `↩️ Opzegging ingetrokken: ${site.naam}`,
    html: `<p>De opzegging voor <strong>${ontsnap(site.naam)}</strong> is ingetrokken ${
      door === "klant" ? "door de klant in het portaal" : "door jou in de admin"
    }.</p>
<ul>
<li>Incasso: ${
      nieuweIncasso
        ? `opnieuw aangemaakt bij Mollie, eerste afschrijving ${datumInWoorden(nieuweIncasso)}`
        : handmatig
          ? "<strong>moet je zelf regelen</strong> — er is geen bruikbare machtiging meer, stuur een nieuwe betaallink"
          : "liep nog en gaat gewoon door"
    }</li>
<li>De einddatum voor offline halen is weggehaald; de site is weer een gewone klant.</li>
</ul>`,
  });

  if (abo?.email && door === "klant") {
    await mailVanJos({
      naar: abo.email,
      van: "Jos van WordSwap",
      onderwerp: "Je opzegging is ingetrokken",
      html: `<p>Beste ${ontsnap(abo.naam.split(" ")[0])},</p>
<p>Je hebt je opzegging voor <strong>${ontsnap(site.naam)}</strong> ingetrokken. ${ontsnap(melding)}</p>
<p>Fijn dat je blijft. Heb je ergens hulp bij nodig, laat het me gerust weten.</p>
<p>Met vriendelijke groet,<br>Jos van WordSwap</p>`,
    });
  }

  return { ok: true, melding };
}
