"use client";

import { useActionState } from "react";
import { mailInlogUitleg, type InlogMailUitkomst } from "../../acties";
import MailVoorbeeldKnop from "./MailVoorbeeldKnop";

/** "Waar moet ik ook alweer inloggen?" → één klik en de klant heeft de uitleg. */
export default function InlogMailKnop({ siteId }: { siteId: number }) {
  const [stand, verstuur, bezig] = useActionState<InlogMailUitkomst | null, FormData>(mailInlogUitleg, null);
  return (
    <form action={verstuur} className="mt-3 flex flex-wrap items-center gap-3">
      <input type="hidden" name="siteId" value={siteId} />
      <MailVoorbeeldKnop klein soort="inloguitleg" siteId={siteId} />
      <button
        type="submit"
        disabled={bezig}
        className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700 disabled:opacity-60 cursor-pointer"
      >
        {bezig ? "Versturen..." : "Inloguitleg mailen"}
      </button>
      {stand && (
        <span className={`text-sm ${stand.ok ? "text-emerald-700" : "text-red-700"}`}>
          {stand.ok ? "✓ " : ""}
          {stand.melding}
        </span>
      )}
    </form>
  );
}
