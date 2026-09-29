/**
 * Hoofdadres van een site: met of zonder www. Standaard zonder. Een site die
 * met www in Google staat houdt www, zodat er bij de overstap niets verhuist
 * (besloten 29-09-2026, aanleiding joostmarchal.nl).
 *
 * Het veld `domein` blijft ALTIJD het kale domein; de keuze staat los in
 * `hoofdadresWww`. Zo gooit een per ongeluk meegeplakte "www" nooit een
 * site om.
 */
export type MetHoofdadres = { domein?: string | null; hoofdadresWww?: boolean | null };

const schoon = (d: string) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "").replace(/^www\./, "");

/** Het kale domein, of null zolang de site op workers.dev draait. */
export function kaalDomein(site: MetHoofdadres): string | null {
  const d = schoon(site.domein ?? "");
  if (!d || !d.includes(".") || /\.workers\.dev$/.test(d)) return null;
  return d;
}

/** Het adres waarop de site zich toont (en dat in canonical en sitemap staat). */
export function publiekAdres(site: MetHoofdadres): string | null {
  const d = kaalDomein(site);
  if (!d) return null;
  return site.hoofdadresWww ? `www.${d}` : d;
}

/** Het andere adres: dat stuurt met een 301 door naar het hoofdadres. */
export function doorstuurAdres(site: MetHoofdadres): string | null {
  const d = kaalDomein(site);
  if (!d) return null;
  return site.hoofdadresWww ? d : `www.${d}`;
}

export const hoofdBinding = (site: MetHoofdadres): "www" | "kaal" => (site.hoofdadresWww && kaalDomein(site) ? "www" : "kaal");
