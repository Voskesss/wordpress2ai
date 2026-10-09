/** Verplicht vinkje: akkoord met de algemene voorwaarden en de
 * verwerkersovereenkomst. Zonder vinkje gaat het formulier niet weg. */
export default function VoorwaardenVinkje({ klein = false }: { klein?: boolean }) {
  return (
    <label className={`flex items-start gap-2 text-left ${klein ? "text-xs" : "text-sm"} leading-relaxed text-stone-700`}>
      <input type="checkbox" name="voorwaarden" required className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-700" />
      <span>
        Ik ga akkoord met de{" "}
        <a href="/voorwaarden" target="_blank" rel="noopener" className="font-semibold text-emerald-800 underline underline-offset-2">
          algemene voorwaarden
        </a>{" "}
        en de{" "}
        <a href="/verwerkersovereenkomst" target="_blank" rel="noopener" className="font-semibold text-emerald-800 underline underline-offset-2">
          verwerkersovereenkomst
        </a>
        .
      </span>
    </label>
  );
}
