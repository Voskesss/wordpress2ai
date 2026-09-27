import { eq } from "drizzle-orm";
import { promises as dns } from "node:dns";
import { DKIM_SELECTORS, mailBevindingen, type MailFeiten } from "@/lib/mail-controle";
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

/** URL's die in UptimeRobot bewaakt worden. Alleen-lezen API-aanroep, met een
 * korte cache: het gratis plan staat maar 10 verzoeken per minuut toe en de
 * adminlijst berekent de checklist voor meerdere sites tegelijk. */
let monitorCache: { tijdstip: number; urls: string[] } | null = null;
async function bewaakteUrls(): Promise<string[] | null> {
  const sleutel = process.env.UPTIMEROBOT_API_KEY;
  if (!sleutel) return null;
  if (monitorCache && Date.now() - monitorCache.tijdstip < 5 * 60_000) return monitorCache.urls;
  try {
    const res = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ api_key: sleutel, format: "json" }),
      signal: AbortSignal.timeout(6000),
    });
    const data = (await res.json()) as { stat?: string; monitors?: { url: string }[] };
    if (data.stat !== "ok") return monitorCache?.urls ?? null;
    monitorCache = { tijdstip: Date.now(), urls: (data.monitors ?? []).map((m) => m.url.toLowerCase()) };
    return monitorCache.urls;
  } catch {
    return monitorCache?.urls ?? null;
  }
}

export type HostMeting = { status: number; location: string | null };

/** Kloppen www, doorverwijzing en canonical met elkaar? Eén variant hoort de
 * site te tonen, de ander hoort er met een 301 naartoe te sturen, en de
 * canonical hoort naar de tonende variant te wijzen. Staat dit scheef, dan
 * verdeelt Google de posities over twee adressen (les Van den Berg-controle
 * 27-09: daar stond het gelukkig al goed). */
export function beoordeelWwwEnCanonical(
  domein: string,
  kaal: HostMeting | null,
  www: HostMeting | null,
  canonical: string | null,
  sitemapVoorbeeld: string | null,
): { ok: boolean; uitleg: string } {
  const doel = domein.replace(/^www\./, "").toLowerCase();
  const problemen: string[] = [];
  if (!kaal || kaal.status < 200 || kaal.status >= 400) problemen.push(`https://${doel} antwoordt niet goed`);
  else if (kaal.status >= 300) problemen.push(`https://${doel} verwijst door (${kaal.status}) in plaats van de site te tonen`);
  if (!www || www.status < 200 || www.status >= 400) problemen.push(`https://www.${doel} antwoordt niet`);
  else if (www.status < 300) problemen.push(`www toont de site ook zelf (hoort met 301 naar ${doel} te sturen, anders staat de site dubbel in Google)`);
  else if (!(www.location ?? "").includes(`://${doel}`)) problemen.push(`www verwijst door naar ${www.location ?? "onbekend"} in plaats van naar https://${doel}`);
  if (!canonical) problemen.push("de homepage heeft geen canonical");
  else {
    try {
      const c = new URL(canonical);
      if (c.protocol !== "https:") problemen.push("de canonical is geen https");
      if (c.hostname.toLowerCase() !== doel) problemen.push(`de canonical wijst naar ${c.hostname} in plaats van ${doel}`);
    } catch {
      problemen.push(`de canonical is geen geldig adres (${canonical})`);
    }
  }
  if (sitemapVoorbeeld) {
    try {
      const s = new URL(sitemapVoorbeeld);
      if (s.hostname.toLowerCase() !== doel) problemen.push(`de sitemap gebruikt ${s.hostname} in plaats van ${doel}`);
    } catch {
      /* geen geldig sitemap-adres: laat de sitemap-controle elders het zeggen */
    }
  }
  return problemen.length === 0
    ? { ok: true, uitleg: "" }
    : { ok: false, uitleg: `${problemen.join("; ")}.` };
}

