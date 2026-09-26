"use client";

import { useEffect, useState } from "react";

type Video = { pad: string; poster: string | null; mb: number; inGebruik: boolean; bron?: "site" | "media" };

/** Videobank: alle video's die op de site staan, met hun voorbeeldplaatje.
 * Opruimen kan alleen bij video's die nergens meer gebruikt worden — anders
 * zou een pagina een kapotte speler overhouden. */
export default function VideoBank({
  siteId,
  previewAccess,
  onGebruik,
  onSluit,
}: {
  siteId: number;
  /** Sleutel voor /site-weergave: poster en video komen uit dezelfde bron als
   * de lijst (de bestanden van de site), niet van de gepubliceerde site. */
  previewAccess?: string | null;
  onGebruik: (pad: string) => void;
  onSluit: () => void;
}) {
  const [videos, setVideos] = useState<Video[] | null>(null);
  // Nieuwste eerst is de standaard (de server sorteert op uploaddatum);
  // op naam is er voor wie een specifieke video zoekt (26-09)
  const [opNaam, setOpNaam] = useState(false);
  // Echte afmetingen per video (uit de metadata van de speler): zo zie je
  // vóór het plaatsen of iets staand, liggend of vierkant is — met
  // object-cover werd elke video in een liggend vakje gesneden (20-09).
  const [maten, setMaten] = useState<Record<string, { w: number; h: number }>>({});
  const [tegoed, setTegoed] = useState<{ gebruikt: number; limiet: number } | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bezigMet, setBezigMet] = useState<string | null>(null);
  const [wisVraag, setWisVraag] = useState<string | null>(null);

  useEffect(() => {
    let weg = false;
    (async () => {
      try {
        const r = (await fetch(`/api/videobank?siteId=${siteId}`).then((x) => x.json())) as {
          videos?: Video[];
          gebruikt?: number;
          limiet?: number;
          error?: string;
        };
        if (weg) return;
        if (r.videos) {
          setVideos(r.videos);
          if (typeof r.gebruikt === "number" && typeof r.limiet === "number")
            setTegoed({ gebruikt: r.gebruikt, limiet: r.limiet });
        } else setFout(r.error ?? "Kon de videobank niet laden.");
      } catch {
        if (!weg) setFout("Kon de videobank niet laden.");
      }
    })();
    return () => {
      weg = true;
    };
  }, [siteId]);

  async function wis(pad: string) {
    if (bezigMet) return;
    setBezigMet(pad);
    setFout(null);
    try {
      const r = (await fetch("/api/videobank", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, pad }),
      }).then((x) => x.json())) as { ok?: boolean; error?: string; melding?: string };
      if (r.ok) {
        setVideos((v) => (v ?? []).filter((x) => x.pad !== pad));
        setWisVraag(null);
      } else setFout(r.melding ?? r.error ?? "Opruimen lukte niet.");
    } catch {
      setFout("Opruimen lukte niet.");
    } finally {
      setBezigMet(null);
    }
  }

  // Video's uit de media-opslag komen via onze eigen route binnen; oudere
  // video's staan nog in de site en gaan via het voorbeeldvenster.
  const bron = (v: Video) =>
    v.bron === "media"
      ? `/api/videobank?siteId=${siteId}&bestand=${encodeURIComponent(v.pad.split("/").pop() ?? v.pad)}`
      : previewAccess
        ? `/site-weergave/${previewAccess}/${v.pad}`
        : "";
  const posterBron = (v: Video) => (v.poster && previewAccess ? `/site-weergave/${previewAccess}/${v.poster}` : undefined);

  return (
    <div className="absolute inset-0 z-[55] flex items-center justify-center bg-stone-900/40 p-4" role="dialog" aria-label="Videobank">
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
          <div>
            <h3 className="font-semibold text-stone-900">🎬 Videobank</h3>
            <p className="text-xs text-stone-500">
              Alle video&apos;s van je site
              {tegoed ? `: je hebt er ${tegoed.gebruikt} van de ${tegoed.limiet} uit je pakket geüpload` : ""}. Opruimen kan
              zodra een video nergens meer op je site staat.
            </p>
          </div>
          <button
            onClick={onSluit}
            aria-label="Videobank sluiten"
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {fout && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{fout}</p>}
          {!videos && !fout && <p className="text-sm text-stone-500">Even kijken wat er staat...</p>}
          {videos?.length === 0 && (
            <p className="text-sm text-stone-500">
              Nog geen video&apos;s. Stuur er een mee via de 📎 — hij wordt automatisch verkleind voor het web en
              daarna zet ik hem op de plek die je noemt.
            </p>
          )}
          {(videos?.length ?? 0) > 1 && (
            <label className="mb-3 flex items-center gap-2 text-xs text-stone-600">
              Volgorde
              <select
                value={opNaam ? "naam" : "nieuw"}
                onChange={(e) => setOpNaam(e.target.value === "naam")}
                className="rounded-lg border border-stone-200 px-2 py-1 text-xs"
              >
                <option value="nieuw">Nieuwste eerst</option>
                <option value="naam">Op naam (A-Z)</option>
              </select>
            </label>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {(opNaam && videos
              ? [...videos].sort((a, b) => (a.pad.split("/").pop() ?? "").localeCompare(b.pad.split("/").pop() ?? ""))
              : videos
            )?.map((v) => (
              <div key={v.pad} className={`overflow-hidden rounded-2xl border ${v.inGebruik ? "border-emerald-300" : "border-stone-200"}`}>
                {bron(v) ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video
                    src={bron(v)}
                    poster={posterBron(v)}
                    controls
                    preload="metadata"
                    onLoadedMetadata={(e) => {
                      const el = e.currentTarget;
                      if (el.videoWidth && el.videoHeight)
                        setMaten((m) => ({ ...m, [v.pad]: { w: el.videoWidth, h: el.videoHeight } }));
                    }}
                    className="h-40 w-full bg-stone-900 object-contain"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-stone-100 text-xs text-stone-400">geen voorbeeld</div>
                )}
                <div className="p-3">
                  <p className="truncate text-sm font-medium text-stone-800" title={v.pad}>
                    {v.pad.split("/").pop()}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    {v.mb} MB
                    {maten[v.pad] &&
                      ` · ${maten[v.pad].w} × ${maten[v.pad].h} (${
                        maten[v.pad].w > maten[v.pad].h ? "liggend" : maten[v.pad].w < maten[v.pad].h ? "staand" : "vierkant"
                      })`}
                  </p>
                  {v.inGebruik && (
                    <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      op de site
                    </span>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        onGebruik(`/${v.pad}`);
                        onSluit();
                      }}
                      className="rounded-full bg-violet-700 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-600 cursor-pointer"
                    >
                      Op een pagina zetten
                    </button>
                    {!v.inGebruik &&
                      (wisVraag === v.pad ? (
                        <span className="flex items-center gap-1.5 text-xs">
                          <button
                            onClick={() => wis(v.pad)}
                            disabled={bezigMet !== null}
                            className="rounded-full bg-red-600 px-2.5 py-1 font-semibold text-white hover:bg-red-500 disabled:opacity-50 cursor-pointer"
                          >
                            {bezigMet === v.pad ? "Bezig..." : "Ja, weg"}
                          </button>
                          <button onClick={() => setWisVraag(null)} className="rounded-full border border-stone-200 px-2.5 py-1 text-stone-600 cursor-pointer">
                            Nee
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setFout(null);
                            setWisVraag(v.pad);
                          }}
                          className="rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-500 hover:border-red-300 hover:text-red-600 cursor-pointer"
                        >
                          Opruimen
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
