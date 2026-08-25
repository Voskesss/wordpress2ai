"use client";

import { useEffect, useRef, useState } from "react";

type Bericht = {
  rol: "klant" | "assistent";
  tekst: string;
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

export default function Chat({
  siteId,
  historie,
  liveUrl,
  openConcept,
}: {
  siteId: number;
  historie: Bericht[];
  liveUrl?: string | null;
  openConcept?: Concept;
}) {
  const [berichten, setBerichten] = useState<Bericht[]>(historie);
  const [invoer, setInvoer] = useState("");
  const [bezig, setBezig] = useState(false);
  const [statusTekst, setStatusTekst] = useState<string | null>(null);
  const [afbeelding, setAfbeelding] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [huidigePagina, setHuidigePagina] = useState("/");
  const [concept, setConcept] = useState<Concept | null>(
    openConcept
      ? { ...openConcept, paginas: openConcept.paginas.map(paginaLabel) }
      : null
  );
  const [toonConcept, setToonConcept] = useState(Boolean(openConcept));
  const [conceptActie, setConceptActie] = useState<string | null>(null);
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

  const conceptBeschikbaar = concept?.previewUrl != null;
  const basisUrl =
    toonConcept && conceptBeschikbaar
      ? concept!.previewUrl!
      : liveUrl
        ? `https://${liveUrl}`
        : null;

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
        },
      ]);
      if (data.previewUrl && data.changeId) {
        setConcept({
          changeId: data.changeId,
          previewUrl: data.previewUrl,
          prompt: data.prompt ?? "",
          paginas: (data.bestanden ?? []).map(paginaLabel),
        });
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
      setConcept(null);
      setToonConcept(false);
    }
    setConceptActie(null);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px] items-start">
      {/* Linkerkolom: website-viewer */}
      <div className="space-y-4 min-w-0">
        {basisUrl && (
          <div
            className={`rounded-3xl border-2 bg-white shadow-sm overflow-hidden ${
              toonConcept && conceptBeschikbaar
                ? "border-amber-400"
                : "border-stone-200"
            }`}
          >
            <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-2.5 text-sm">
              <div className="flex items-center rounded-full border border-stone-200 p-0.5 text-sm font-medium">
                <button
                  onClick={() => setToonConcept(false)}
                  className={`rounded-full px-3.5 py-1.5 cursor-pointer flex items-center gap-1.5 ${
                    !toonConcept
                      ? "bg-stone-900 text-white"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Live site
                </button>
                {conceptBeschikbaar && (
                  <button
                    onClick={() => setToonConcept(true)}
                    className={`rounded-full px-3.5 py-1.5 cursor-pointer flex items-center gap-1.5 ${
                      toonConcept
                        ? "bg-amber-400 text-stone-900"
                        : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Concept
                  </button>
                )}
              </div>
              <a
                href={basisUrl}
                target="_blank"
                rel="noreferrer"
                className="text-violet-700 font-medium hover:underline shrink-0"
              >
                Open<span className="hidden sm:inline"> in nieuw tabblad</span>
              </a>
            </div>
            {toonConcept && conceptBeschikbaar && (
              <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
                Dit is een <strong>concept</strong> — bezoekers zien dit nog
                niet. Publiceer om het live te zetten.
              </div>
            )}
            <iframe
              src={basisUrl}
              title="Je website"
              className="w-full h-[30rem] xl:h-[42rem] bg-white"
            />
          </div>
        )}
      </div>

      {/* Rechterkolom: concept-panel + chat */}
      <div className="space-y-4 min-w-0">
        {concept && (
          <div className="rounded-3xl border-2 border-amber-400 bg-amber-50 p-5">
            <p className="font-semibold text-amber-950">
              Er staat een concept klaar
            </p>
            {concept.prompt && (
              <p className="mt-2 text-sm text-amber-900">
                Je vroeg: &ldquo;{concept.prompt}&rdquo;
              </p>
            )}
            {concept.paginas.length > 0 && (
              <p className="mt-1 text-sm text-amber-800">
                Aangepast:{" "}
                {concept.paginas.map((p, i) => (
                  <span key={p + i} className="font-medium">
                    {i > 0 && ", "}
                    {p}
                  </span>
                ))}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {conceptBeschikbaar && (
                <button
                  onClick={() => setToonConcept(true)}
                  className="rounded-full border border-amber-500 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 cursor-pointer"
                >
                  Bekijk
                </button>
              )}
              <button
                onClick={() => conceptVerwerken("publiceer")}
                disabled={conceptActie !== null}
                className="rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-600 disabled:opacity-50 cursor-pointer"
              >
                {conceptActie === "publiceer" ? "Bezig..." : "Publiceer"}
              </button>
              <button
                onClick={() => conceptVerwerken("verwerp")}
                disabled={conceptActie !== null}
                className="rounded-full px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 cursor-pointer"
              >
                {conceptActie === "verwerp" ? "Bezig..." : "Verwijder"}
              </button>
            </div>
            <p className="mt-3 text-xs text-amber-700">
              Niet helemaal goed? Typ gewoon in de chat wat er anders moet.
            </p>
          </div>
        )}

        <div className="rounded-3xl border border-stone-200 bg-white shadow-sm flex flex-col h-[26rem] xl:h-[30rem]">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
            {berichten.length === 0 && (
              <p className="text-stone-400 text-sm">
                Klik links door je website en typ wat je aangepast wilt hebben
                — bijvoorbeeld: &ldquo;verander de kop op deze pagina&rdquo;.
              </p>
            )}
            {berichten.map((m, i) => (
              <div
                key={i}
                className={`w-fit max-w-[90%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
                  m.rol === "klant"
                    ? "ml-auto bg-violet-600 text-white rounded-br-sm"
                    : "bg-stone-100 text-stone-800 rounded-bl-sm"
                }`}
              >
                {m.tekst}
              </div>
            ))}
            {bezig && (
              <p className="text-violet-600 text-sm animate-pulse font-medium">
                {statusTekst ?? "Bezig met je wijziging..."}
              </p>
            )}
          </div>
          <div className="border-t border-stone-200 p-3">
            {afbeelding && (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 w-fit">
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
            <div className="flex gap-2">
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
                  <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
                  <circle cx="9" cy="10" r="1.8" fill="currentColor" />
                  <path d="M5 17l4.5-4 3.5 3 2.5-2L19 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <input
                value={invoer}
                onChange={(e) => setInvoer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && verstuur()}
                placeholder={`Wat wil je aanpassen${huidigePagina !== "/" ? ` op ${huidigePagina}` : ""}?`}
                className="flex-1 min-w-0 rounded-full border border-stone-300 px-4 py-2.5 text-base sm:text-sm focus:border-violet-600 focus:outline-none"
                disabled={bezig}
              />
              <button
                onClick={verstuur}
                disabled={bezig}
                aria-label="Verstuur"
                className="shrink-0 rounded-full bg-violet-700 px-3.5 py-2.5 text-white font-semibold text-sm hover:bg-violet-600 disabled:opacity-50 cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M4 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
