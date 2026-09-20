"use client";

import { useActionState } from "react";
import { conceptMetAi } from "../acties-leads";

/** De AI de leadmail laten (her)schrijven, met een eigen aanwijzing van Jos.
 * De AI krijgt de volledige context mee: gegevens, oordeel, website-inhoud,
 * mail-tijdlijn en de huidige concepttekst. */
export default function AiMailVak({ leadId, heeftConcept }: { leadId: number; heeftConcept: boolean }) {
  const [stand, actie, bezig] = useActionState(conceptMetAi, null);

  return (
    <form action={actie} className="mt-2">
      <input type="hidden" name="id" value={leadId} />
      <div className="flex flex-wrap items-start gap-2">
        <textarea
          name="instructie"
          rows={1}
          placeholder={heeftConcept ? 'Wat moet er anders? Bijv. "korter, en noem de zaaikalender"' : "Aanwijzing voor de AI (mag leeg blijven)"}
          className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm focus:border-violet-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={bezig}
          className="rounded-full border border-violet-300 bg-white px-4 py-1.5 text-sm font-semibold text-violet-800 hover:bg-violet-50 disabled:opacity-60 cursor-pointer"
        >
          {bezig ? "AI schrijft..." : heeftConcept ? "🪄 Met AI aanpassen" : "🪄 Mail klaarzetten met AI"}
        </button>
      </div>
      {stand && (
        <p className={`mt-1.5 text-sm font-medium ${stand.gelukt ? "text-emerald-700" : "text-red-600"}`}>{stand.melding}</p>
      )}
    </form>
  );
}
