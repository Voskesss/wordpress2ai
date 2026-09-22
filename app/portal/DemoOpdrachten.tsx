"use client";

import { useState } from "react";

/**
 * Klaarstaande opdrachten in de probeer-demo.
 *
 * Wat een demo doodslaat is het lege invoerveld: iemand komt binnen, weet niet
 * wat hij moet typen, tikt iets halfslachtigs, krijgt iets halfslachtigs terug
 * en gaat weg met de indruk dat het tegenvalt. Terwijl het werkt.
 *
 * Deze knoppen halen dat weg. Eén klik en de opdracht gaat meteen de deur uit,
 * dus binnen tien seconden ziet hij zijn eigen wijziging op de site staan. Dat
 * is het hele verhaal, zonder dat hij iets hoeft te bedenken.
 *
 * De vier zijn met opzet verschillend van aard: tijden, een blikvanger,
 * opmaak en tekst. Samen laten ze zien dat het niet één trucje is.
 *
 * Ze raken alle vier maar één bestand, en dat is geen toeval. De demosite is
 * nog niet volgens de blauwdruk gebouwd: hij heeft geen delen-map, dus het
 * menu staat in elke pagina apart. Een opdracht als "zet deze pagina ook in
 * het menu" betekent daar zeven bestanden herschrijven, en dan staat een
 * bezoeker minuten te wachten op wat zijn eerste indruk moet zijn.
 */

export type Opdracht = { kop: string; uitleg: string; tekst: string };

export const OPDRACHTEN: Opdracht[] = [
  {
    kop: "🕐 Openingstijden",
    uitleg: "Pas de tijden op zaterdag aan",
    tekst: "Zet de openingstijden op zaterdag op 08:00 tot 16:00",
  },
  {
    kop: "📣 Balk bovenaan",
    uitleg: "Een aankondiging op de homepagina",
    tekst:
      "Zet bovenaan de homepagina een opvallende balk: dit weekend verse appeltaart, op = op",
  },
  {
    kop: "🎨 Andere kleur",
    uitleg: "Verander de kleur van de knoppen",
    tekst: "Maak de knoppen op de site donkergroen in plaats van de huidige kleur",
  },
  {
    kop: "✍️ Pakkendere kop",
    uitleg: "Herschrijf de grote kop op de homepagina",
    tekst:
      "Maak de grote kop op de homepagina pakkender en zet er een korte zin onder over ons versgebakken brood",
  },
];

export default function DemoOpdrachten() {
  const [weg, setWeg] = useState(false);
  if (weg) return null;

  function start(o: Opdracht) {
    window.dispatchEvent(
      new CustomEvent("wp2ai-startopdracht", {
        detail: { tekst: o.tekst, verstuurDirect: true },
      })
    );
  }

  return (
    <div className="mb-2 rounded-2xl border border-violet-200 bg-violet-50/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-violet-900">
          Probeer maar, één klik is genoeg
        </p>
        <button
          type="button"
          onClick={() => setWeg(true)}
          className="shrink-0 text-xs text-violet-500 hover:text-violet-800"
          aria-label="Suggesties verbergen"
        >
          verbergen
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {OPDRACHTEN.map((o) => (
          <button
            key={o.kop}
            type="button"
            onClick={() => start(o)}
            className="lift rounded-xl border border-violet-200 bg-white px-2.5 py-2 text-left hover:border-violet-400 sm:px-3"
          >
            <span className="block text-xs font-semibold text-stone-800 sm:text-sm">{o.kop}</span>
            <span className="block text-[11px] leading-tight text-stone-500 sm:text-xs">{o.uitleg}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-violet-700">
        Of typ zelf wat je wilt aanpassen.
        <span className="hidden sm:inline"> Je kunt niets kapotmaken: de demo-site wordt elk uur teruggezet.</span>
      </p>
    </div>
  );
}
