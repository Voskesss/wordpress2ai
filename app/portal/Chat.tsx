"use client";

import { useEffect, useRef, useState } from "react";

type Bericht = {
  rol: "klant" | "assistent";
  tekst: string;
  previewUrl?: string | null;
  changeId?: number | null;
  gepubliceerd?: boolean;
};

export default function Chat({
  siteId,
  historie,
  liveUrl,
  openConcept,
}: {
  siteId: number;
  historie: Bericht[];
  liveUrl?: string | null;
  openConcept?: { previewUrl: string | null; changeId: number };
}) {
  const [berichten, setBerichten] = useState<Bericht[]>(historie);
  const [invoer, setInvoer] = useState("");
  const [bezig, setBezig] = useState(false);
  const [statusTekst, setStatusTekst] = useState<string | null>(null);
  const [afbeelding, setAfbeelding] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [huidigePagina, setHuidigePagina] = useState("/");
  const [conceptUrl, setConceptUrl] = useState<string | null>(
    openConcept?.previewUrl ?? null
  );
  const [toonConcept, setToonConcept] = useState(false);
  const [openConceptId, setOpenConceptId] = useState<number | null>(
    openConcept?.changeId ?? null
  );
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "wp2ai-pagina" && typeof e.data.pad === "string") {
        setHuidigePagina(e.data.pad.replace(/^\/preview\/\d+/, "") || "/");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [berichten, bezig]);

  const basisUrl =
    toonConcept && conceptUrl ? conceptUrl : liveUrl ? `https://${liveUrl}` : null;

  async function verstuur() {
    const tekst = invoer.trim();
    if (!tekst || bezig) return;
    setInvoer("");
    const teVersturen = afbeelding;
    setAfbeelding(null);
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
        res = await fetch("/api/chat", { method: "POST", body: form });
      } else {
        res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteId, bericht: tekst, huidigePagina }),
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
            // halve regel, negeren
          }
        }
      }
      const data = klaar ?? {};
      setBerichten((b) => [
        ...b,
        {
          rol: "assistent",
          tekst: data.reply ?? "Er ging iets mis, probeer het opnieuw.",
          previewUrl: data.previewUrl,
          changeId: data.changeId,
        },
      ]);
      if (data.previewUrl) {
        setConceptUrl(data.previewUrl);
        setToonConcept(true);
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

  async function publiceer(changeId: number, index: number) {
    const res = await fetch("/api/publiceer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changeId }),
    });
    if (res.ok) {
      setBerichten((b) =>
        b.map((m, i) => (i === index ? { ...m, gepubliceerd: true } : m))
      );
      setToonConcept(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Website-viewer */}
      {basisUrl && (
        <div className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-2.5 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                  toonConcept && conceptUrl ? "bg-amber-400" : "bg-emerald-500"
                }`}
              />
              <span className="font-medium truncate">
                {toonConcept && conceptUrl ? "Concept-versie" : "Live site"}
              </span>
              <span className="hidden sm:inline text-stone-400 truncate">{huidigePagina}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {conceptUrl && (
                <button
                  onClick={() => setToonConcept(!toonConcept)}
                  className="rounded-full border border-stone-300 px-3 py-1 font-medium hover:border-violet-400 cursor-pointer"
                >
                  {toonConcept ? "Bekijk live site" : "Bekijk concept"}
                </button>
              )}
              <a
                href={basisUrl}
                target="_blank"
                rel="noreferrer"
                className="text-violet-700 font-medium hover:underline"
              >
                Open in nieuw tabblad
              </a>
            </div>
          </div>
          <iframe
            ref={iframeRef}
            src={basisUrl}
            title="Je website"
            className="w-full h-[26rem] bg-white"
          />
        </div>
      )}

      {/* Openstaand concept na herladen */}
      {openConceptId && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3 flex items-center justify-between gap-3 text-sm flex-wrap">
          <span className="font-medium text-amber-900">
            Er staat nog een concept klaar dat niet gepubliceerd is.
          </span>
          <div className="flex gap-2">
            {conceptUrl && (
              <button
                onClick={() => setToonConcept(true)}
                className="rounded-full border border-amber-400 px-4 py-1.5 font-medium hover:border-amber-600 cursor-pointer"
              >
                Bekijk
              </button>
            )}
            <button
              onClick={async () => {
                const res = await fetch("/api/publiceer", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ changeId: openConceptId }),
                });
                if (res.ok) {
                  setOpenConceptId(null);
                  setToonConcept(false);
                }
              }}
              className="rounded-full bg-violet-700 px-4 py-1.5 text-white font-medium hover:bg-violet-600 cursor-pointer"
            >
              Publiceer
            </button>
          </div>
        </div>
      )}

      {/* Chat */}
      <div className="rounded-3xl border border-stone-200 bg-white shadow-sm flex flex-col h-96">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {berichten.length === 0 && (
            <p className="text-stone-400 text-sm">
              Klik hierboven door je website en typ wat je aangepast wilt
              hebben — bijvoorbeeld: &ldquo;verander de kop op deze
              pagina&rdquo;.
            </p>
          )}
          {berichten.map((m, i) => (
            <div key={i}>
              <div
                className={`w-fit max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
                  m.rol === "klant"
                    ? "ml-auto bg-violet-600 text-white rounded-br-sm"
                    : "bg-stone-100 text-stone-800 rounded-bl-sm"
                }`}
              >
                {m.tekst}
              </div>
              {m.previewUrl && (
                <div className="mt-2 flex items-center gap-3 text-sm flex-wrap">
                  <button
                    onClick={() => {
                      setConceptUrl(m.previewUrl!);
                      setToonConcept(true);
                    }}
                    className="text-violet-700 underline font-medium cursor-pointer"
                  >
                    Bekijk het concept
                  </button>
                  {m.changeId &&
                    (m.gepubliceerd ? (
                      <span className="text-emerald-700 font-medium">
                        Gepubliceerd —{" "}
                        {liveUrl ? (
                          <a
                            href={`https://${liveUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            binnen 2 minuten live
                          </a>
                        ) : (
                          "staat binnen 2 minuten live"
                        )}
                      </span>
                    ) : (
                      <button
                        onClick={() => publiceer(m.changeId!, i)}
                        className="rounded-full bg-violet-700 px-4 py-1.5 text-white font-medium hover:bg-violet-600 cursor-pointer"
                      >
                        Publiceer
                      </button>
                    ))}
                </div>
              )}
            </div>
          ))}
          {bezig && (
            <p className="text-violet-600 text-sm animate-pulse font-medium">
              {statusTekst ?? "Bezig met je wijziging..."}
            </p>
          )}
        </div>
        <div className="border-t border-stone-200 p-4">
          {afbeelding && (
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(afbeelding)}
                alt="Gekozen afbeelding"
                className="h-12 w-12 rounded-lg object-cover"
              />
              <span className="text-sm text-stone-600 max-w-[12rem] truncate">
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
          <div className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setAfbeelding(e.target.files?.[0] ?? null)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={bezig}
            aria-label="Afbeelding toevoegen"
            title="Afbeelding toevoegen"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-stone-300 hover:border-violet-400 disabled:opacity-50 cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="2"/>
              <circle cx="9" cy="10" r="1.8" fill="currentColor"/>
              <path d="M5 17l4.5-4 3.5 3 2.5-2L19 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <input
            value={invoer}
            onChange={(e) => setInvoer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && verstuur()}
            placeholder={`Wat wil je aanpassen${huidigePagina !== "/" ? ` op ${huidigePagina}` : ""}?`}
            className="flex-1 min-w-0 rounded-full border border-stone-300 px-4 sm:px-5 py-2.5 text-sm focus:border-violet-600 focus:outline-none"
            disabled={bezig}
          />
          <button
            onClick={verstuur}
            disabled={bezig}
            className="shrink-0 rounded-full bg-violet-700 px-4 sm:px-6 py-2.5 text-white font-semibold text-sm hover:bg-violet-600 disabled:opacity-50 cursor-pointer"
          >
            Verstuur
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
