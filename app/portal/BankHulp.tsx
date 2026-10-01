"use client";

import { useRef, useState } from "react";

/**
 * Gedeelde onderdelen van de banken (documenten, foto's, video, audio):
 * waarschuwing dat het openbaar is, uploadknop, link kopiëren en zoeken.
 * Eén plek, zodat de vier banken hetzelfde werken en hetzelfde zeggen.
 */

/** Alles in een bank staat op de site: iedereen met de link kan het openen. */
export function OpenbaarMelding({ voorbeelden }: { voorbeelden: string }) {
  return (
    <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
      <strong>Let op: alles wat je hier uploadt is openbaar.</strong> Iedereen met de link kan het openen, en Google
      kan het vinden. Upload dus nooit iets met persoonsgegevens of iets vertrouwelijks, {voorbeelden}.
    </p>
  );
}

/** Uploadknop met verborgen bestandskiezer. `bezig` vervangt het label. */
export function UploadKnop({
  label,
  accept,
  bezig,
  meerdere = false,
  onKies,
}: {
  label: string;
  accept: string;
  bezig: string | null;
  meerdere?: boolean;
  onKies: (bestanden: File[]) => void;
}) {
  const kiezer = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={kiezer}
        type="file"
        accept={accept}
        multiple={meerdere}
        className="hidden"
        onChange={(e) => {
          const lijst = Array.from(e.target.files ?? []);
          if (lijst.length) onKies(lijst);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => kiezer.current?.click()}
        disabled={bezig !== null}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-300 px-4 py-3 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-60 cursor-pointer"
      >
        {bezig ?? label}
      </button>
    </>
  );
}

/** Het vaste webadres naar het klembord. Lukt het klembord niet (oude
 * browser), dan staat het adres eronder om zelf te selecteren. */
export function KopieerLink({ adres, live }: { adres?: string | null; live?: boolean }) {
  const [klaar, setKlaar] = useState(false);
  if (!adres) return null;
  if (!live)
    return (
      <span className="basis-full text-[11px] text-amber-700">
        Nog niet live: de link kun je kopiëren zodra je wijziging gepubliceerd is.
      </span>
    );
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(adres);
          } catch {
            /* het adres staat zichtbaar onder de knop */
          }
          setKlaar(true);
          setTimeout(() => setKlaar(false), 4000);
        }}
        title="Het webadres, om in een mail of nieuwsbrief te plakken"
        className={`rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer ${
          klaar ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-violet-300 text-violet-700 hover:bg-violet-50"
        }`}
      >
        {klaar ? "✓ Link gekopieerd" : "🔗 Link kopiëren"}
      </button>
      {klaar && <span className="basis-full select-all break-all text-[11px] text-emerald-800">{adres}</span>}
    </>
  );
}

/** Zoekveld op naam; verschijnt pas als er iets te zoeken valt. */
export function Zoekveld({ waarde, onWijzig, aantal }: { waarde: string; onWijzig: (w: string) => void; aantal: number }) {
  if (aantal < 2 && !waarde) return null;
  return (
    <input
      type="search"
      value={waarde}
      onChange={(e) => onWijzig(e.target.value)}
      placeholder="Zoek op naam…"
      aria-label="Zoek op naam"
      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-violet-600 focus:outline-none"
    />
  );
}
