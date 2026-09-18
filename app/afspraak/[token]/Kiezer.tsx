"use client";

import { useActionState, useState } from "react";
import { kiesMoment, type KiesUitkomst } from "./acties";

export type Dag = { datum: string; datumTekst: string; duurTekst: string; tijden: { tijd: string; iso: string }[] };

/** De klant kiest een dag en tijd en laat zijn gegevens achter. */
export default function Kiezer({ token, dagen }: { token: string; dagen: Dag[] }) {
  const [gekozen, setGekozen] = useState<string | null>(null);
  const [stand, verstuur, bezig] = useActionState<KiesUitkomst | null, FormData>(kiesMoment, null);

  if (stand?.ok) {
    return (
      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        ✓ {stand.melding}
      </p>
    );
  }

  return (
    <form action={verstuur} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="moment" value={gekozen ?? ""} />
      <div className="space-y-4">
        {dagen.map((dag) => (
          <div key={dag.datum}>
            <p className="text-sm font-semibold text-stone-800">
              {dag.datumTekst} <span className="font-normal text-stone-500">· gesprek van {dag.duurTekst}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {dag.tijden.map((t) => (
                <button
                  key={t.iso}
                  type="button"
                  onClick={() => setGekozen(t.iso)}
                  aria-pressed={gekozen === t.iso}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold cursor-pointer ${
                    gekozen === t.iso
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-stone-300 bg-white text-stone-700 hover:border-emerald-500 hover:text-emerald-800"
                  }`}
                >
                  {t.tijd}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {gekozen && (
        <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-stone-700">
              Je naam
              <input name="naam" required className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal" />
            </label>
            <label className="block text-sm font-semibold text-stone-700">
              E-mailadres
              <input name="email" type="email" required className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal" />
            </label>
            <label className="block text-sm font-semibold text-stone-700">
              Telefoonnummer <span className="font-normal text-stone-500">(waarop Jos je belt)</span>
              <input name="telefoon" className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal" />
            </label>
            <label className="block text-sm font-semibold text-stone-700 sm:col-span-2">
              Waar wil je het over hebben? <span className="font-normal text-stone-500">(mag leeg)</span>
              <textarea name="opmerking" rows={2} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal" />
            </label>
          </div>
          <button
            type="submit"
            disabled={bezig}
            className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60 cursor-pointer"
          >
            {bezig ? "Bezig..." : "Dit moment doorgeven"}
          </button>
        </div>
      )}

      {stand && !stand.ok && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{stand.melding}</p>
      )}
      {!gekozen && <p className="text-sm text-stone-500">Klik op een tijd om verder te gaan.</p>}
    </form>
  );
}
