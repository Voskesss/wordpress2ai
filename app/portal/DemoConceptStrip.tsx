"use client";

import { useState } from "react";

/** Alleen voor de mobiele demo: alle conceptacties blijven bereikbaar in weinig hoogte. */
export default function DemoConceptStrip({
  conceptActie,
  bezig,
  nieuwBezig,
  stapTerugBezig,
  onBekijk,
  onPubliceer,
  onStapTerug,
  onVerwerp,
}: {
  conceptActie: string | null;
  bezig: boolean;
  nieuwBezig: boolean;
  stapTerugBezig: boolean;
  onBekijk: () => void;
  onPubliceer: () => void;
  onStapTerug: () => void;
  onVerwerp: () => void;
}) {
  const [meerOpen, setMeerOpen] = useState(false);

  return (
    <div className="mb-2 rounded-xl border border-amber-400 bg-amber-50 px-2 py-2 shadow-lg">
      <div className="flex items-center gap-1.5">
        <span className="min-w-0 flex-1 text-xs font-semibold leading-tight text-amber-950">
          Concept<span className="block text-[10px] font-medium">Niet live</span>
        </span>
        <button
          type="button"
          onClick={onBekijk}
          className="shrink-0 rounded-full border border-amber-500 px-2.5 py-1.5 text-xs font-semibold text-amber-950"
        >
          Bekijk
        </button>
        <button
          type="button"
          onClick={onPubliceer}
          disabled={conceptActie !== null || bezig || nieuwBezig}
          className="shrink-0 rounded-full bg-violet-700 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {conceptActie === "publiceer" ? "Bezig..." : "Publiceer"}
        </button>
        <button
          type="button"
          onClick={() => setMeerOpen((open) => !open)}
          aria-label="Meer conceptacties"
          aria-expanded={meerOpen}
          className="shrink-0 rounded-full px-2 py-1.5 text-lg leading-none text-amber-950"
        >
          ⋯
        </button>
      </div>
      {meerOpen && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-amber-200 pt-2">
          <button
            type="button"
            onClick={onStapTerug}
            disabled={conceptActie !== null || stapTerugBezig || bezig}
            className="rounded-full border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-950 disabled:opacity-50"
          >
            {stapTerugBezig ? "Bezig..." : "↩ Stap terug"}
          </button>
          <button
            type="button"
            onClick={onVerwerp}
            disabled={conceptActie !== null || bezig || nieuwBezig}
            className="rounded-full border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-950 disabled:opacity-50"
          >
            {conceptActie === "verwerp" ? "Bezig..." : "Concept weggooien"}
          </button>
        </div>
      )}
    </div>
  );
}
