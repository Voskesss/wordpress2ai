"use client";

import { useState, useTransition } from "react";
import { leadsNuBijwerken } from "../acties-leads";

/** Draait dezelfde ronde als de cron en laat zien wat er gebeurde:
 * Meta-leads binnenhalen, Soverin-post ophalen, concepten klaarzetten. */
export default function BijwerkKnop() {
  const [bezig, start] = useTransition();
  const [uitkomst, setUitkomst] = useState<{ verslag: string[]; op: string } | null>(null);
  const [fout, setFout] = useState(false);

  function draai() {
    setFout(false);
    start(async () => {
      try {
        setUitkomst(await leadsNuBijwerken());
      } catch {
        setFout(true);
      }
    });
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={draai}
        disabled={bezig}
        className="rounded-full border border-violet-300 bg-violet-50 px-5 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-100 disabled:opacity-60 cursor-pointer"
      >
        {bezig ? "Bezig met ophalen..." : "🔄 Nu bijwerken (Meta + postvak)"}
      </button>
      {fout && <p className="mt-2 text-sm font-medium text-red-600">Het bijwerken mislukte — probeer het zo nog eens.</p>}
      {uitkomst && (
        <div className="mt-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Bijgewerkt om {uitkomst.op}</p>
          <ul className="mt-1 list-disc pl-5 space-y-0.5">
            {uitkomst.verslag.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
