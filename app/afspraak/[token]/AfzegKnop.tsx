"use client";

import { useActionState, useState } from "react";
import { zegAfspraakAf, type KiesUitkomst } from "./acties";

/** Klant zegt zelf af, in twee stappen: eerst openklappen, dan met een reden
 * (mag leeg) bevestigen. De reden gaat mee in de mail naar Jos. */
export default function AfzegKnop({
  token,
  afspraakId,
  label = "Deze afspraak afzeggen",
}: {
  token: string;
  afspraakId: number;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [stand, verstuur, bezig] = useActionState<KiesUitkomst | null, FormData>(zegAfspraakAf, null);

  if (stand?.ok) {
    return <p className="mt-2 text-sm text-stone-600">✓ {stand.melding}</p>;
  }
  if (!open) {
    return (
      <p className="mt-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-semibold text-red-700 underline hover:text-red-800 cursor-pointer"
        >
          {label}
        </button>
      </p>
    );
  }
  return (
    <form action={verstuur} className="mt-2 rounded-xl border border-red-200 bg-white/70 p-3">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="afspraakId" value={afspraakId} />
      <label className="block text-sm font-semibold text-stone-700">
        Waarom komt het niet uit? <span className="font-normal text-stone-500">(mag leeg)</span>
        <textarea
          name="reden"
          rows={2}
          className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal focus:border-red-400 focus:outline-none"
        />
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={bezig}
          className="rounded-full border border-red-300 bg-red-50 px-4 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 cursor-pointer"
        >
          {bezig ? "Afzeggen..." : "Ja, zeg af"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm font-semibold text-stone-500 underline cursor-pointer"
        >
          Toch niet
        </button>
        {stand && !stand.ok && <span className="text-sm text-red-700">{stand.melding}</span>}
      </div>
    </form>
  );
}
