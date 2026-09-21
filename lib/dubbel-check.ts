/**
 * Kennen we dit bedrijf al? Over de outreach én de leads heen.
 *
 * Waarom dit één plek is: er zijn nu twee lijsten. De outreach is koud en
 * massaal (de scan levert er honderden), leads zijn de mensen die reageerden.
 * Zonder een gedeelde controle mail je iemand die vorige maand al nee zei, of
 * krijgt Aad een koude scanmail terwijl er een gesprek loopt. Dat kost meteen
 * je geloofwaardigheid, en je hoort het niet terug: mensen klagen daar niet
 * over, ze reageren gewoon nooit meer.
 *
 * Drie sleutels, want één is te weinig. Hetzelfde bedrijf kan onder een ander
 * mailadres binnenkomen (info@ tegenover contact@), en dezelfde eigenaar kan
 * twee websites hebben met hetzelfde telefoonnummer.
 */

export type Kandidaat = {
  website?: string | null;
  email?: string | null;
  telefoon?: string | null;
  bedrijf?: string | null;
};

/** "https://WWW.Bedrijf.NL/contact" en "bedrijf.nl" zijn hetzelfde domein. */
export function schoonDomein(ruw: string | null | undefined): string {
  if (!ruw) return "";
  return ruw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "")
    .replace(/\.$/, "");
}

/**
 * "06 45 68 65 33", "+31 6 45686533" en "0645686533" zijn hetzelfde nummer.
 * We vergelijken op de laatste negen cijfers: dat is het Nederlandse nummer
 * zonder land- of nulprefix, en daarmee vallen alle schrijfwijzen samen.
 */
export function schoonNummer(ruw: string | null | undefined): string {
  if (!ruw) return "";
  const cijfers = ruw.replace(/\D/g, "");
  if (cijfers.length < 9) return "";
  return cijfers.slice(-9);
}

export function schoonEmail(ruw: string | null | undefined): string {
  return (ruw ?? "").trim().toLowerCase();
}

/** Alles waarop we een bestaand contact herkennen. */
export type Register = {
  domeinen: Set<string>;
  adressen: Set<string>;
  nummers: Set<string>;
};

export function maakRegister(rijen: Kandidaat[]): Register {
  const r: Register = { domeinen: new Set(), adressen: new Set(), nummers: new Set() };
  for (const rij of rijen) {
    const d = schoonDomein(rij.website);
    const e = schoonEmail(rij.email);
    const t = schoonNummer(rij.telefoon);
    if (d) r.domeinen.add(d);
    if (e) r.adressen.add(e);
    if (t) r.nummers.add(t);
  }
  return r;
}

export type Dubbel = { dubbel: true; reden: "website" | "e-mailadres" | "telefoonnummer" } | { dubbel: false };

/** Kennen we deze al? Zo ja, waaraan we hem herkenden (voor de melding). */
export function isDubbel(kandidaat: Kandidaat, register: Register): Dubbel {
  const d = schoonDomein(kandidaat.website);
  if (d && register.domeinen.has(d)) return { dubbel: true, reden: "website" };
  const e = schoonEmail(kandidaat.email);
  if (e && register.adressen.has(e)) return { dubbel: true, reden: "e-mailadres" };
  const t = schoonNummer(kandidaat.telefoon);
  if (t && register.nummers.has(t)) return { dubbel: true, reden: "telefoonnummer" };
  return { dubbel: false };
}

/** Een net opgevoerd contact meteen meetellen, zodat één ronde zichzelf niet dubbelt. */
export function onthoud(kandidaat: Kandidaat, register: Register): void {
  const d = schoonDomein(kandidaat.website);
  const e = schoonEmail(kandidaat.email);
  const t = schoonNummer(kandidaat.telefoon);
  if (d) register.domeinen.add(d);
  if (e) register.adressen.add(e);
  if (t) register.nummers.add(t);
}
