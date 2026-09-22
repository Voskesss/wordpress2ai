export const LEAD_STATUSSEN = [
  { waarde: "nieuw", label: "Nieuw", open: true, kleur: "border-violet-200 bg-violet-50 text-violet-800" },
  { waarde: "wacht_op_reactie", label: "Wacht op reactie", open: true, kleur: "border-amber-200 bg-amber-50 text-amber-800" },
  { waarde: "in_gesprek", label: "In gesprek", open: true, kleur: "border-sky-200 bg-sky-50 text-sky-800" },
  // Er staat een gesprek gepland. Eigen, opvallende kleur: dit is de enige
  // status waar een datum aan hangt die Jos niet mag missen, en tussen alle
  // blauw en groen viel hij anders weg.
  { waarde: "afspraak", label: "Afspraak gepland", open: true, kleur: "border-orange-300 bg-orange-100 text-orange-900" },
  { waarde: "kopie_maken", label: "Kopie maken", open: true, kleur: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  { waarde: "kopie_klaar", label: "Kopie klaar, wacht op akkoord", open: true, kleur: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  { waarde: "klant", label: "Klant geworden", open: false, kleur: "border-emerald-300 bg-emerald-100 text-emerald-900" },
  { waarde: "geen_match", label: "Geen match", open: false, kleur: "border-stone-200 bg-stone-100 text-stone-600" },
  { waarde: "afgehaakt", label: "Afgehaakt", open: false, kleur: "border-stone-200 bg-stone-100 text-stone-600" },
] as const;

/**
 * Welke statussen meeschuiven met de agenda. Wie al klant is, geen match of
 * afgehaakt, blijft staan waar hij staat: die heeft Jos bewust zo gezet.
 */
const MEESCHUIVEND = ["nieuw", "wacht_op_reactie", "in_gesprek", "afspraak"];

/**
 * De status die bij de agenda hoort, of null als er niets hoeft te veranderen.
 * Staat er een bevestigde afspraak in de toekomst, dan "afspraak"; is die
 * afgezegd, dan terug naar "in_gesprek", maar alleen vanuit "afspraak" zelf,
 * zodat een afzegging nooit een status overschrijft die Jos met de hand koos.
 */
export function statusBijAfspraak(huidig: string, heeftKomendeAfspraak: boolean): string | null {
  if (!MEESCHUIVEND.includes(huidig)) return null;
  const hoort = heeftKomendeAfspraak ? "afspraak" : huidig === "afspraak" ? "in_gesprek" : huidig;
  return hoort === huidig ? null : hoort;
}

export function statusInfo(waarde: string) {
  return LEAD_STATUSSEN.find((s) => s.waarde === waarde) ?? LEAD_STATUSSEN[0];
}

export function vandaag(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}
