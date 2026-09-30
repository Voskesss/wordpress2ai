/**
 * Formulierberichten in portaal en admin: samenvatten, filteren en tellen.
 * Zuivere functies zodat de lijst (client) en de tests dezelfde logica delen.
 */

export type InzendingRij = {
  id: number;
  formulier: string;
  velden: Record<string, string>;
  bijlagen: { naam: string; bytes?: number }[];
  /** ISO-tijd, want een Date overleeft de sprong naar de client niet als Date. */
  aangemaakt: string;
  gearchiveerd: boolean;
};

const NAAMVELDEN = ["naam", "name", "voornaam", "achternaam", "bedrijf", "organisatie"];
const MAILVELDEN = ["email", "e-mail", "emailadres", "e-mailadres", "mail"];
const KERNVELDEN = ["bericht", "message", "vraag", "opmerking", "opmerkingen", "toelichting", "omschrijving", "onderwerp", "wens", "wensen"];

const sleutel = (k: string) => k.toLowerCase().replace(/[\s_-]+/g, "");
const zoekVeld = (velden: Record<string, string>, kandidaten: string[]) => {
  const genorm = kandidaten.map(sleutel);
  for (const [k, v] of Object.entries(velden)) {
    if (!String(v ?? "").trim()) continue;
    if (genorm.includes(sleutel(k))) return String(v).trim();
  }
  return "";
};

/** Wie stuurde het: naam en/of e-mail, anders het eerste korte veld. */
export function afzenderVan(velden: Record<string, string>): string {
  const naam = zoekVeld(velden, NAAMVELDEN);
  const mail = zoekVeld(velden, MAILVELDEN);
  if (naam && mail) return `${naam} <${mail}>`;
  if (naam || mail) return naam || mail;
  const eerste = Object.values(velden).map((v) => String(v ?? "").trim()).find((v) => v && v.length <= 60);
  return eerste ?? "";
}

/** De kern van het bericht: het berichtveld, anders het langste veld. */
export function kernVan(velden: Record<string, string>, maxLengte = 140): string {
  let kern = zoekVeld(velden, KERNVELDEN);
  if (!kern) {
    const afzender = afzenderVan(velden);
    kern =
      Object.values(velden)
        .map((v) => String(v ?? "").trim())
        .filter((v) => v && !afzender.includes(v))
        .sort((a, b) => b.length - a.length)[0] ?? "";
  }
  kern = kern.replace(/\s+/g, " ");
  return kern.length > maxLengte ? kern.slice(0, maxLengte - 1).trimEnd() + "…" : kern;
}

/** Filter op formulier en op vrije zoektekst (over alle velden en de afzender). */
export function filterInzendingen<T extends Pick<InzendingRij, "formulier" | "velden">>(
  rijen: T[],
  f: { formulier?: string | null; zoek?: string | null },
): T[] {
  const zoek = (f.zoek ?? "").trim().toLowerCase();
  return rijen.filter((r) => {
    if (f.formulier && r.formulier !== f.formulier) return false;
    if (!zoek) return true;
    const hooi = [r.formulier, ...Object.entries(r.velden).flatMap(([k, v]) => [k, String(v ?? "")])].join(" ").toLowerCase();
    return hooi.includes(zoek);
  });
}

/** Aantal per formulier, gesorteerd op aantal (meeste eerst). */
export function tellingPerFormulier(rijen: Pick<InzendingRij, "formulier">[]): [string, number][] {
  const t = new Map<string, number>();
  for (const r of rijen) t.set(r.formulier, (t.get(r.formulier) ?? 0) + 1);
  return [...t.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
