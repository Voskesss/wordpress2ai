"use client";

import { useState } from "react";

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
}: {
  siteId: number;
  historie: Bericht[];
}) {
  const [berichten, setBerichten] = useState<Bericht[]>(historie);
  const [invoer, setInvoer] = useState("");
  const [bezig, setBezig] = useState(false);

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
        body: JSON.stringify({ siteId, bericht: tekst }),
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
    }
  }

  return (
    <div className="rounded-3xl border border-stone-200 bg-white shadow-sm flex flex-col h-[32rem]">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {berichten.length === 0 && (
          <p className="text-stone-400 text-sm">
            Typ wat je aangepast wilt hebben, bijvoorbeeld: &ldquo;zet ons
            nieuwe telefoonnummer op de contactpagina&rdquo;.
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
              <div className="mt-2 flex items-center gap-3 text-sm">
                <a
                  href={m.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-violet-700 underline font-medium"
                >
                  Bekijk het concept
                </a>
                {m.changeId &&
                  (m.gepubliceerd ? (
                    <span className="text-emerald-700 font-medium">
                      Gepubliceerd — staat binnen 2 minuten live
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
          placeholder="Wat wil je aanpassen?"
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
  );
}
