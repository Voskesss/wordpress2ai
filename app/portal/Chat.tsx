"use client";

import { useEffect, useRef, useState } from "react";

type Bericht = {
  rol: "klant" | "assistent";
  tekst: string;
  metVerversTip?: boolean;
};

type Concept = {
  changeId: number;
  previewUrl: string | null;
  prompt: string;
  paginas: string[];
};

function paginaLabel(pad: string) {
  const naam = pad.split("/").pop() ?? pad;
  if (naam === "index.html") return "homepage";
  if (naam.endsWith(".css")) return "vormgeving";
  return naam.replace(/\.html?$/, "");
}

type Selectie = { pad: string; tag: string; tekst: string; html: string };

export default function Chat({
  siteId,
  historie,
  liveUrl,
  werkversieUrl,
  openConcept,
  suggesties,
}: {
  siteId: number;
  historie: Bericht[];
  liveUrl?: string | null;
  werkversieUrl?: string | null;
  openConcept?: Concept;
  suggesties?: string[];
}) {
  const [berichten, setBerichten] = useState<Bericht[]>(historie);
  const [invoer, setInvoer] = useState("");
  const [bezig, setBezig] = useState(false);
  const [statusTekst, setStatusTekst] = useState<string | null>(null);
  const [afbeelding, setAfbeelding] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [huidigePagina, setHuidigePagina] = useState("/");
  const huidigeRef = useRef("/");
  const [concept, setConcept] = useState<Concept | null>(
    openConcept
      ? { ...openConcept, paginas: openConcept.paginas.map(paginaLabel) }
      : null
  );
  const [chatOpen, setChatOpen] = useState(false);
  // Aandachttrekker voor nieuwe gebruikers; verdwijnt zodra er getypt wordt.
  const [hintWeg, setHintWeg] = useState(false);
  const toonHint = !hintWeg && berichten.length === 0 && !bezig && !chatOpen;
  const [reloadTeller, setReloadTeller] = useState(0);
  const [conceptActie, setConceptActie] = useState<string | null>(null);
  const [apparaat, setApparaat] = useState<"telefoon" | "tablet" | "desktop">(
    "desktop"
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [schaal, setSchaal] = useState(1);
  const [aanwijzen, setAanwijzen] = useState(false);
  const [selectie, setSelectie] = useState<Selectie | null>(null);
  const [suggestiesOpen, setSuggestiesOpen] = useState(false);

  function meldAanwijzen(aan: boolean) {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "wp2ai-aanwijzen", aan },
      "*"
    );
  }

  function zetAanwijzen(aan: boolean) {
    setAanwijzen(aan);
    meldAanwijzen(aan);
  }

  function basisVoor(conceptActief: boolean) {
    return conceptActief && werkversieUrl
      ? `https://${werkversieUrl}/`
      : liveUrl
        ? `https://${liveUrl}/`
        : `/site-weergave/${siteId}/`;
  }
  const [iframeSrc, setIframeSrc] = useState(() => basisVoor(Boolean(openConcept)));

  /** Herlaadt het voorbeeld op de pagina waar de eigenaar nu naar kijkt. */
  function herlaad(conceptActief: boolean) {
    const pad =
      huidigeRef.current === "/" ? "" : huidigeRef.current.replace(/^\//, "");
    setIframeSrc(basisVoor(conceptActief) + pad);
    setReloadTeller((t) => t + 1);
  }

  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const meet = () => setSchaal(Math.min(1, el.clientWidth / 1280));
    meet();
    const ro = new ResizeObserver(meet);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "wp2ai-pagina" && typeof e.data.pad === "string") {
        const pad = e.data.pad.replace(/^\/preview\/\d+/, "") || "/";
        setHuidigePagina(pad);
        huidigeRef.current = pad;
      }
      if (e.data?.type === "wp2ai-selectie") {
        setSelectie({
          pad: String(e.data.pad ?? "/"),
          tag: String(e.data.tag ?? ""),
          tekst: String(e.data.tekst ?? ""),
          html: String(e.data.html ?? ""),
        });
        setAanwijzen(false);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [berichten, bezig, chatOpen]);

  async function verstuur() {
    const tekst = invoer.trim();
    if (!tekst || bezig) return;
    setInvoer("");
    setChatOpen(true);
    const teVersturen = afbeelding;
    setAfbeelding(null);
    const gekozen = selectie;
    setSelectie(null);
    setBerichten((b) => [
      ...b,
      { rol: "klant", tekst: teVersturen ? `\u{1F4CE} ${tekst}` : tekst },
    ]);
    setBezig(true);
    setStatusTekst(teVersturen ? "Ik verwerk je afbeelding..." : "Even nadenken...");
    try {
      let res: Response;
      if (teVersturen) {
        const form = new FormData();
        form.set("siteId", String(siteId));
        form.set("bericht", tekst);
        form.set("huidigePagina", huidigePagina);
        form.set("afbeelding", teVersturen);
        if (gekozen) form.set("selectie", JSON.stringify(gekozen));
        res = await fetch("/api/chat", { method: "POST", body: form });
      } else {
        res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteId,
            bericht: tekst,
            huidigePagina,
            selectie: gekozen ?? undefined,
          }),
        });
      }
      if (!res.body) throw new Error("geen stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let klaar: {
        reply?: string;
        previewUrl?: string | null;
        changeId?: number | null;
        bestanden?: string[];
        prompt?: string;
      } | null = null;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const regels = buffer.split("\n");
        buffer = regels.pop() ?? "";
        for (const regel of regels) {
          if (!regel.trim()) continue;
          try {
            const event = JSON.parse(regel);
            if (event.type === "status") setStatusTekst(event.tekst);
            if (event.type === "klaar") klaar = event;
          } catch {
            // halve regel
          }
        }
      }
      const data = klaar ?? {};
      setBerichten((b) => [
        ...b,
        {
          rol: "assistent",
          tekst: data.reply ?? "Er ging iets mis, probeer het opnieuw.",
          metVerversTip: Boolean(data.previewUrl && data.changeId),
        },
      ]);
      if (data.previewUrl && data.changeId) {
        setConcept({
          changeId: data.changeId,
          previewUrl: data.previewUrl,
          prompt: data.prompt ?? "",
          paginas: (data.bestanden ?? []).map(paginaLabel),
        });
        herlaad(true);
      }
    } catch {
      setBerichten((b) => [
        ...b,
        { rol: "assistent", tekst: "Er ging iets mis, probeer het opnieuw." },
      ]);
    } finally {
      setBezig(false);
      setStatusTekst(null);
    }
  }

  async function conceptVerwerken(actie: "publiceer" | "verwerp") {
    if (!concept || conceptActie) return;
    setConceptActie(actie);
    const res = await fetch(`/api/${actie}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changeId: concept.changeId }),
    });
    if (res.ok) {
      setBerichten((b) => [
        ...b,
        {
          rol: "assistent",
          tekst:
            actie === "publiceer"
              ? "Gepubliceerd! Binnen 2 minuten staat het op je echte website."
              : "Het concept is verwijderd. Je website blijft zoals hij was.",
        },
      ]);
      setChatOpen(true);
      setConcept(null);
      herlaad(false);
    }
    setConceptActie(null);
  }

  return (
    <div className="min-w-0">
      <div
        className={`relative rounded-3xl border-2 bg-white shadow-sm overflow-hidden ${
          concept ? "border-amber-400" : "border-stone-200"
        }`}
      >
        {/* Bovenbalk */}
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-2.5 text-sm">
          {concept ? (
            <span className="flex items-center gap-2 rounded-full bg-amber-50 border border-amber-300 px-3.5 py-1.5 text-sm font-medium text-amber-900">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Concept — nog niet zichtbaar voor bezoekers
            </span>
          ) : (
            <span className="flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-sm font-medium text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Gelijk aan de live site
            </span>
          )}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => herlaad(Boolean(concept))}
              aria-label="Voorbeeld verversen"
              title="Voorbeeld verversen"
              className="flex h-8 items-center gap-1.5 rounded-full border border-stone-200 px-3 text-sm font-medium text-stone-500 hover:border-violet-400 hover:text-violet-700 cursor-pointer"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Ververs
            </button>
            <div className="hidden md:flex items-center gap-1 rounded-full border border-stone-200 p-0.5">
              {(
                [
                  ["telefoon", "M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm4 17.2h.01"],
                  ["tablet", "M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm6 17h.01"],
                  ["desktop", "M3 4h18v12H3zM9 20h6m-3-4v4"],
                ] as const
              ).map(([naam, pad]) => (
                <button
                  key={naam}
                  onClick={() => setApparaat(naam)}
                  aria-label={`Bekijk op ${naam}`}
                  title={`Bekijk op ${naam}`}
                  className={`flex h-8 w-8 items-center justify-center rounded-full cursor-pointer ${
                    apparaat === naam
                      ? "bg-stone-900 text-white"
                      : "text-stone-400 hover:text-stone-700"
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d={pad} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>
            {liveUrl && (
              <a
                href={`https://${liveUrl}`}
                target="_blank"
                rel="noreferrer"
                className="text-violet-700 font-medium hover:underline"
              >
                Open live site
              </a>
            )}
          </div>
        </div>

        {/* Website-viewer */}
        <div
          ref={viewerRef}
          className={`h-[calc(100vh-15rem)] min-h-[32rem] ${
            apparaat === "desktop"
              ? "overflow-hidden"
              : "bg-stone-100 flex justify-center overflow-y-auto py-6"
          }`}
        >
          {apparaat === "desktop" ? (
            // Echte desktop-breedte (1280px), geschaald naar het venster
            <iframe
              key={reloadTeller}
              ref={iframeRef}
              src={iframeSrc}
              title="Je website"
              onLoad={() => aanwijzen && meldAanwijzen(true)}
              style={{
                width: 1280,
                height: `${100 / schaal}%`,
                transform: `scale(${schaal})`,
                transformOrigin: "top left",
              }}
              className="bg-white"
            />
          ) : (
            <iframe
              key={reloadTeller}
              ref={iframeRef}
              src={iframeSrc}
              title="Je website"
              onLoad={() => aanwijzen && meldAanwijzen(true)}
              className={
                apparaat === "tablet"
                  ? "w-[768px] max-w-full h-[1024px] shrink-0 bg-white rounded-2xl border-8 border-stone-800 shadow-xl"
                  : "w-[375px] h-[812px] shrink-0 bg-white rounded-[2rem] border-8 border-stone-800 shadow-xl"
              }
            />
          )}
        </div>

        {/* Zwevend chatpaneel over de preview */}
        <div className="absolute bottom-4 left-1/2 z-10 w-[min(94%,44rem)] -translate-x-1/2">
          {/* Gespreksvenster (inklapbaar) */}
          {chatOpen && (
            <div className="mb-3 rounded-3xl border border-stone-200 bg-white/95 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Gesprek
                </span>
                <button
                  onClick={() => setChatOpen(false)}
                  aria-label="Gesprek inklappen"
                  title="Gesprek inklappen"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" transform="rotate(180 12 12)" />
                  </svg>
                </button>
              </div>
              <div ref={scrollRef} className="max-h-72 overflow-y-auto p-4 space-y-3">
                {berichten.length === 0 && !bezig && (
                  <p className="text-stone-400 text-sm">
                    Klik door je website en typ hieronder wat je aangepast wilt
                    hebben — bijvoorbeeld: &ldquo;verander de kop op deze
                    pagina&rdquo;.
                  </p>
                )}
                {berichten.map((m, i) => (
                  <div key={i}>
                    <div
                      className={`w-fit max-w-[90%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
                        m.rol === "klant"
                          ? "ml-auto bg-violet-600 text-white rounded-br-sm"
                          : "bg-stone-100 text-stone-800 rounded-bl-sm"
                      }`}
                    >
                      {m.tekst}
                    </div>
                    {m.metVerversTip && i === berichten.length - 1 && (
                      <button
                        onClick={() => herlaad(Boolean(concept))}
                        className="mt-1.5 flex items-center gap-1.5 rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-500 hover:border-violet-400 hover:text-violet-700 cursor-pointer"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Zie je de wijziging niet? Ververs het voorbeeld
                      </button>
                    )}
                  </div>
                ))}
                {bezig && (
                  <div className="flex w-fit items-center gap-3 rounded-2xl rounded-bl-sm bg-stone-100 px-4 py-3">
                    <span className="flex items-center gap-1" aria-hidden>
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-2 w-2 animate-bounce rounded-full bg-violet-500"
                          style={{ animationDelay: `${i * 150}ms` }}
                        />
                      ))}
                    </span>
                    <span className="text-sm font-medium text-stone-600">
                      {statusTekst ?? "Bezig met je wijziging..."}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Concept-strip */}
          {concept && (
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-amber-400 bg-amber-50/95 px-4 py-2.5 shadow-2xl backdrop-blur">
              <p className="min-w-0 flex-1 text-sm text-amber-950">
                <span className="font-semibold">Concept klaar.</span>{" "}
                {concept.paginas.length > 0 && (
                  <span className="text-amber-800">
                    Aangepast: {concept.paginas.join(", ")}.
                  </span>
                )}{" "}
                Tevreden?
              </p>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => conceptVerwerken("publiceer")}
                  disabled={conceptActie !== null}
                  className="rounded-full bg-violet-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-violet-600 disabled:opacity-50 cursor-pointer"
                >
                  {conceptActie === "publiceer" ? "Bezig..." : "Publiceer"}
                </button>
                <button
                  onClick={() => conceptVerwerken("verwerp")}
                  disabled={conceptActie !== null}
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 cursor-pointer"
                >
                  {conceptActie === "verwerp" ? "Bezig..." : "Verwijder"}
                </button>
              </div>
            </div>
          )}

          {/* Aanwijzer voor nieuwe gebruikers */}
          {toonHint && (
            <div className="pointer-events-none mb-2 flex flex-col items-center">
              <div className="rounded-2xl bg-violet-700 px-5 py-3 text-white shadow-2xl">
                <p className="font-semibold">
                  Hier praat je met je website
                </p>
                <p className="mt-0.5 text-sm text-violet-100">
                  Typ wat je veranderd wilt hebben — bijvoorbeeld:
                  &ldquo;zet de openingstijden op zaterdag tot 17:00&rdquo;
                </p>
              </div>
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                className="mt-1 animate-bounce text-violet-700"
                aria-hidden
              >
                <path d="M12 3v15m0 0l-6-6m6 6l6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}

          {/* Aanwijs-modus actief */}
          {aanwijzen && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border-2 border-violet-500 bg-white/95 px-4 py-2.5 shadow-2xl backdrop-blur">
              <p className="text-sm font-medium text-violet-900">
                Klik in het voorbeeld hierboven op het onderdeel dat je bedoelt.
              </p>
              <button
                onClick={() => zetAanwijzen(false)}
                className="text-sm text-stone-500 hover:text-stone-800 cursor-pointer"
              >
                Annuleer
              </button>
            </div>
          )}

          {/* Aangewezen onderdeel */}
          {selectie && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-violet-300 bg-violet-50/95 px-4 py-2.5 shadow-2xl backdrop-blur">
              <p className="min-w-0 flex-1 truncate text-sm text-violet-900">
                <span className="font-semibold">Aangewezen:</span>{" "}
                {selectie.tekst || `een ${selectie.tag}-onderdeel`}{" "}
                <span className="text-violet-600">
                  ({paginaLabel(selectie.pad === "/" ? "index.html" : selectie.pad)})
                </span>
              </p>
              <button
                onClick={() => setSelectie(null)}
                aria-label="Selectie verwijderen"
                className="text-violet-400 hover:text-violet-800 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Invoerbalk */}
          <div
            className={`rounded-full border bg-white/95 p-1.5 shadow-2xl backdrop-blur ${
              toonHint
                ? "border-violet-500 ring-4 ring-violet-300/50"
                : "border-stone-200"
            }`}
          >
            {afbeelding && (
              <div className="mx-2 mt-1 mb-2 flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(afbeelding)}
                  alt="Gekozen afbeelding"
                  className="h-12 w-12 rounded-lg object-cover"
                />
                <span className="text-sm text-stone-600 max-w-[10rem] truncate">
                  {afbeelding.name}
                </span>
                <button
                  onClick={() => setAfbeelding(null)}
                  aria-label="Afbeelding verwijderen"
                  className="text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              {!chatOpen && berichten.length > 0 && (
                <button
                  onClick={() => setChatOpen(true)}
                  aria-label="Gesprek openen"
                  title="Gesprek openen"
                  className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 cursor-pointer"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M21 12a8 8 0 0 1-8 8H4l2.4-2.9A8 8 0 1 1 21 12z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">
                    {berichten.length}
                  </span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setAfbeelding(e.target.files?.[0] ?? null)}
              />
              <button
                onClick={() => {
                  setHintWeg(true);
                  zetAanwijzen(!aanwijzen);
                }}
                disabled={bezig}
                aria-label="Onderdeel aanwijzen in het voorbeeld"
                title="Klik hierna in het voorbeeld op het onderdeel dat je bedoelt"
                className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium disabled:opacity-50 cursor-pointer ${
                  aanwijzen
                    ? "bg-violet-700 text-white"
                    : "text-stone-500 hover:bg-stone-100"
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M4 4l7.5 16 2-6.5L20 11.5 4 4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
                <span className="hidden sm:inline whitespace-nowrap">Wijs aan</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={bezig}
                aria-label="Afbeelding toevoegen"
                title="Afbeelding toevoegen"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 disabled:opacity-50 cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
                  <circle cx="9" cy="10" r="1.8" fill="currentColor" />
                  <path d="M5 17l4.5-4 3.5 3 2.5-2L19 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <input
                value={invoer}
                onChange={(e) => {
                  setInvoer(e.target.value);
                  if (e.target.value) setHintWeg(true);
                }}
                onFocus={() => {
                  setHintWeg(true);
                  if (berichten.length > 0) setChatOpen(true);
                }}
                onKeyDown={(e) => e.key === "Enter" && verstuur()}
                placeholder={
                  bezig
                    ? (statusTekst ?? "Bezig met je wijziging...")
                    : `Wat wil je aanpassen${huidigePagina !== "/" ? ` op ${paginaLabel(huidigePagina)}` : ""}?`
                }
                className="flex-1 min-w-0 bg-transparent px-2 py-2 text-base sm:text-sm focus:outline-none"
                disabled={bezig}
              />
              <button
                onClick={verstuur}
                disabled={bezig}
                aria-label="Verstuur"
                className="shrink-0 rounded-full bg-violet-700 h-10 w-10 flex items-center justify-center text-white hover:bg-violet-600 disabled:opacity-50 cursor-pointer"
              >
                {bezig ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden>
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M4 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Suggesties onder de invoerbalk */}
          {suggesties && suggesties.length > 0 && !bezig && (
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
              {!suggestiesOpen ? (
                <button
                  onClick={() => {
                    setHintWeg(true);
                    setSuggestiesOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-stone-300 bg-white/95 px-4 py-1.5 text-sm font-medium text-stone-600 shadow-lg backdrop-blur hover:border-violet-400 hover:text-violet-700 cursor-pointer"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M12 3a6 6 0 0 1 3.5 10.9c-.6.5-1 1.2-1 2V17h-5v-1.1c0-.8-.4-1.5-1-2A6 6 0 0 1 12 3zM10 20h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Suggesties — geen idee wat je kunt vragen?
                </button>
              ) : (
                <>
                  {suggesties.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setInvoer(s);
                        setSuggestiesOpen(false);
                      }}
                      className="rounded-full border border-violet-300 bg-white/95 px-4 py-1.5 text-sm font-medium text-violet-800 shadow-lg backdrop-blur hover:bg-violet-50 cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                  <button
                    onClick={() => setSuggestiesOpen(false)}
                    aria-label="Suggesties sluiten"
                    className="rounded-full border border-stone-300 bg-white/95 px-3 py-1.5 text-sm text-stone-500 shadow-lg backdrop-blur hover:text-stone-800 cursor-pointer"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
