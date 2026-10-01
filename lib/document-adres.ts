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
 * Een bestandsnaam die nog niet bestaat. Een upload overschrijft nooit
 * stilletjes een bestaand bestand: dan verandert wat er achter een al
 * verstuurde link staat. Bestaat de naam al, dan -2, -3 enzovoort.
 * `bestaand` bevat volledige paden (map/naam) of kale namen, afhankelijk van
 * wat `opbouw` maakt.
 */
export function vrijeNaam(stam: string, ext: string, bestaand: Set<string>, opbouw: (naam: string) => string = (n) => n): string {
  let naam = `${stam}${ext}`;
  for (let n = 2; bestaand.has(opbouw(naam)); n++) naam = `${stam}-${n}${ext}`;
  return naam;
}

/** Schone stam en extensie uit een geüploade bestandsnaam. */
export function schoneNaamDelen(naam: string, standaard = "document"): { stam: string; ext: string } {
  const schoon = (naam.split("/").pop() ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const punt = schoon.lastIndexOf(".");
  const stam = (punt > 0 ? schoon.slice(0, punt) : schoon).replace(/\./g, "-").replace(/-+$/, "").slice(0, 80) || standaard;
  const ext = punt > 0 ? schoon.slice(punt) : "";
  return { stam, ext };
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
