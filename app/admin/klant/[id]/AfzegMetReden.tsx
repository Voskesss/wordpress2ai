"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { annuleerAfspraak } from "../../acties-afspraken";
import MailVoorbeeldKnop from "./MailVoorbeeldKnop";

function VerstuurKnop() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 cursor-pointer"
    >
      {pending ? "Bezig..." : "Ja, zeg af"}
    </button>
  );
}

/** Afzeggen/afwijzen vanuit de admin, met een reden (mag leeg) die in de mail
 * naar de klant komt — zelfde tweestapsopzet als bij de klant zelf. */
export default function AfzegMetReden({
  siteId,
  afspraakId,
  label,
}: {
  siteId: number;
  afspraakId: number;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold underline cursor-pointer"
      >
        {label}
      </button>
    );
  }
  return (
    <form action={annuleerAfspraak} className="flex w-full flex-wrap items-end gap-2 rounded-lg border border-red-200 bg-white/70 p-2">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="afspraakId" value={afspraakId} />
      <label className="block min-w-[14rem] flex-1 text-xs font-semibold text-stone-700">
        Reden voor de klant (mag leeg)
        <input
          name="reden"
          placeholder="Bijv.: er kwam iets tussen — ik stel snel nieuwe momenten voor."
          className="mt-1 w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs font-normal focus:border-red-400 focus:outline-none"
        />
      </label>
      <MailVoorbeeldKnop
        klein
        soort="afspraak-afzegging"
        siteId={siteId}
        extra={{ afspraakId: String(afspraakId) }}
        velden={[["reden", "reden"]]}
      />
      <VerstuurKnop />
      <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-stone-500 underline cursor-pointer">
        Toch niet
      </button>
    </form>
  );
}
