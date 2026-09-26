"use client";

import { useEffect, useState } from "react";

type Gegevens = {
  bestand: string;
  titel: string;
  omschrijving: string;
  adres: string;
  deelKop?: string;
  deelTekst?: string;
  deelFoto?: string;
};

/** Paneel waarin de eigenaar zelf de vindbaarheid van de huidige pagina regelt:
 * paginatitel, omschrijving voor Google, het webadres (met 301 en linkfix) en
 * het deel-voorbeeld (hoe de pagina eruitziet als iemand hem deelt via
 * WhatsApp/Facebook). Voor bedrijfsgegevens en alt-teksten stuurt het paneel
 * door naar de chat: dat is inhoudelijk werk, geen formulierwerk. */
export default function Vindbaarheid({
  siteId,
  pad,
  domein,
  previewAccess,
  beeldBasis,
  onKlaar,
  onSluit,
  onOpdracht,
}: {
  siteId: number;
  pad: string;
  domein?: string | null;
  /** Voor de miniaturen bij het foto-kiezen (zelfde bron als de fotobank) */
  previewAccess?: string | null;
  beeldBasis?: string | null;
  onKlaar: (data: {
    reply?: string;
    previewUrl?: string;
    changeId?: number;
    bestanden?: string[];
    nieuwAdres?: string;
  }) => void;
  onSluit: () => void;
  /** Zet een kant-en-klare opdracht in het chatveld (bedrijfsgegevens, alt-teksten) */
  onOpdracht?: (tekst: string) => void;
}) {
  const [gegevens, setGegevens] = useState<Gegevens | null>(null);
  const [titel, setTitel] = useState("");
  const [omschrijving, setOmschrijving] = useState("");
  const [adres, setAdres] = useState("");
  const [deelKop, setDeelKop] = useState("");
  const [deelTekst, setDeelTekst] = useState("");
  const [deelFoto, setDeelFoto] = useState("");
  const [deelOpen, setDeelOpen] = useState(false);
  const [fotoKiezer, setFotoKiezer] = useState(false);
  const [fotos, setFotos] = useState<{ pad: string }[] | null>(null);
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
      setDeelKop(data.deelKop ?? "");
      setDeelTekst(data.deelTekst ?? "");
      setDeelFoto(data.deelFoto ?? "");
      // Staat er al een deel-voorbeeld, laat het blok dan meteen open
      if (data.deelKop || data.deelFoto) setDeelOpen(true);
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
          // Alleen meesturen als het blok is opengeklapt: anders raak je
          // per ongeluk tags kwijt die er al stonden
          ...(deelOpen ? { deelKop, deelTekst, deelFoto } : {}),
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
    // Overlay over de hele pagina (wens Jos 26-09): het paneel groeide met
    // het delen-blok uit zijn vak in de chatkolom en de bovenkant was dan
    // niet meer bereikbaar. Scrollen gebeurt bínnen de kaart, dus dit werkt
    // ook op een klein scherm. Onder de aankondigingen (z-90), boven de
    // schermvullende chat (z-80).
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-stone-900/40 p-4"
      role="dialog"
      aria-label="Vindbaarheid van deze pagina"
      onClick={onSluit}
    >
    <div
      className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-violet-300 bg-white p-4 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
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

          {/* Deel-voorbeeld: hoe de pagina eruitziet als iemand hem deelt
              via WhatsApp/Facebook/LinkedIn (og-tags). Zonder deze velden
              vallen deel-apps terug op de titel en omschrijving hierboven. */}
          <div className="mt-3 rounded-xl border border-stone-200 p-3">
            <button
              onClick={() => setDeelOpen((v) => !v)}
              className="flex w-full items-center justify-between text-left text-xs font-semibold cursor-pointer"
            >
              <span>📲 Delen via WhatsApp en Facebook</span>
              <span className="text-stone-400">{deelOpen ? "▲" : "▼"}</span>
            </button>
            {deelOpen && (
              <>
                <p className="mt-1 text-[11px] text-stone-500">
                  Zo ziet het kaartje eruit als iemand deze pagina deelt. Laat je dit leeg, dan gebruiken WhatsApp en Facebook de titel en omschrijving hierboven, zonder eigen foto.
                </p>
                <div className="mt-2 overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                  {deelFoto && (previewAccess || beeldBasis) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewAccess ? `/site-weergave/${previewAccess}/${deelFoto}` : `https://${beeldBasis}/${deelFoto}`}
                      alt=""
                      className="h-28 w-full bg-stone-100 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 items-center justify-center text-[11px] text-stone-400">nog geen foto gekozen</div>
                  )}
                  <div className="p-2">
                    <p className="truncate text-xs font-semibold text-stone-800">{deelKop || titel || "(geen kop)"}</p>
                    <p className="line-clamp-2 text-[11px] text-stone-500">{deelTekst || omschrijving}</p>
                    <p className="text-[10px] uppercase text-stone-400">{site}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={async () => {
                      setFotoKiezer((v) => !v);
                      if (!fotos) {
                        const res = await fetch(`/api/fotobank?siteId=${siteId}`).catch(() => null);
                        const data = (await res?.json().catch(() => null)) as { afbeeldingen?: { pad: string }[] } | null;
                        setFotos(data?.afbeeldingen ?? []);
                      }
                    }}
                    className="rounded-full border border-violet-300 px-3 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-50 cursor-pointer"
                  >
                    {deelFoto ? "Andere foto kiezen" : "Foto kiezen uit je fotobank"}
                  </button>
                  {deelFoto && (
                    <button
                      onClick={() => setDeelFoto("")}
                      className="rounded-full border border-stone-200 px-3 py-1 text-[11px] text-stone-500 hover:border-red-300 hover:text-red-600 cursor-pointer"
                    >
                      Foto weghalen
                    </button>
                  )}
                </div>
                {fotoKiezer && (
                  <div className="mt-2 grid max-h-40 grid-cols-4 gap-1.5 overflow-y-auto">
                    {fotos === null && <p className="col-span-4 text-[11px] text-stone-400">Even ophalen...</p>}
                    {fotos?.length === 0 && <p className="col-span-4 text-[11px] text-stone-400">Nog geen foto&apos;s in je fotobank.</p>}
                    {fotos?.map((f) => (
                      <button
                        key={f.pad}
                        onClick={() => {
                          setDeelFoto(f.pad);
                          setFotoKiezer(false);
                        }}
                        title={f.pad}
                        className={`overflow-hidden rounded-lg border cursor-pointer ${deelFoto === f.pad ? "border-violet-600" : "border-stone-200 hover:border-violet-300"}`}
                      >
                        {previewAccess || beeldBasis ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewAccess ? `/site-weergave/${previewAccess}/${f.pad}` : `https://${beeldBasis}/${f.pad}`}
                            alt={f.pad}
                            loading="lazy"
                            className="h-14 w-full bg-stone-100 object-cover"
                          />
                        ) : (
                          <span className="block h-14 bg-stone-100" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <label className="mt-2 block text-xs font-semibold">
                  Kop op het kaartje
                  <input
                    value={deelKop}
                    onChange={(e) => setDeelKop(e.target.value)}
                    placeholder={titel}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-violet-600 focus:outline-none"
                  />
                </label>
                <label className="mt-2 block text-xs font-semibold">
                  Tekst op het kaartje
                  <textarea
                    value={deelTekst}
                    onChange={(e) => setDeelTekst(e.target.value)}
                    rows={2}
                    placeholder={omschrijving}
                    className="mt-1 w-full resize-none rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-violet-600 focus:outline-none"
                  />
                </label>
              </>
            )}
          </div>

          {/* Inhoudelijk werk gaat via de chat: openingstijden in gewone
              taal en omschrijven wat er op een foto staat kan de AI beter
              dan een formulier. */}
          {onOpdracht && (
            <div className="mt-2 flex flex-wrap gap-2">
              {isHome && (
                <button
                  onClick={() => onOpdracht("Zet mijn bedrijfsgegevens klaar voor Google (naam, adres, telefoonnummer en openingstijden). Vraag me eerst wat je nog niet zeker weet.")}
                  className="rounded-full border border-violet-300 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 cursor-pointer"
                >
                  📇 Bedrijfsgegevens voor Google
                </button>
              )}
              <button
                onClick={() => onOpdracht("Controleer of alle foto's op mijn site een goede alt-tekst hebben en vul de ontbrekende aan.")}
                className="rounded-full border border-violet-300 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 cursor-pointer"
              >
                🖼️ Alt-teksten controleren
              </button>
            </div>
          )}

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
    </div>
  );
}
