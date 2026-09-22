"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { zetAfspraakBlokKlaar, type BlokUitkomst } from "../../acties-afspraken";
import EigenaarVelden, { type Eigenaarschap } from "./EigenaarVelden";

const invoer =
  "mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal focus:border-violet-500 focus:outline-none";

/** Eén dag erbij zetten. Na het opslaan staat het formulier meteen klaar voor
 * de volgende dag (datum een dag verder, tijden blijven staan), zodat je in één
 * ruk een paar dagen kunt klaarzetten. */
export default function DagKlaarzetten({ siteId, leadId, startDatum }: Eigenaarschap & { startDatum: string }) {
  const [stand, verstuur, bezig] = useActionState<BlokUitkomst | null, FormData>(zetAfspraakBlokKlaar, null);
  const [datum, setDatum] = useState(startDatum);
  const laatsteMelding = useRef<BlokUitkomst | null>(null);

  useEffect(() => {
    if (stand && stand !== laatsteMelding.current) {
      laatsteMelding.current = stand;
      // Gelukt? Dan meteen de volgende dag voorstellen (weekend overslaan)
      if (stand.ok && stand.datum) {
        const d = new Date(`${stand.datum}T12:00:00`);
        do {
          d.setDate(d.getDate() + 1);
        } while (d.getDay() === 0 || d.getDay() === 6);
        setDatum(d.toLocaleDateString("sv-SE"));
      }
    }
  }, [stand]);

  return (
    <form action={verstuur} className="mt-4 grid gap-3 sm:grid-cols-5 items-end">
      <EigenaarVelden siteId={siteId} leadId={leadId} />
      <label className="block text-sm font-semibold sm:col-span-2">
        Dag
        <input
          name="datum"
          type="date"
          required
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          className={invoer}
        />
      </label>
      <label className="block text-sm font-semibold">
        Van
        <input name="van" type="time" step={1800} required defaultValue="09:00" className={invoer} />
      </label>
      <label className="block text-sm font-semibold">
        Tot
        <input name="tot" type="time" step={1800} required defaultValue="12:00" className={invoer} />
      </label>
      <label className="block text-sm font-semibold">
        Gesprek duurt
        <select name="duur" defaultValue="30" className={invoer}>
          <option value="30">een half uur</option>
          <option value="60">1 uur</option>
          <option value="90">1,5 uur</option>
          <option value="120">2 uur</option>
        </select>
      </label>
      <div className="sm:col-span-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={bezig}
          className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700 disabled:opacity-60 cursor-pointer"
        >
          {bezig ? "Klaarzetten..." : "Dag klaarzetten"}
        </button>
        {stand && (
          <span className={`text-sm ${stand.ok ? "text-emerald-700" : "text-red-700"}`}>
            {stand.ok ? "✓ " : ""}
            {stand.melding}
          </span>
        )}
      </div>
    </form>
  );
}
