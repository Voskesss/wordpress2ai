"use client";

import { useActionState } from "react";
import { mailReviewVerzoek, type ReviewMailUitkomst } from "../../acties";

/** Review- en referentieverzoek met één klik, met zichtbaar verstuurmoment. */
export default function ReviewMailKnop({
  siteId,
  verstuurdOp,
}: {
  siteId: number;
  verstuurdOp: string | null;
}) {
  const [stand, verstuur, bezig] = useActionState<ReviewMailUitkomst | null, FormData>(mailReviewVerzoek, null);
  const alGestuurd = Boolean(verstuurdOp) || stand?.ok;

  return (
    <form action={verstuur}>
      <label className="block text-sm font-semibold text-stone-700">
        Eigen berichtje bovenaan de mail <span className="font-normal text-stone-500">(mag leeg)</span>
        <textarea
          name="bericht"
          rows={2}
          placeholder="Bijv.: wat leuk om te zien hoe je de site gebruikt!"
          className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal focus:border-violet-500 focus:outline-none"
        />
      </label>
      <input type="hidden" name="siteId" value={siteId} />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={bezig}
          className={`rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-60 cursor-pointer ${
            alGestuurd
              ? "border-stone-300 text-stone-600 hover:border-violet-400 hover:text-violet-700"
              : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          }`}
        >
          {bezig ? "Versturen..." : alGestuurd ? "Nog een keer versturen" : "Vraag om review en referentie"}
        </button>
        {stand ? (
          <span className={`text-sm ${stand.ok ? "text-emerald-700" : "text-red-700"}`}>
            {stand.ok ? "✓ " : ""}
            {stand.melding}
          </span>
        ) : verstuurdOp ? (
          <span className="text-sm text-stone-500">Verzoek verstuurd op {verstuurdOp}.</span>
        ) : (
          <span className="text-sm text-stone-500">Nog niet gevraagd.</span>
        )}
      </div>
    </form>
  );
}
