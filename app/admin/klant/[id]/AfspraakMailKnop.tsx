"use client";

import { useActionState } from "react";
import { mailAfspraakVoorstel, type MailUitkomst } from "../../acties-afspraken";

/** Nodigt de klant per mail uit voor de klaargezette dagen. Je ziet wanneer hij
 * verstuurd is, en kunt hem daarna nog een keer sturen (herinnering). */
export default function AfspraakMailKnop({
  siteId,
  verstuurdOp,
}: {
  siteId: number;
  /** Al verstuurd? Dan hier het moment, al in leesbare tekst */
  verstuurdOp: string | null;
}) {
  const [stand, verstuur, bezig] = useActionState<MailUitkomst | null, FormData>(mailAfspraakVoorstel, null);
  const alGestuurd = Boolean(verstuurdOp) || stand?.ok;

  return (
    <form action={verstuur} className="mt-4 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-4">
      <input type="hidden" name="siteId" value={siteId} />
      <button
        type="submit"
        disabled={bezig}
        className={`rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-60 cursor-pointer ${
          alGestuurd
            ? "border-stone-300 text-stone-600 hover:border-violet-400 hover:text-violet-700"
            : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
        }`}
      >
        {bezig ? "Versturen..." : alGestuurd ? "Nog een keer versturen" : "Mail deze dagen naar de klant"}
      </button>
      {stand ? (
        <span className={`text-sm ${stand.ok ? "text-emerald-700" : "text-red-700"}`}>
          {stand.ok ? "✓ " : ""}
          {stand.melding}
        </span>
      ) : verstuurdOp ? (
        <span className="text-sm text-stone-500">Uitnodiging verstuurd op {verstuurdOp}.</span>
      ) : (
        <span className="text-sm text-stone-500">De klant heeft nog geen uitnodiging gehad.</span>
      )}
    </form>
  );
}
