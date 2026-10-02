"use client";

import { useRef, useState } from "react";
import { schoneNaamDelen } from "@/lib/bestandsnaam";

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

/**
 * Vóór het uploaden de naam kiezen. Een bestandsnaam achteraf wijzigen doen
 * we bewust niet: een bestand staat op meerdere pagina's, in meerdere maten en
 * soms in een nieuwsbrief, en dan ontstaan er kapotte plaatjes en links. Dus
 * hier, één keer, goed (Dirk-Jan, 02-10-2026).
 */
export function NaamKiezer({
  bestanden,
  extensie,
  bestaat,
  onUploaden,
  onAnnuleren,
}: {
  bestanden: File[];
  /** De extensie die het bestand op de site krijgt (foto's worden .webp) */
  extensie: (f: File) => string;
  /** Bestaat deze schone naam (zonder map, mét extensie) al in de bank? */
  bestaat: (naamMetExt: string) => boolean;
  onUploaden: (lijst: { bestand: File; naam: string }[]) => void;
  onAnnuleren: () => void;
}) {
  const [namen, setNamen] = useState(() => bestanden.map((f) => schoneNaamDelen(f.name, "bestand").stam));
  const schoon = namen.map((n) => schoneNaamDelen(`${n}.x`, "").stam);
  const volledig = schoon.map((s, i) => `${s}${extensie(bestanden[i])}`);
  const problemen = volledig.map((v, i) =>
    !schoon[i]
      ? "Vul een naam in."
      : bestaat(v)
        ? "Deze naam bestaat al in je bank. Kies een andere, dan blijven bestaande links kloppen."
        : volledig.indexOf(v) !== i
          ? "Twee bestanden hebben dezelfde naam."
          : null,
  );
  const kan = problemen.every((p) => !p);
  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-3">
      <p className="text-sm font-semibold text-stone-800">Kies de naam voor Google</p>
      <p className="mt-0.5 text-xs leading-relaxed text-stone-600">
        Een duidelijke naam, zoals <em>mediation-scheiding-lisse</em>, helpt Google meer dan <em>IMG_2041</em>. Kies hem nu
        goed: achteraf wijzigen kan niet, omdat een bestand op meerdere plekken gebruikt wordt.
      </p>
      <div className="mt-2 space-y-2">
        {bestanden.map((f, i) => (
          <label key={`${f.name}-${i}`} className="block">
            <span className="block truncate text-[11px] text-stone-500">{f.name}</span>
            <span className="mt-0.5 flex items-center gap-1">
              <input
                value={namen[i]}
                onChange={(e) => setNamen((n) => n.map((x, j) => (j === i ? e.target.value : x)))}
                aria-label={`Naam voor ${f.name}`}
                className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm focus:border-violet-600 focus:outline-none"
              />
              <span className="shrink-0 text-xs text-stone-500">{extensie(f)}</span>
            </span>
            {problemen[i] ? (
              <span className="mt-0.5 block text-[11px] text-red-700">{problemen[i]}</span>
            ) : schoon[i] !== namen[i] ? (
              <span className="mt-0.5 block text-[11px] text-stone-500">Wordt: {volledig[i]}</span>
            ) : null}
          </label>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={!kan}
          onClick={() => onUploaden(bestanden.map((bestand, i) => ({ bestand, naam: volledig[i] })))}
          className="rounded-full bg-violet-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-violet-600 disabled:opacity-50 cursor-pointer"
        >
          Uploaden
        </button>
        <button type="button" onClick={onAnnuleren} className="rounded-full border border-stone-300 px-4 py-1.5 text-sm text-stone-600 cursor-pointer">
          Annuleren
        </button>
      </div>
    </div>
  );
}
