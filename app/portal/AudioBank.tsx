"use client";

import { useEffect, useState } from "react";
import { zoekOpNaam } from "@/lib/bank-zoeken";
import { KopieerLink, OpenbaarMelding, UploadKnop, Zoekveld } from "./BankHulp";

type Link = { adres: string | null; live: boolean };

/** Audiobank: podcasts en andere audio van de site. De bestanden staan in de
 * media-map in R2 (niet in de repo) en overleven het weggooien van een
 * concept — verwijderen kan alleen hier, als bewuste actie. */
export default function AudioBank({
  siteId,
  onGebruik,
  onSluit,
}: {
  siteId: number;
  /** Zet een plaats-opdracht klaar in de invoerbalk */
  onGebruik: (pad: string) => void;
  onSluit: () => void;
}) {
  const [audio, setAudio] = useState<string[] | null>(null);
  // Nieuwste eerst is de standaard (de server sorteert op uploaddatum);
  // op naam is er voor wie een specifieke aflevering zoekt (26-09)
  const [opNaam, setOpNaam] = useState(false);
  const [limiet, setLimiet] = useState<number | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [wisBezig, setWisBezig] = useState<string | null>(null);
  const [wisVraag, setWisVraag] = useState<string | null>(null);
  const [links, setLinks] = useState<Record<string, Link>>({});
  const [zoek, setZoek] = useState("");
  const [upload, setUpload] = useState<string | null>(null);
  const [nieuw, setNieuw] = useState<string | null>(null);

  async function laad() {
    try {
      const r = await fetch(`/api/audiobank?siteId=${siteId}`).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setAudio(r.audio ?? []);
      setLimiet(r.limiet ?? null);
      setLinks(r.links ?? {});
    } catch (e) {
      setFout(e instanceof Error ? e.message : "Kon de audiobank niet laden.");
    }
  }
  useEffect(() => {
    void laad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  /** Rechtstreeks uploaden in de bank, zonder de chat: zelfde weg als de
   * chat (upload-opslag, dan de media-map van de site). Audio staat daarna
   * meteen online, dus de link is direct te kopiëren. */
  async function uploaden(bestand: File) {
    if (upload) return;
    setFout(null);
    if (!/\.(mp3|m4a|aac|ogg|wav)$/i.test(bestand.name)) {
      setFout("Alleen audio: mp3, m4a, aac, ogg of wav.");
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
      setUpload("In je audiobank zetten...");
      const r = (await fetch("/api/audiobank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, blobUrl: blob.url, naam: bestand.name }),
      }).then((x) => x.json())) as { naam?: string; adres?: string | null; live?: boolean; error?: string };
      if (!r.naam) throw new Error(r.error ?? "Opslaan lukte niet");
      const naam = r.naam;
      setAudio((a) => [naam, ...(a ?? []).filter((x) => x !== naam)]);
      setLinks((l) => ({ ...l, [naam]: { adres: r.adres ?? null, live: Boolean(r.live) } }));
      setNieuw(naam);
    } catch (e) {
      setFout(`Uploaden lukte niet: ${e instanceof Error ? e.message : "onbekende fout"}. Probeer het zo nog eens.`);
    } finally {
      setUpload(null);
    }
  }

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
          <OpenbaarMelding voorbeelden="zoals een opname van een gesprek met een klant" />
          <UploadKnop label="⬆ Audio uploaden (mp3, m4a)" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/wav,.mp3,.m4a,.aac,.ogg,.wav" bezig={upload} onKies={(l) => void uploaden(l[0])} />
          <Zoekveld waarde={zoek} onWijzig={setZoek} aantal={audio?.length ?? 0} />
          {fout && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{fout}</p>}
          {audio === null && !fout && <p className="text-sm text-stone-500">Even kijken wat er staat...</p>}
          {audio && audio.length > 0 && zoek && zoekOpNaam(audio, zoek, (n) => n).length === 0 && (
            <p className="text-sm text-stone-500">Niets gevonden met &ldquo;{zoek}&rdquo;.</p>
          )}
          {audio?.length === 0 && (
            <p className="text-sm text-stone-500">
              Nog geen audio. Upload hierboven een mp3 of m4a (bijvoorbeeld een podcastaflevering), of stuur hem mee in de chat via de 📎.
            </p>
          )}
          {(audio?.length ?? 0) > 1 && (
            <label className="flex items-center gap-2 text-xs text-stone-600">
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
          {zoekOpNaam((opNaam && audio ? [...audio].sort((a, b) => a.localeCompare(b)) : audio) ?? [], zoek, (n) => n).map((naam) => (
            <div key={naam} className={`rounded-2xl border p-3 ${nieuw === naam ? "border-violet-400 bg-violet-50/60" : "border-stone-200"}`}>
              <p className="mb-2 truncate text-sm font-medium text-stone-800" title={naam}>
                {nieuw === naam && <span className="mr-1.5 rounded-full bg-violet-700 px-1.5 py-0.5 text-[10px] font-bold text-white">Nieuw</span>}
                {naam}
              </p>
              <audio
                controls
                preload="none"
                className="mb-2 w-full"
                src={`/api/audiobank?siteId=${siteId}&bestand=${encodeURIComponent(naam)}`}
              />
              <div className="flex flex-wrap items-center gap-2">
                <KopieerLink adres={links[naam]?.adres} live={links[naam]?.live} />
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
