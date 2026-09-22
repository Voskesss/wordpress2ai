"use client";

import { useActionState } from "react";
import { mailAfspraakVoorstel, type MailUitkomst } from "../../acties-afspraken";
import MailVoorbeeldKnop from "./MailVoorbeeldKnop";
import EigenaarVelden, { type Eigenaarschap } from "./EigenaarVelden";

/** Nodigt de klant per mail uit voor de klaargezette dagen. Je ziet wanneer hij
 * verstuurd is, en kunt hem daarna nog een keer sturen (herinnering). */
export default function AfspraakMailKnop({
  siteId,
  leadId,
  verstuurdOp,
}: Eigenaarschap & {
  /** Al verstuurd? Dan hier het moment, al in leesbare tekst */
  verstuurdOp: string | null;
}) {
  const [stand, verstuur, bezig] = useActionState<MailUitkomst | null, FormData>(mailAfspraakVoorstel, null);
  const alGestuurd = Boolean(verstuurdOp) || stand?.ok;

  return (
    <form action={verstuur} className="mt-4 border-t border-stone-100 pt-4">
      <EigenaarVelden siteId={siteId} leadId={leadId} />
      <label className="block text-sm font-semibold text-stone-700">
        Onderwerp <span className="font-normal text-stone-500">(mag leeg)</span>
        <input
          name="onderwerp"
          placeholder={
            leadId ? "Leeg = 'Even kennismaken?'" : "Leeg = 'Even samen kijken naar <naam>?'"
          }
          title="Handig als je al weet waar het gesprek over gaat, bijvoorbeeld: Even een moment prikken voor onze Zoom."
          className="mt-1 mb-3 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal focus:border-violet-500 focus:outline-none"
        />
      </label>
      <label className="block text-sm font-semibold text-stone-700">
        Eigen berichtje in de mail <span className="font-normal text-stone-500">(mag leeg)</span>
        <textarea
          name="bericht"
          rows={3}
          placeholder="Bijvoorbeeld: je nieuwe website staat klaar, ik loop hem graag even met je door."
          className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal focus:border-violet-500 focus:outline-none"
        />
      </label>
      <p className="mt-1 text-xs text-stone-500">
        Komt bovenaan de mail, onder de aanhef. De dagen, de knop en de vraag om een ander moment zet ik er zelf onder.
      </p>
      <label className="mt-2 flex items-start gap-2 text-sm text-stone-700">
        <input type="checkbox" name="zonderStandaard" className="mt-1 accent-emerald-700" />
        <span>
          Standaardzin weglaten{" "}
          <span className="text-stone-500">
            ({leadId ? "\u201com kennis te maken\u201d" : "\u201com samen naar je website te kijken\u201d"})
          </span>{" "}
          — dan staat alleen jouw eigen berichtje boven de dagen, en wordt het onderwerp &quot;Wanneer schikt het
          jou?&quot;.
        </span>
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
      {siteId ? (
        <MailVoorbeeldKnop
          soort="afspraak-uitnodiging"
          siteId={siteId}
          velden={[["bericht", "bericht"], ["zonderStandaard", "zonderStandaard"]]}
        />
      ) : null}
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
      </div>
    </form>
  );
}
