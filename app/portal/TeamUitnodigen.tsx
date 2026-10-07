"use client";

import { useActionState } from "react";
import { teamUitnodigen, type TeamUitslag } from "./acties-team";

/** Formulier om iemand aan het team toe te voegen, met de twee rechten erbij. */
export default function TeamUitnodigen({ siteId, vol }: { siteId: number; vol: boolean }) {
  const [uitslag, actie, bezig] = useActionState<TeamUitslag | null, FormData>(teamUitnodigen, null);
  const veld = "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm font-normal focus:border-violet-600 focus:outline-none";
  return (
    <form action={actie} className="mt-4 grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:grid-cols-2">
      <input type="hidden" name="siteId" value={siteId} />
      <p className="font-semibold text-stone-800 sm:col-span-2">Iemand toevoegen</p>
      <label className="block text-sm font-semibold text-stone-700">
        Naam
        <input name="naam" required maxLength={80} disabled={vol} className={veld} placeholder="Lisa de Vries" />
      </label>
      <label className="block text-sm font-semibold text-stone-700">
        E-mailadres
        <input name="email" type="email" required disabled={vol} className={veld} placeholder="lisa@bedrijf.nl" />
      </label>
      <label className="flex items-start gap-2 text-sm text-stone-700">
        <input type="checkbox" name="magPubliceren" disabled={vol} className="mt-0.5 h-4 w-4" />
        <span><strong>Mag zelf publiceren.</strong> Uit: wijzigingen blijven een concept tot jij ze live zet.</span>
      </label>
      <label className="flex items-start gap-2 text-sm text-stone-700">
        <input type="checkbox" name="magBerichten" disabled={vol} className="mt-0.5 h-4 w-4" />
        <span><strong>Mag de berichten zien.</strong> Daar staan gegevens van je bezoekers in.</span>
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={bezig || vol}
          className="rounded-full bg-violet-700 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-600 disabled:opacity-50 cursor-pointer"
        >
          {bezig ? "Toevoegen..." : "Toevoegen en uitnodigen"}
        </button>
        {uitslag && (
          <p role="status" className={`text-sm ${uitslag.ok ? "text-emerald-800" : "text-red-700"}`}>
            {uitslag.melding}
          </p>
        )}
      </div>
    </form>
  );
}