/** Homepage ophalen; null als het domein niet (goed) antwoordt. */
async function haalHomepage(domein: string): Promise<string | null> {
  try {
    const res = await fetch(`https://${domein}/`, { redirect: "follow", signal: AbortSignal.timeout(6000) });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

/** Google-verificatie zichtbaar? Als TXT-record op het domein of als meta-tag
 * op de homepage. Verificatie kan óók via een geüpload bestand of Analytics;
 * die zien we hier niet, dus afwezigheid is een waarschuwing, geen fout. */
export function heeftGoogleVerificatie(txt: string[], html: string | null): boolean {
  if (txt.some((r) => r.includes("google-site-verification="))) return true;
  return Boolean(html && /<meta[^>]+name=["']google-site-verification["']/i.test(html));
}

/**
 * De mailgegevens van een domein ophalen. Alles apart afgevangen: één
 * ontbrekend record mag de hele checklist niet omver halen.
 *
 * DKIM is niet op te vragen zonder de naam te kennen, dus we proberen de
 * gebruikelijke namen. Niets gevonden betekent niet dat er niets is; dat staat
 * ook zo in de uitleg bij die regel.
 */
async function mailFeiten(domein: string): Promise<MailFeiten> {
  const mxRuw = await dns.resolveMx(domein).catch(() => []);
  const mx = mxRuw.sort((a, b) => a.priority - b.priority).map((r) => r.exchange.toLowerCase().replace(/\.$/, ""));
  const [txt, dmarc] = await Promise.all([
    dns.resolveTxt(domein).catch(() => [] as string[][]),
    dns.resolveTxt(`_dmarc.${domein}`).catch(() => [] as string[][]),
  ]);
  const mxBereikbaar = mx[0] ? await dns.resolve4(mx[0]).then((a) => a.length > 0).catch(() => false) : null;
  const gevonden = await Promise.all(
    DKIM_SELECTORS.map((sel) =>
      dns
        .resolveTxt(`${sel}._domainkey.${domein}`)
        .then((r) => (r.length ? sel : null))
        .catch(() => null)
    )
  );
  return {
    mx,
    mxBereikbaar,
    txt: txt.map((r) => r.join("")),
    dmarc: dmarc.map((r) => r.join("")),
    dkimSelectors: gevonden.filter((x) => x !== null).map(String),
  };
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
  // Eigen adressen van de beheerder plus de vaste WordSwap-adressen (testen gaat vaak vanaf jos@wordswap.nl)
  const eigenAdressen = [...o.adminEmails, "jos@wordswap.nl", "info@wordswap.nl"].map((e) => e.toLowerCase());
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
      // Bewaking: er hoort een UptimeRobot-monitor op het ECHTE domein te staan
      // (niet op workers.dev) — vooral belangrijk zodra de site live is
      const bewaakt = await bewaakteUrls();
      const domeinSchoon = site.domein.replace(/^www\./, "").toLowerCase();
      const monitorOk =
        bewaakt === null ? false : bewaakt.some((u) => u.includes(domeinSchoon));
      checks.push({
        sleutel: "monitor",
        label: "Bewaking op het echte domein",
        ok: monitorOk,
        uitleg: monitorOk
          ? ""
          : bewaakt === null
            ? "Kon UptimeRobot niet raadplegen (sleutel of storing). Controleer zelf of er een monitor op dit domein staat."
            : `Maak in UptimeRobot een monitor aan voor https://${site.domein} — het echte domein, niet het workers.dev-adres.`,
      });
      const domein = site.domein.replace(/^www\./, "").toLowerCase();
      const inCloudflare = gekoppeld === null ? null : gekoppeld.includes(domein);
      const homepage = await haalHomepage(site.domein);
      const online = Boolean(homepage?.includes("wp2ai-pagina"));
      // Zoekconsole: zonder aanmelding kan een VERS domein maandenlang
      // onvindbaar blijven terwijl de techniek perfect is (les RoelArt 27-09).
      const domeinTxt = await dns.resolveTxt(domein).then((r) => r.map((x) => x.join(""))).catch(() => [] as string[]);
      const verificatie = heeftGoogleVerificatie(domeinTxt, homepage);
      checks.push({
        sleutel: "zoekconsole",
        label: "Google Search Console (verificatie op het domein)",
        ok: verificatie,
        uitleg: verificatie
          ? ""
          : "Geen Google-verificatie gevonden (TXT-record of meta-tag). Meld het domein aan in Search Console en dien de sitemap in; zeker een nieuw domein blijft anders maandenlang onvindbaar. Let op: is de site al via een bestand of Analytics geverifieerd (door de klant zelf bijvoorbeeld), dan zien wij dat niet en mag je dit negeren.",
      });
      const meet = async (adres: string): Promise<HostMeting | null> => {
        try {
          const res = await fetch(adres, { redirect: "manual", signal: AbortSignal.timeout(6000) });
          return { status: res.status, location: res.headers.get("location") };
        } catch {
          return null;
        }
      };
      const [kaalM, wwwM] = await Promise.all([meet(`https://${domein}/`), meet(`https://www.${domein}/`)]);
      const canonical = homepage?.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] ?? homepage?.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i)?.[1] ?? null;
      const sitemapVoorbeeld = await fetch(`https://${domein}/sitemap.xml`, { signal: AbortSignal.timeout(6000) })
        .then(async (r) => (r.ok ? ((await r.text()).match(/<loc>([^<]+)<\/loc>/)?.[1] ?? null) : null))
        .catch(() => null);
      const canoniek = beoordeelWwwEnCanonical(domein, kaalM, wwwM, canonical, sitemapVoorbeeld);
      checks.push({
        sleutel: "canoniek",
        label: "Eén adres voor Google (www, doorverwijzing en canonical)",
        ok: canoniek.ok,
        uitleg: canoniek.uitleg,
      });
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

  // E-mail apart, want dat is het enige onderdeel waar een fout niet aan de
  // site te zien is: de website draait perfect terwijl de post stilstaat.
  if (domeinIngevuld && site.domein) {
    try {
      for (const b of mailBevindingen(await mailFeiten(site.domein.replace(/^www\./, "")))) checks.push(b);
    } catch {
      checks.push({
        sleutel: "mail-opvragen",
        label: "E-mailgegevens opgehaald",
        ok: false,
        uitleg: "De mailgegevens van dit domein konden niet opgevraagd worden. Controleer ze met: npx tsx scripts/mail-check.mts " + site.domein,
      });
    }
  }

  return checks;
}
