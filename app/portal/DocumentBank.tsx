"use client";

import { useEffect, useState } from "react";

type Doc = { pad: string; kb: number; inGebruik: boolean };

/** Documentenbank: de pdf's die op de site staan (vacature, voorwaarden,
 * menukaart, brochure). Opruimen kan zodra er nergens meer een downloadlink
 * naartoe wijst — een dode downloadknop is erger dan een bestand te veel. */
export default function DocumentBank({
  siteId,
  previewAccess,
  onGebruik,
  onSluit,
}: {
  siteId: number;
  previewAccess?: string | null;
  onGebruik: (pad: string) => void;
  onSluit: () => void;
}) {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bezigMet, setBezigMet] = useState<string | null>(null);
  const [wisVraag, setWisVraag] = useState<string | null>(null);

  useEffect(() => {
    let weg = false;
    (async () => {
      try {
        const r = (await fetch(`/api/documentbank?siteId=${siteId}`).then((x) => x.json())) as {
          documenten?: Doc[];
          error?: string;
        };
        if (weg) return;
        if (r.documenten) setDocs(r.documenten);
        else setFout(r.error ?? "Kon de documentenbank niet laden.");
      } catch {
        if (!weg) setFout("Kon de documentenbank niet laden.");
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
      const r = (await fetch("/api/documentbank", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, pad }),
      }).then((x) => x.json())) as { ok?: boolean; error?: string; melding?: string };
      if (r.ok) {
        setDocs((v) => (v ?? []).filter((x) => x.pad !== pad));
        setWisVraag(null);
      } else setFout(r.melding ?? r.error ?? "Opruimen lukte niet.");
    } catch {
      setFout("Opruimen lukte niet.");
    } finally {
      setBezigMet(null);
    }
  }

  return (
    <div className="absolute inset-0 z-[55] flex items-center justify-center bg-stone-900/40 p-4" role="dialog" aria-label="Documentenbank">
      <div className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
          <div>
            <h3 className="font-semibold text-stone-900">📄 Documentenbank</h3>
            <p className="text-xs text-stone-500">
              De pdf&apos;s op je site: vacatures, voorwaarden, menukaarten. Opruimen kan zodra er geen downloadlink
              meer naar wijst.
            </p>
          </div>
          <button
            onClick={onSluit}
            aria-label="Documentenbank sluiten"
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-2.5">
          {fout && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{fout}</p>}
          {!docs && !fout && <p className="text-sm text-stone-500">Even kijken wat er staat...</p>}
          {docs?.length === 0 && (
            <p className="text-sm text-stone-500">
              Nog geen documenten. Stuur een pdf mee via de 📎 — bijvoorbeeld een vacature of je voorwaarden — dan zet
              ik hem op je site met een nette downloadlink.
            </p>
          )}
          {docs?.map((d) => (
            <div
              key={d.pad}
              className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border p-3 ${
                d.inGebruik ? "border-emerald-300" : "border-stone-200"
              }`}
            >
              <span aria-hidden className="text-lg">📄</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-stone-800" title={d.pad}>
                  {d.pad.split("/").pop()}
                </span>
                <span className="text-[11px] text-stone-500">
                  {d.kb} kB
                  {d.inGebruik ? " · staat op je site" : " · nergens gelinkt"}
                </span>
              </span>
              {previewAccess && (
                <a
                  href={`/site-weergave/${previewAccess}/${d.pad}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 hover:border-violet-400 hover:text-violet-700"
                >
                  Openen
                </a>
              )}
              <button
                onClick={() => {
                  onGebruik(`/${d.pad}`);
                  onSluit();
                }}
                className="rounded-full bg-violet-700 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-600 cursor-pointer"
              >
                Op een pagina zetten
              </button>
              {!d.inGebruik &&
                (wisVraag === d.pad ? (
                  <span className="flex items-center gap-1.5 text-xs">
                    <button
                      onClick={() => wis(d.pad)}
                      disabled={bezigMet !== null}
                      className="rounded-full bg-red-600 px-2.5 py-1 font-semibold text-white hover:bg-red-500 disabled:opacity-50 cursor-pointer"
                    >
                      {bezigMet === d.pad ? "Bezig..." : "Ja, weg"}
                    </button>
                    <button onClick={() => setWisVraag(null)} className="rounded-full border border-stone-200 px-2.5 py-1 text-stone-600 cursor-pointer">
                      Nee
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      setFout(null);
                      setWisVraag(d.pad);
                    }}
                    className="rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-500 hover:border-red-300 hover:text-red-600 cursor-pointer"
                  >
                    Opruimen
                  </button>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
