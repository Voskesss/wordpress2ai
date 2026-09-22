"use client";

import { useActionState } from "react";
import { leadWordtKlant, type KlantUitkomst } from "../acties-leads";

/**
 * Lead wordt klant: maakt de klantrij aan en koppelt hem aan deze lead. De
 * repo-naam mag je aanpassen, want die bepaalt de omgeving (wv-<naam>) en is
 * later niet zomaar te wijzigen.
 *
 * De kennismakingsafspraak blijft aan de lead hangen; hij blijft zichtbaar in
 * het agenda-overzicht en in deze tijdlijn.
 */
export default function KlantKnop({ leadId, naam, voorstel }: { leadId: number; naam: string; voorstel: string }) {
  const [stand, verstuur, bezig] = useActionState<KlantUitkomst | null, FormData>(leadWordtKlant, null);

  if (stand?.ok) {
    return (
      <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
        ✓ {stand.melding}{" "}
        <a href={`/admin/klant/${stand.siteId}`} className="font-semibold underline">
          Naar de klantpagina
        </a>
      </p>
    );
  }

  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-sm font-semibold text-emerald-700">🎉 {naam} wordt klant</summary>
      <form action={verstuur} className="mt-2 flex flex-wrap items-end gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
        <input type="hidden" name="leadId" value={leadId} />
        <label className="block text-xs font-semibold text-stone-700">
          Repo-naam <span className="font-normal text-stone-500">(bepaalt de omgeving)</span>
          <input
            name="repo"
            defaultValue={voorstel}
            className="mt-1 w-56 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-normal focus:border-emerald-500 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={bezig}
          className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60 cursor-pointer"
        >
          {bezig ? "Aanmaken..." : "Klant aanmaken"}
        </button>
        {stand && !stand.ok && <span className="text-xs font-medium text-red-700">{stand.melding}</span>}
      </form>
      <p className="mt-1 text-xs text-stone-500">
        Hiermee komt hij in de klantenlijst te staan, met zijn e-mailadres als uitnodigingsadres. De lead blijft
        bestaan, met zijn tijdlijn en de kennismaking erin.
      </p>
    </details>
  );
}
