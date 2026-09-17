import { eq } from "drizzle-orm";
import { db } from "@/db";
import { abonnementen, formulierInzendingen, sites, wpBackups } from "@/db/schema";
import { opleveringsAkkoord } from "@/lib/website-akkoord";

/**
 * Livegang-checklist per klantsite: controleert zichzelf, zodat bij een overstap niets vergeten
 * wordt (klant koppelen, domein invullen, status op Actief, …). Dezelfde checks op de klantpagina
 * en — zonder de trage online-controles — als teller op de klantenlijst.
 */

type Site = typeof sites.$inferSelect;

export type LivegangCheck = {
  sleutel: string;
  label: string;
  ok: boolean;
  uitleg: string;
  /** Iets dat nu al misgaat voor bezoekers (rood i.p.v. oranje) */
  dringend?: boolean;
};

const isWorkersAdres = (d: string | null) => !d || /\.workers\.dev$/i.test(d);

/** Doet deze site mee? Demo's en onze eigen site niet. */
export const heeftLivegang = (site: Site) => !site.isDemo && site.githubRepo !== "wordswap";

/** Custom domains die in Cloudflare aan de live worker van deze site hangen. */
async function gekoppeldeDomeinen(siteSlug: string | null): Promise<string[] | null> {
  if (!siteSlug || !process.env.CLOUDFLARE_API_TOKEN) return null;
  try {
    const { ACCOUNT } = await import("@/lib/cloudflare");
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/domains?service=${encodeURIComponent(siteSlug)}`,
      { headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` }, signal: AbortSignal.timeout(5000) },
    );
    const data = (await res.json()) as { success?: boolean; result?: { hostname: string; service: string }[] };
    if (!data.success) return null;
    return (data.result ?? []).filter((d) => d.service === siteSlug).map((d) => d.hostname.toLowerCase());
  } catch {
    return null;
  }
}

/** Antwoordt het domein met onze site? (de deploy zet in elke pagina het meldscript wp2ai-pagina) */
async function domeinToontNieuweSite(domein: string): Promise<boolean> {
  try {
    const res = await fetch(`https://${domein}/`, { redirect: "follow", signal: AbortSignal.timeout(6000) });
    return res.ok && (await res.text()).includes("wp2ai-pagina");
  } catch {
    return false;
  }
}

export async function livegangChecks(
  site: Site,
  o: { adminId: string; adminEmails: string[]; online: boolean },
): Promise<LivegangCheck[]> {
  const [abonnement] = await db.select().from(abonnementen).where(eq(abonnementen.siteId, site.id)).catch(() => []);
  const akkoord = await opleveringsAkkoord(site.id);
  const backups = await db.select({ id: wpBackups.id }).from(wpBackups).where(eq(wpBackups.siteId, site.id)).catch(() => []);
  const domeinIngevuld = !isWorkersAdres(site.domein);
  // Testbericht: een inzending op deze site waarin een e-mailadres van de beheerder staat
  const eigenAdressen = o.adminEmails.map((e) => e.toLowerCase());
  const testBericht = (
    await db
      .select({ velden: formulierInzendingen.velden, aangemaakt: formulierInzendingen.aangemaakt })
      .from(formulierInzendingen)
      .where(eq(formulierInzendingen.siteRepo, site.githubRepo))
      .catch(() => [])
  )
    .filter((i) => Object.values(i.velden as Record<string, string>).some((v) => eigenAdressen.includes(String(v).trim().toLowerCase())))
    .sort((a, b) => b.aangemaakt.getTime() - a.aangemaakt.getTime())[0];
  const betaald = abonnement?.status === "actief";

  const checks: LivegangCheck[] = [
    {
      sleutel: "klant",
      label: "Klantaccount (e-mail) gekoppeld",
      ok: site.clerkUserId !== o.adminId && !site.uitnodigingEmail,
      uitleg: "Koppel het e-mailadres van de klant bij Klantaccount.",
    },
    {
      sleutel: "akkoord",
      label: "Akkoord op de website",
      ok: Boolean(akkoord) || betaald,
      uitleg: akkoord || !betaald ? "De klant geeft akkoord bij de eerste inlog in het portaal." : "",
    },
    {
      sleutel: "betaald",
      label: "Betaald en incasso actief",
      ok: betaald,
      uitleg:
        abonnement?.status === "wacht_op_eerste"
          ? "Betaallink staat klaar, maar is nog niet betaald."
          : abonnement?.status === "mislukt"
            ? "De laatste betaling is mislukt."
            : "Maak een betaallink bij Automatische incasso.",
    },
    {
      sleutel: "domein",
      label: "Domein ingevuld",
      ok: domeinIngevuld,
      uitleg: "Vul bij Instellingen het eigen domein in (zonder https en zonder www), bijv. roelart.nl.",
    },
  ];

  if (o.online) {
    const gekoppeld = await gekoppeldeDomeinen(site.siteSlug);
    const eigen = (gekoppeld ?? []).filter((h) => !h.startsWith("www."));
    if (!domeinIngevuld && eigen.length > 0) {
      // Het domein wijst al naar de nieuwe site, maar het veld staat nog op workers.dev:
      // dan sturen formulieren bezoekers naar het verkeerde adres
      checks.find((c) => c.sleutel === "domein")!.uitleg = `${eigen[0]} is in Cloudflare al aan deze site gekoppeld. Vul het in bij Domein, anders sturen formulieren bezoekers naar het workers.dev-adres.`;
      checks.find((c) => c.sleutel === "domein")!.dringend = true;
    }
    if (domeinIngevuld && site.domein) {
      const domein = site.domein.replace(/^www\./, "").toLowerCase();
      const inCloudflare = gekoppeld === null ? null : gekoppeld.includes(domein);
      const online = await domeinToontNieuweSite(site.domein);
      checks.push({
        sleutel: "online",
        label: "Domein toont de nieuwe site",
        ok: online,
        uitleg: online
          ? ""
          : inCloudflare === false
            ? `${domein} is nog niet als Custom Domain aan de worker gekoppeld in Cloudflare.`
            : `${domein} toont (nog) niet de nieuwe site. Staan de nameservers al op Cloudflare? Het kan tot een paar uur duren.`,
      });
    }
  }

  checks.push(
    {
      sleutel: "status",
      label: "Status op Actief",
      ok: site.status === "actief",
      uitleg: "Zet de status bij Instellingen op Actief zodra de site op het eigen domein draait.",
    },
    {
      sleutel: "melding",
      label: "Meldingsadres voor formulieren ingesteld",
      ok: Boolean(site.notificatieEmail),
      uitleg: "Zonder meldingsadres komen formulierinzendingen alleen in het portaal, niet in de mail van de klant.",
    },
    {
      sleutel: "testbericht",
      label: "Testbericht via het formulier verstuurd",
      ok: Boolean(testBericht),
      uitleg: `Vul zelf het formulier op ${domeinIngevuld ? site.domein : "de site"} in met je eigen e-mailadres (${o.adminEmails[0] ?? "jouw adres"}) en kijk of de bevestiging en de melding aankomen.`,
    },
    {
      sleutel: "backup",
      label: "WordPress-back-up geüpload",
      ok: backups.length > 0,
      uitleg: "Upload de back-up van de oude WordPress-site (terugweg-garantie) bij WordPress-kopie.",
    },
  );
  return checks;
}
