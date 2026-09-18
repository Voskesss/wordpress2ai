"use client";

import { useActionState } from "react";
import { zegAfspraakAf, type KiesUitkomst } from "./acties";

/** Klant zegt zelf af — met een tussenvraag, want dit is niet terug te draaien. */
export default function AfzegKnop({
  token,
  afspraakId,
  label = "Deze afspraak afzeggen",
}: {
  token: string;
  afspraakId: number;
  label?: string;
}) {
  const [stand, verstuur, bezig] = useActionState<KiesUitkomst | null, FormData>(zegAfspraakAf, null);

  if (stand?.ok) {
    return <p className="mt-2 text-sm text-stone-600">✓ {stand.melding}</p>;
  }
  return (
    <form
      action={verstuur}
      onSubmit={(e) => {
        if (!window.confirm("Weet je het zeker? Jos krijgt hier bericht van.")) e.preventDefault();
      }}
      className="mt-2"
    >
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="afspraakId" value={afspraakId} />
      <button
        type="submit"
        disabled={bezig}
        className="text-sm font-semibold text-red-700 underline hover:text-red-800 disabled:opacity-60 cursor-pointer"
      >
        {bezig ? "Afzeggen..." : label}
      </button>
      {stand && !stand.ok && <span className="ml-2 text-sm text-red-700">{stand.melding}</span>}
    </form>
  );
}
