"use client";

import { useEffect, useRef, useState } from "react";

type Doc = { pad: string; kb: number; inGebruik: boolean; adres?: string | null; live?: boolean };

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
  const [gekopieerd, setGekopieerd] = useState<string | null>(null);
  const [upload, setUpload] = useState<string | null>(null);
  const [nieuw, setNieuw] = useState<string | null>(null);
  const kiezer = useRef<HTMLInputElement>(null);

  /** Rechtstreeks uploaden in de bank, zonder de chat. Zelfde weg als via de
   * chat (eerst naar de upload-opslag, dan in de site), en het document staat
   * daarna meteen online zodat de link direct te kopiëren is. */
  async function uploaden(bestand: File) {
    if (upload) return;
    setFout(null);
    if (!/\.pdf$/i.test(bestand.name)) {
      setFout("Alleen pdf-bestanden kunnen in de documentenbank.");
      return;
    }
    setUpload("Uploaden... 0%");
    try {
      const { upload: naarOpslag } = await import("@vercel/blob/client");
      const blob = await naarOpslag(bestand.name, bestand, {
        access: "public",
        handleUploadUrl: "/api/audio-upload",
        clientPayload: JSON.stringify({ siteId }),
        onUploadProgress: (p) => setUpload(`Uploaden... ${Math.round(p.percentage)}%`),
      });
      setUpload("Op je site zetten...");
      const r = (await fetch("/api/documentbank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, blobUrl: blob.url, naam: bestand.name, bron: "bank" }),
      }).then((x) => x.json())) as { pad?: string; kb?: number; adres?: string | null; live?: boolean; error?: string };
      if (!r.pad) throw new Error(r.error ?? "Opslaan lukte niet");
      const pad = r.pad.replace(/^\//, "");
      setDocs((v) => [
        { pad, kb: r.kb ?? 0, inGebruik: false, adres: r.adres ?? null, live: Boolean(r.live) },
        ...(v ?? []).filter((d) => d.pad !== pad),
      ]);
      setNieuw(pad);
    } catch (e) {
      setFout(`Uploaden lukte niet: ${e instanceof Error ? e.message : "onbekende fout"}. Probeer het zo nog eens.`);
    } finally {
      setUpload(null);
      if (kiezer.current) kiezer.current.value = "";
    }
  }

  /** Het webadres naar het klembord, voor een nieuwsbrief of mail. Lukt het
   * klembord niet (oude browser), dan staat het adres eronder om te selecteren. */
  async function kopieer(d: Doc) {
    if (!d.adres) return;
    try {
      await navigator.clipboard.writeText(d.adres);
    } catch {
      /* het adres staat zichtbaar onder de knop */
    }
    setGekopieerd(d.pad);
    setTimeout(() => setGekopieerd((v) => (v === d.pad ? null : v)), 4000);
  }

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
              De pdf&apos;s op je site: vacatures, voorwaarden, menukaarten. Kopieer de link om een document in een
              mail of nieuwsbrief te zetten.
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
          <input
            ref={kiezer}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploaden(f);
            }}
          />
          {/* Documenten op de site zijn openbaar: iedereen met de link kan ze
              openen en Google kan ze vinden. Dat moet je weten vóór je uploadt. */}
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
            <strong>Let op: alles wat je hier uploadt is openbaar.</strong> Iedereen met de link kan het openen, en
            Google kan het vinden. Upload dus nooit iets met persoonsgegevens of iets vertrouwelijks, zoals een
            contract, offerte, dossier of verslag over een klant.
          </p>
          <button
            type="button"
            onClick={() => kiezer.current?.click()}
            disabled={upload !== null}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-300 px-4 py-3 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-60 cursor-pointer"
          >
            {upload ?? "⬆ Document uploaden (pdf)"}
          </button>
          <p className="-mt-1 text-center text-[11px] text-stone-500">
            Het staat daarna meteen online. Kopieer de link voor een mail of nieuwsbrief, of zet het op een pagina.
          </p>
          {fout && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{fout}</p>}
          {!docs && !fout && <p className="text-sm text-stone-500">Even kijken wat er staat...</p>}
          {docs?.length === 0 && (
            <p className="text-sm text-stone-500">
              Nog geen documenten. Upload hierboven een pdf, of stuur er een mee in de chat via de 📎, bijvoorbeeld een
              vacature of je voorwaarden.
            </p>
          )}
          {docs?.map((d) => (
            <div
              key={d.pad}
              className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border p-3 ${
                nieuw === d.pad ? "border-violet-400 bg-violet-50/60" : d.inGebruik ? "border-emerald-300" : "border-stone-200"
              }`}
            >
              <span aria-hidden className="text-lg">📄</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-stone-800" title={d.pad}>
                  {nieuw === d.pad && <span className="mr-1.5 rounded-full bg-violet-700 px-1.5 py-0.5 text-[10px] font-bold text-white">Nieuw</span>}
                  {d.pad.split("/").pop()}
                </span>
                <span className="text-[11px] text-stone-500">
                  {d.kb} kB
                  {d.inGebruik ? " · staat op je site" : " · nergens op je site gelinkt"}
                </span>
                {d.adres && d.live && gekopieerd === d.pad && (
                  <span className="mt-0.5 block select-all break-all text-[11px] text-emerald-800">{d.adres}</span>
                )}
                {d.adres && !d.live && (
                  <span className="mt-0.5 block text-[11px] text-amber-700">
                    Nog niet live: de link kun je kopiëren zodra je wijziging gepubliceerd is.
                  </span>
                )}
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
              {d.adres && d.live && (
                <button
                  onClick={() => kopieer(d)}
                  title="Het webadres van dit document, om in een mail of nieuwsbrief te plakken"
                  className={`rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer ${
                    gekopieerd === d.pad
                      ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                      : "border-violet-300 text-violet-700 hover:bg-violet-50"
                  }`}
                >
                  {gekopieerd === d.pad ? "✓ Link gekopieerd" : "🔗 Link kopiëren"}
                </button>
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
                  <span className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="basis-full text-amber-800">
                      Staat deze link in een verstuurde mail of nieuwsbrief? Dan werkt die daarna niet meer.
                    </span>
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
