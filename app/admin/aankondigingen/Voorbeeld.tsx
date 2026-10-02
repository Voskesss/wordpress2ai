"use client";

import { useState } from "react";
import { AankondigingVenster, type Aankondiging } from "@/app/portal/Aankondigingen";

/** Toont de aankondiging precies zoals de klant hem ziet. Wegklikken wordt
 * hier niet onthouden: jouw eigen account had hem vaak al weggeklikt, en
 * dan zag je hem via "Bekijk als klant" nooit meer (Jos, 02-10-2026). */
export default function Voorbeeld({ a }: { a: Aankondiging }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-violet-400 cursor-pointer"
      >
        Voorbeeld
      </button>
      {open && <AankondigingVenster a={a} onSluit={() => setOpen(false)} />}
    </>
  );
}
