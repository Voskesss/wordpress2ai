import { publiekAdres, type MetHoofdadres } from "./hoofdadres";
import { schoneNaamDelen, vrijeNaam } from "./bestandsnaam";
export { schoneNaamDelen, vrijeNaam } from "./bestandsnaam";

/**
 * Het vaste webadres van een document op de site, om te kopiëren naar een
 * nieuwsbrief of mail (Dirk-Jan verstuurt pdf's via Mailblue, 01-10-2026).
 * Altijd het hoofdadres van de klant, nooit het tijdelijke workers.dev-adres:
 * dat verandert bij de verhuizing naar het eigen domein en dan breken de links
 * in al verstuurde mails. Zonder eigen domein dus geen adres.
 */
export function documentAdres(site: MetHoofdadres, pad: string): string | null {
  const host = publiekAdres(site);
  if (!host || /\.workers\.dev$/i.test(host)) return null;
  const schoon = pad.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/");
  return `https://${host}/${schoon}`;
}

/** Zonder eigen domein geen link (het tijdelijke adres verandert bij de
 * verhuizing en dan breken links in verstuurde mails). Dan wel uitleggen
 * waarom de knop er niet is, anders lijkt hij kwijt (Jos, 02-10-2026). */
export const GEEN_DOMEIN_UITLEG = "Link kopiëren kan zodra je website op zijn eigen domein staat.";
export function linkUitleg(site: MetHoofdadres & { isDemo?: boolean | null }): string | null {
  if (site.isDemo) return null;
  return documentAdres(site, "x") ? null : GEEN_DOMEIN_UITLEG;
}

/** Werkt het adres echt (200)? Kort wachten: de bank moet snel openen. */
export async function staatLive(adres: string, ms = 4000): Promise<boolean> {
  try {
    const r = await fetch(adres, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(ms), cache: "no-store" });
    return r.ok;
  } catch {
    return false;
  }
}

/** Vrij pad voor een document in bestanden/ (zie vrijeNaam). */
export function vrijPad(naam: string, bestaand: Set<string>, map = "bestanden"): string {
  const { stam, ext } = schoneNaamDelen(naam);
  return `${map}/${vrijeNaam(stam, ext || ".pdf", bestaand, (n) => `${map}/${n}`)}`;
}

/** Welke paden van deze site nu echt in de live opslag staan (één lijst-
 * opvraging, ook bij honderden foto's). Paden zonder de slug ervoor. */
export async function livePaden(slug: string | null | undefined): Promise<Set<string>> {
  if (!slug) return new Set();
  try {
    const { lijstSleutels } = await import("./r2");
    return new Set((await lijstSleutels(`${slug}/`)).map((k) => k.slice(slug.length + 1)));
  } catch {
    return new Set();
  }
}
