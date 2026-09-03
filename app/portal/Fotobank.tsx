"use client";

import { useEffect, useState } from "react";

type Beeld = { pad: string; stam: string; grootte: number; inGebruik: boolean };

/** Fotobank: alle foto's die ooit op de site stonden — niets wordt bij
 * vervangen weggegooid. Oude versies kun je met één klik terugzetten. */
export default function Fotobank({
  siteId,
  beeldBasis,
  onKlaar,
  onSluit,
}: {
  siteId: number;
  /** Domein waar de beelden nu draaien (werkversie of live) voor de miniaturen */
  beeldBasis?: string | null;
  onKlaar: (data: {
    reply?: string;
    previewUrl?: string;
    changeId?: number;
    bestanden?: string[];
  }) => void;
  onSluit: () => void;
}) {
  const [beelden, setBeelden] = useState<Beeld[] | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bezigMet, setBezigMet] = useState<string | null>(null);
  const [alleenOud, setAlleenOud] = useState(true);

  useEffect(() => {
    let weg = false;
    (async () => {
      try {
        const res = await fetch(`/api/fotobank?siteId=${siteId}`);
        const data = (await res.json()) as { afbeeldingen?: Beeld[]; error?: string };
        if (weg) return;
        if (data.afbeeldingen) setBeelden(data.afbeeldingen);
        else setFout(data.error ?? "Kon de fotobank niet laden.");
      } catch {
        if (!weg) setFout("Kon de fotobank niet laden.");
      }
    })();
    return () => {
      weg = true;
    };
  }, [siteId]);

  async function zetTerug(pad: string) {
    if (bezigMet) return;
    setBezigMet(pad);
    setFout(null);
    try {
      const res = await fetch("/api/fotobank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, pad }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        reply?: string;
        previewUrl?: string;
        changeId?: number;
        bestanden?: string[];
      };
      if (data.ok) onKlaar(data);
      else setFout(data.error ?? "Terugzetten lukte niet.");
    } finally {
      setBezigMet(null);
    }
  }

  // Families met meerdere versies zijn het interessantst (daar valt te kiezen)
  const stammen = new Map<string, Beeld[]>();
  for (const b of beelden ?? []) {
    stammen.set(b.stam, [...(stammen.get(b.stam) ?? []), b]);
  }
  const getoond = (beelden ?? []).filter((b) =>
    alleenOud ? !b.inGebruik || (stammen.get(b.stam)?.length ?? 0) > 1 : true
  );

  return (
    <div className="mb-3 max-h-[70vh] overflow-y-auto rounded-2xl border border-violet-300 bg-white/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">🖼️ Fotobank — alles wat ooit op je site stond</h3>
        <button onClick={onSluit} aria-label="Sluiten" className="cursor-pointer text-stone-400 hover:text-stone-700">
          ✕
        </button>
      </div>
      <p className="mt-1 text-xs text-stone-500">
        Bij het vervangen van een foto gooien we niets weg. Hier vind je oude
        versies terug en zet je ze met één klik weer op de site (als concept —
        jij publiceert).
      </p>
      <label className="mt-2 flex items-center gap-2 text-xs text-stone-600">
        <input type="checkbox" checked={alleenOud} onChange={(e) => setAlleenOud(e.target.checked)} />
        Alleen foto&apos;s met oude versies tonen
      </label>

      {!beelden && !fout && <p className="mt-3 text-sm text-stone-500">Even ophalen...</p>}
      {fout && <p className="mt-3 text-sm text-red-600">{fout}</p>}
      {beelden && getoond.length === 0 && (
        <p className="mt-3 text-sm text-stone-500">
          {alleenOud
            ? "Nog geen vervangen foto's — zodra je een foto vervangt, verschijnt de oude hier."
            : "Geen foto's gevonden."}
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {getoond.map((b) => (
          <div
            key={b.pad}
            className={`overflow-hidden rounded-xl border ${
              b.inGebruik ? "border-emerald-300" : "border-stone-200"
            }`}
          >
            {beeldBasis ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https://${beeldBasis}/${b.pad}`}
                alt={b.pad}
                loading="lazy"
                className="h-24 w-full bg-stone-100 object-cover"
              />
            ) : (
              <div className="flex h-24 items-center justify-center bg-stone-100 text-xs text-stone-400">
                geen voorbeeld
              </div>
            )}
            <div className="p-2">
              <p className="truncate text-[11px] text-stone-500" title={b.pad}>
                {b.pad.split("/").pop()}
              </p>
              {b.inGebruik ? (
                <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  staat nu op de site
                </span>
              ) : (
                <button
                  onClick={() => zetTerug(b.pad)}
                  disabled={bezigMet !== null}
                  className="mt-1 cursor-pointer rounded-full border border-violet-300 px-2.5 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50"
                >
                  {bezigMet === b.pad ? "Bezig..." : "↩︎ Zet terug"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
