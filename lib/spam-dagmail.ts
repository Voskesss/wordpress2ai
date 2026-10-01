import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { formulierInzendingen, sites } from "@/db/schema";
import { afzenderVan } from "@/lib/inzendingen";
import { verstuurSiteMail } from "@/lib/mail";

const ontsnap = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Dagoverzicht van zekere spam. Zeker-spam blijft op het moment zelf stil
 * (geen melding, geen bevestiging), maar de eigenaar moet wel kúnnen zien
 * dat er iets is tegengehouden: één korte mail per dag, alleen op dagen dat
 * er echt iets apart is gezet. Draait mee met de dagelijkse gezondheids-cron.
 *
 * Dubbel melden kan niet: elke gemelde inzending krijgt een tijdstempel
 * (spam_gemeld_op) en telt daarna nooit meer mee. Berichten die de eigenaar
 * intussen al terugzette met "Geen spam" (spam = false) vallen er vanzelf
 * buiten.
 */
export async function verstuurSpamDagmails(): Promise<{
  mails: number;
  berichten: number;
}> {
  const nieuw = await db
    .select()
    .from(formulierInzendingen)
    .where(
      and(
        eq(formulierInzendingen.spam, true),
        eq(formulierInzendingen.spamStand, "zeker"),
        isNull(formulierInzendingen.spamGemeldOp),
      ),
    );
  if (nieuw.length === 0) return { mails: 0, berichten: 0 };

  const perSite = new Map<string, typeof nieuw>();
  for (const r of nieuw) {
    perSite.set(r.siteRepo, [...(perSite.get(r.siteRepo) ?? []), r]);
  }

  let mails = 0;
  let gemeld = 0;
  for (const [repo, rijen] of perSite) {
    const [site] = await db
      .select()
      .from(sites)
      .where(eq(sites.githubRepo, repo));
    // Zonder eigenaar-adres niets te melden; de stempel blijft dan leeg zodat
    // het overzicht alsnog komt zodra er een meldadres is ingesteld.
    if (!site?.notificatieEmail) continue;

    const regels = rijen
      .map((r) => {
        const afzender =
          afzenderVan((r.velden ?? {}) as Record<string, string>) ||
          "onbekende afzender";
        return `<li>${ontsnap(afzender)}: ${ontsnap(r.spamReden ?? "massaspam")}</li>`;
      })
      .join("");
    const n = rijen.length;
    const weg = await verstuurSiteMail({
      site,
      naar: site.notificatieEmail,
      onderwerp: `${n === 1 ? "1 bericht" : `${n} berichten`} als spam apart gezet op ${site.naam}`,
      html: `<p>Vandaag ${n === 1 ? "is er 1 bericht" : `zijn er ${n} berichten`} op ${ontsnap(site.naam)} automatisch als spam apart gezet. Je kreeg er geen losse melding van en de afzender kreeg geen bevestiging.</p><ul>${regels}</ul><p>Toch een echt bericht ertussen? Open het tabblad Spam bij <a href="https://wordswap.nl/portal">je berichten in het portaal</a> en klik op "Geen spam", dan staat het weer bij je open berichten.</p>`,
    });
    if (!weg) continue; // mail mislukt: stempel leeg laten, morgen opnieuw

    mails++;
    gemeld += n;
    for (const r of rijen) {
      await db
        .update(formulierInzendingen)
        .set({ spamGemeldOp: new Date() })
        .where(eq(formulierInzendingen.id, r.id));
    }
  }
  return { mails, berichten: gemeld };
}
