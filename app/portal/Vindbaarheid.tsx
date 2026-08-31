"use client";

import { useEffect, useState } from "react";

type Gegevens = { bestand: string; titel: string; omschrijving: string; adres: string };

/** Paneel waarin de eigenaar zelf de vindbaarheid van de huidige pagina regelt:
 * paginatitel, omschrijving voor Google en het webadres (met 301 en linkfix). */
export default function Vindbaarheid({
  siteId,
  pad,
  domein,
  onKlaar,
  onSluit,
}: {
  siteId: number;
  pad: string;
  domein?: string | null;
  onKlaar: (data: {
    reply?: string;
    previewUrl?: string;
    changeId?: number;
    bestanden?: string[];
    nieuwAdres?: string;
  }) => void;
  onSluit: () => void;
}) {
  const [gegevens, setGegevens] = useState<Gegevens | null>(null);
  const [titel, setTitel] = useState("");
  const [omschrijving, setOmschrijving] = useState("");
  const [adres, setAdres] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    let afgebroken = false;
    (async () => {
      const res = await fetch(
        `/api/vindbaarheid?siteId=${siteId}&pad=${encodeURIComponent(pad)}`
      );
      const data = (await res.json()) as Gegevens & { error?: string };
      if (afgebroken) return;
      if (data.error) {
        setFout("Deze pagina kon ik niet lezen — probeer een andere pagina.");
        return;
      }
      setGegevens(data);
      setTitel(data.titel);
      setOmschrijving(data.omschrijving);
      setAdres(data.adres);
    })();
    return () => {
      afgebroken = true;
    };
  }, [siteId, pad]);

  async function opslaan() {
    if (!gegevens || bezig) return;
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch("/api/vindbaarheid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          bestand: gegevens.bestand,
          titel,
          omschrijving,
          adres,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        reply?: string;
        previewUrl?: string;
        changeId?: number;
        bestanden?: string[];
        nieuwAdres?: string;
      };
      if (data.ok) onKlaar(data);
      else setFout(data.error === "Geen wijziging" ? "Er is nog niets gewijzigd." : "Opslaan lukte niet — probeer het zo nog eens.");
    } finally {
      setBezig(false);
    }
  }

  const site = domein ?? "jouwwebsite.nl";
  const isHome = gegevens?.bestand === "index.html";

  return (
    <div className="mb-3 rounded-2xl border border-violet-300 bg-white/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-sm">🔍 Vindbaarheid van deze pagina</h3>
        <button
          onClick={onSluit}
          aria-label="Sluiten"
          className="text-stone-400 hover:text-stone-700 cursor-pointer"
        >
          ✕
        </button>
      </div>

      {!gegevens && !fout && <p className="mt-2 text-sm text-stone-500">Even ophalen...</p>}
      {fout && <p className="mt-2 text-sm text-red-600">{fout}</p>}

      {gegevens && (
        <>
          <p className="mt-1 text-xs text-stone-500">
            Zo ziet je pagina er ongeveer uit in Google:
          </p>
          <div className="mt-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
            <p className="truncate text-xs text-emerald-700">
              {site}
              {adres === "/" ? "" : adres}
            </p>
            <p className="truncate text-[15px] text-blue-700">{titel || "(geen titel)"}</p>
            <p className="line-clamp-2 text-xs text-stone-600">
              {omschrijving || "(geen omschrijving — Google kiest dan zelf een stukje tekst)"}
            </p>
          </div>

          <label className="mt-3 block text-xs font-semibold">
            Paginatitel
            <input
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-violet-600 focus:outline-none"
            />
            <span className={`text-[11px] ${titel.length > 60 ? "text-amber-600" : "text-stone-400"}`}>
              {titel.length}/60 tekens — daarboven kapt Google hem af
            </span>
          </label>

          <label className="mt-2 block text-xs font-semibold">
            Omschrijving voor Google
            <textarea
              value={omschrijving}
              onChange={(e) => setOmschrijving(e.target.value)}
              rows={2}
              className="mt-1 w-full resize-none rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-violet-600 focus:outline-none"
            />
            <span className={`text-[11px] ${omschrijving.length > 155 ? "text-amber-600" : "text-stone-400"}`}>
              {omschrijving.length}/155 tekens
            </span>
          </label>

          <label className="mt-2 block text-xs font-semibold">
            Webadres van deze pagina
            <input
              value={adres}
              onChange={(e) => setAdres(e.target.value.toLowerCase())}
              disabled={isHome}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-violet-600 focus:outline-none disabled:bg-stone-100 disabled:text-stone-500"
            />
            <span className="text-[11px] text-stone-400">
              {isHome
                ? "Het adres van je homepage staat vast op / — dat beschermen we, want wijzigen zou je vindbaarheid schaden. Toch nodig? Neem even contact met ons op."
                : "Wijzig je dit, dan blijft het oude adres automatisch doorverwijzen (301) en werken we alle links op je site bij."}
            </span>
          </label>

          <div className="mt-3 flex gap-2">
            <button
              onClick={opslaan}
              disabled={bezig}
              className="rounded-full bg-violet-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-violet-600 disabled:opacity-50 cursor-pointer"
            >
              {bezig ? "Bezig..." : "Opslaan als concept"}
            </button>
            <button
              onClick={onSluit}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100 cursor-pointer"
            >
              Annuleer
            </button>
          </div>
        </>
      )}
    </div>
  );
}
