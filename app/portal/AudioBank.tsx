"use client";

import { useEffect, useState } from "react";

/** Audiobank: podcasts en andere audio van de site. De bestanden staan in de
 * media-map in R2 (niet in de repo) en overleven het weggooien van een
 * concept — verwijderen kan alleen hier, als bewuste actie. */
export default function AudioBank({
  siteId,
  afspeelBasis,
  onGebruik,
  onSluit,
}: {
  siteId: number;
  /** Domein van de werkversie of live site, voor het beluisteren */
  afspeelBasis?: string | null;
  /** Zet een plaats-opdracht klaar in de invoerbalk */
  onGebruik: (pad: string) => void;
  onSluit: () => void;
}) {
  const [audio, setAudio] = useState<string[] | null>(null);
  const [limiet, setLimiet] = useState<number | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [wisBezig, setWisBezig] = useState<string | null>(null);
  const [wisVraag, setWisVraag] = useState<string | null>(null);

  async function laad() {
    try {
      const r = await fetch(`/api/audiobank?siteId=${siteId}`).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setAudio(r.audio ?? []);
      setLimiet(r.limiet ?? null);
    } catch (e) {
      setFout(e instanceof Error ? e.message : "Kon de audiobank niet laden.");
    }
  }
  useEffect(() => {
    void laad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  async function verwijder(naam: string) {
    setWisBezig(naam);
    setWisVraag(null);
    try {
      const r = await fetch("/api/audiobank", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, naam }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setAudio((a) => (a ?? []).filter((x) => x !== naam));
    } catch (e) {
      setFout(e instanceof Error ? e.message : "Verwijderen mislukte.");
    } finally {
      setWisBezig(null);
    }
  }

  return (
    <div className="absolute inset-0 z-[55] flex items-center justify-center bg-stone-900/40 p-4" role="dialog" aria-label="Audiobank">
      <div className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
          <div>
            <h3 className="font-semibold text-stone-900">🎧 Audiobank</h3>
            <p className="text-xs text-stone-500">
              Podcasts en audio van je site
              {limiet !== null && audio !== null
                ? `: je hebt er ${audio.length} staan, er passen er ${limiet}`
                : ""}
              . Ze blijven bewaard, ook als je een concept weggooit.
            </p>
          </div>
          <button
            onClick={onSluit}
            aria-label="Audiobank sluiten"
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
          {fout && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{fout}</p>}
          {audio === null && !fout && <p className="text-sm text-stone-500">Even kijken wat er staat...</p>}
          {audio?.length === 0 && (
            <p className="text-sm text-stone-500">
              Nog geen audio. Stuur via de 📎 een mp3 of m4a mee (bijvoorbeeld een podcastaflevering), dan verschijnt hij hier en kun je hem op een pagina laten zetten.
            </p>
          )}
          {audio?.map((naam) => (
            <div key={naam} className="rounded-2xl border border-stone-200 p-3">
              <p className="mb-2 truncate text-sm font-medium text-stone-800" title={naam}>{naam}</p>
              {afspeelBasis && (
                <audio controls preload="none" className="mb-2 w-full" src={`https://${afspeelBasis}/audio/${naam}`} />
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onGebruik(`/audio/${naam}`);
                    onSluit();
                  }}
                  className="rounded-full bg-violet-700 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-600 cursor-pointer"
                >
                  Op een pagina zetten
                </button>
                {wisVraag === naam ? (
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="text-stone-600">Zeker weten? Dit kan niet terug.</span>
                    <button
                      onClick={() => verwijder(naam)}
                      className="rounded-full bg-red-600 px-2.5 py-1 font-semibold text-white hover:bg-red-500 cursor-pointer"
                    >
                      Ja, verwijder
                    </button>
                    <button onClick={() => setWisVraag(null)} className="rounded-full border border-stone-200 px-2.5 py-1 text-stone-600 cursor-pointer">
                      Nee
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setWisVraag(naam)}
                    disabled={wisBezig === naam}
                    className="rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-500 hover:border-red-300 hover:text-red-600 disabled:opacity-50 cursor-pointer"
                  >
                    {wisBezig === naam ? "Verwijderen..." : "Verwijderen"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
