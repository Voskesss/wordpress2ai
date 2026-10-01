import { publiekAdres, type MetHoofdadres } from "./hoofdadres";

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

/** Werkt het adres echt (200)? Kort wachten: de bank moet snel openen. */
export async function staatLive(adres: string, ms = 4000): Promise<boolean> {
  try {
    const r = await fetch(adres, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(ms), cache: "no-store" });
    return r.ok;
  } catch {
    return false;
  }
}
