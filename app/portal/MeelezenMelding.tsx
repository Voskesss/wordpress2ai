"use client";

import { useEffect, useState } from "react";
import { zetMeelezen } from "./acties";

/**
 * AVG-melding bij het eerste gesprek: Jos kan meelezen om de hulp te
 * verbeteren, en dat mag je uitzetten. "Prima zo" onthouden we in de browser;
 * uitzetten wordt op de server vastgelegd en is later altijd terug te draaien
 * via het regeltje onderin het portaal.
 */
export default function MeelezenMelding({ siteId, meelezenUit }: { siteId: number; meelezenUit: boolean }) {
  const [weggeklikt, setWeggeklikt] = useState(true);
  const [uitgezet, setUitgezet] = useState(false);
  const sleutel = `meelezen-gezien-${siteId}`;

  useEffect(() => {
    try {
      setWeggeklikt(Boolean(localStorage.getItem(sleutel)));
    } catch {
      setWeggeklikt(false);
    }
  }, [sleutel]);

  const sluit = () => {
    setWeggeklikt(true);
    try {
      localStorage.setItem(sleutel, "1");
    } catch {
      // niet erg: dan zien ze de melding nog een keer
    }
  };

  if (uitgezet) {
    return (
      <p className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs text-stone-600">
        ✓ Meelezen staat uit. Je kunt dit altijd weer aanzetten, onderin je portaal bij je instellingen.
      </p>
    );
  }
  if (meelezenUit || weggeklikt) return null;
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs leading-relaxed text-stone-600">
      Goed om te weten: Jos kan gesprekken meelezen om de hulp te verbeteren en om je te helpen als er iets misgaat.
      Liever niet? Zet meelezen uit — bij een probleem kunnen we dan wel minder makkelijk terugkijken wat er gebeurde.
      <span className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={sluit}
          className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
        >
          Prima zo
        </button>
        <form
          action={zetMeelezen}
          onSubmit={() => {
            setUitgezet(true);
            sluit();
          }}
          className="inline"
        >
          <input type="hidden" name="siteId" value={siteId} />
          <input type="hidden" name="uit" value="1" />
          <button type="submit" className="rounded-full border border-stone-300 px-3 py-1 font-semibold text-stone-600 hover:border-stone-400 cursor-pointer">
            Meelezen uitzetten
          </button>
        </form>
      </span>
    </div>
  );
}
