/** AI-verbruik deze maand: wat ze mogen, wat ze gebruikten, het percentage en
 * een balkje. Zelfde maat als de klant ziet (lib/verbruik); het oude
 * "0/30 wijzigingen" zei niets meer, want het budget is wat er begrenst.
 * Gedeeld door de klantenlijst (smal) en de klantpagina (breed). */

export const dollar = (v: number) => `$${v.toFixed(2).replace(".", ",")}`;

export function VerbruikBalk({ gebruikt, budget, breed = false }: { gebruikt: number; budget: number; breed?: boolean }) {
  if (!(budget > 0)) return null;
  const procent = Math.min(100, Math.round((gebruikt / budget) * 100));
  const kleur = procent >= 100 ? "bg-red-500" : procent >= 70 ? "bg-amber-500" : "bg-emerald-500";
  const balk = (
    <div
      className={`${breed ? "h-2.5 w-full" : "h-1.5 w-24 shrink-0"} overflow-hidden rounded-full bg-stone-200`}
      role="progressbar"
      aria-valuenow={procent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="AI-verbruik deze maand"
    >
      <div className={`h-full rounded-full ${kleur}`} style={{ width: `${Math.max(procent, gebruikt > 0 ? 3 : 0)}%` }} />
    </div>
  );
  if (breed)
    return (
      <div className="mt-2">
        <p className="font-display text-3xl font-semibold tabular-nums">
          {procent}%<span className="ml-2 text-base font-normal text-stone-500">{dollar(gebruikt)} van {dollar(budget)}</span>
        </p>
        <div className="mt-2">{balk}</div>
      </div>
    );
  return (
    <div className="mt-1 flex items-center gap-2" title={`AI deze maand: ${dollar(gebruikt)} van ${dollar(budget)}`}>
      {balk}
      <span className="text-[11px] tabular-nums text-stone-500">
        {procent}%<span className="hidden sm:inline"> · {dollar(gebruikt)} van {dollar(budget)}</span>
      </span>
    </div>
  );
}
