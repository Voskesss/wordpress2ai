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
}: {
  siteId: number;
  historie: Bericht[];
  liveUrl?: string | null;
}) {
  const [berichten, setBerichten] = useState<Bericht[]>(historie);
  const [invoer, setInvoer] = useState("");
  const [bezig, setBezig] = useState(false);
  const [huidigePagina, setHuidigePagina] = useState("/");
  const [conceptUrl, setConceptUrl] = useState<string | null>(null);
  const [toonConcept, setToonConcept] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "wp2ai-pagina" && typeof e.data.pad === "string") {
        setHuidigePagina(e.data.pad);
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
    setBerichten((b) => [...b, { rol: "klant", tekst }]);
    setBezig(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, bericht: tekst, huidigePagina }),
      });
      const data = await res.json();
      setBerichten((b) => [
        ...b,
        {
          rol: "assistent",
          tekst: data.reply ?? data.error ?? "Er ging iets mis, probeer het opnieuw.",
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
              <span className="text-stone-400 truncate">{huidigePagina}</span>
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
                className={`w-fit max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
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
            <p className="text-stone-400 text-sm animate-pulse">
              Bezig met je wijziging...
            </p>
          )}
        </div>
        <div className="border-t border-stone-200 p-4 flex gap-3">
          <input
            value={invoer}
            onChange={(e) => setInvoer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && verstuur()}
            placeholder={`Wat wil je aanpassen${huidigePagina !== "/" ? ` op ${huidigePagina}` : ""}?`}
            className="flex-1 rounded-full border border-stone-300 px-5 py-2.5 text-sm focus:border-violet-600 focus:outline-none"
            disabled={bezig}
          />
          <button
            onClick={verstuur}
            disabled={bezig}
            className="rounded-full bg-violet-700 px-6 py-2.5 text-white font-semibold text-sm hover:bg-violet-600 disabled:opacity-50 cursor-pointer"
          >
            Verstuur
          </button>
        </div>
      </div>
    </div>
  );
}
