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

/**
 * Een schone bestandsnaam in bestanden/ die nog niet bestaat. Een upload
 * overschrijft nooit stilletjes een bestaand document: dan verandert wat er
 * achter een al verstuurde link staat. Bestaat de naam al, dan -2, -3 enz.
 */
export function vrijPad(naam: string, bestaand: Set<string>): string {
  const schoon =
    (naam.split("/").pop() ?? "document.pdf")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/^-+|-+$/g, "") || "document.pdf";
  const punt = schoon.lastIndexOf(".");
  const stam = (punt > 0 ? schoon.slice(0, punt) : schoon).replace(/-+$/, "") || "document";
  const ext = punt > 0 ? schoon.slice(punt) : "";
  let pad = `bestanden/${stam}${ext}`;
  for (let n = 2; bestaand.has(pad); n++) pad = `bestanden/${stam}-${n}${ext}`;
  return pad;
}
