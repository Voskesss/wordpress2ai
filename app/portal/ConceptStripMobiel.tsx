"use client";

import { useState } from "react";

/**
 * De conceptstrook op een telefoon, voor de demo én voor klanten.
 *
 * Het gewone gele blok is op 390 pixels breed 176 hoog: ruim een kwart van
 * het scherm, precies waar de chat hoort te staan. Deze strook doet hetzelfde
 * werk in 48.
 *
 * Alle vier de acties staan in de balk zelf, twee als pictogram. Wie niet weet
 * wat een pijltje of een kruisje betekent, klapt met de drie puntjes uit en
 * leest ze voluit. Niets zit dus alléén achter dat menu verstopt.
 */
export default function ConceptStripMobiel({
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
  const bezetVoorActie = conceptActie !== null || bezig || nieuwBezig;
  // 40 pixels: een vinger is geen muisaanwijzer. Op 32 zaten twee knoppen met
  // heel verschillende gevolgen te dicht op elkaar.
  const pictogram =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm disabled:opacity-40";

  /** Weggooien is niet terug te draaien en staat naast "stap terug", dus
   * vragen we het één keer na. Op de computer staat er een woord op de knop;
   * hier een kruisje, en een mistik kost je al je werk. */
  function weggooienMetVraag() {
    if (window.confirm("Het concept weggooien? Je site blijft dan zoals hij nu is, en je wijziging is weg.")) {
      onVerwerp();
    }
  }

  return (
    <div className="mb-2 rounded-xl border border-amber-400 bg-amber-50 px-2 py-2 shadow-lg">
      <div className="flex items-center gap-1.5">
        <span className="min-w-0 flex-1 text-xs font-semibold leading-tight text-amber-950">
          Concept<span className="block text-[10px] font-medium">Niet live</span>
        </span>
        <button
          type="button"
          onClick={onStapTerug}
          disabled={conceptActie !== null || stapTerugBezig || bezig}
          aria-label="Laatste stap terugdraaien"
          title="Laatste stap terugdraaien"
          className={`${pictogram} border-amber-300 text-amber-950`}
        >
          {stapTerugBezig ? "…" : "↩"}
        </button>
        <button
          type="button"
          onClick={weggooienMetVraag}
          disabled={bezetVoorActie}
          aria-label="Concept weggooien"
          title="Concept weggooien"
          className={`${pictogram} border-red-300 text-red-700`}
        >
          {conceptActie === "verwerp" ? "…" : "✕"}
        </button>
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
          disabled={bezetVoorActie}
          className="shrink-0 rounded-full bg-violet-700 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {conceptActie === "publiceer" ? "Bezig..." : "Publiceer"}
        </button>
        <button
          type="button"
          onClick={() => setMeerOpen((open) => !open)}
          aria-label={meerOpen ? "Uitleg sluiten" : "Uitleg bij deze knoppen"}
          aria-expanded={meerOpen}
          className="shrink-0 rounded-full px-1.5 py-1.5 text-lg leading-none text-amber-950"
        >
          ⋯
        </button>
      </div>
      {meerOpen && (
        <div className="mt-2 grid gap-1.5 border-t border-amber-200 pt-2">
          <button
            type="button"
            onClick={onBekijk}
            className="rounded-lg px-2 py-1.5 text-left text-xs font-medium text-amber-950 hover:bg-amber-100"
          >
            Bekijk het concept op je site
          </button>
          <button
            type="button"
            onClick={onStapTerug}
            disabled={conceptActie !== null || stapTerugBezig || bezig}
            className="rounded-lg px-2 py-1.5 text-left text-xs font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50"
          >
            ↩ Stap terug: draait alleen je laatste stap terug
          </button>
          <button
            type="button"
            onClick={weggooienMetVraag}
            disabled={bezetVoorActie}
            className="rounded-lg px-2 py-1.5 text-left text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            ✕ Concept weggooien: je site blijft zoals hij was
          </button>
        </div>
      )}
    </div>
  );
}
