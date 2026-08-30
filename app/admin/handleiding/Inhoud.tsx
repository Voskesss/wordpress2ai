"use client";

import { useState } from "react";

type Sectie = { kop: string; blokken: { titel: string; tekst: string }[] };

/** Handleiding met zoekveld: filtert live op kop, titel en tekst. */
export default function Inhoud({ secties }: { secties: Sectie[] }) {
  const [zoek, setZoek] = useState("");
  const term = zoek.trim().toLowerCase();

  const gefilterd = term
    ? secties
        .map((s) => ({
          ...s,
          blokken: s.blokken.filter(
            (b) =>
              s.kop.toLowerCase().includes(term) ||
              b.titel.toLowerCase().includes(term) ||
              b.tekst.toLowerCase().includes(term)
          ),
        }))
        .filter((s) => s.blokken.length > 0)
    : secties;

  const anker = (kop: string) => kop.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  /** Zoekterm geel markeren in de tekst. */
  const markeer = (tekst: string) => {
    if (!term) return tekst;
    const delen = tekst.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return delen.map((d, i) =>
      d.toLowerCase() === term ? (
        <mark key={i} className="rounded bg-amber-200 px-0.5">{d}</mark>
      ) : (
        d
      )
    );
  };

  return (
    <>
      <input
        type="search"
        value={zoek}
        onChange={(e) => setZoek(e.target.value)}
        placeholder="🔍 Zoek in de handleiding… (bijv. e-mail, domein, webhook)"
        className="mt-6 w-full rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-100"
      />

      {!term && (
        <nav className="mt-4 flex flex-wrap gap-2">
          {secties.map((s) => (
            <a
              key={s.kop}
              href={`#${anker(s.kop)}`}
              className="rounded-full border border-stone-300 px-3.5 py-1.5 text-sm text-stone-600 hover:border-violet-400 hover:text-violet-700"
            >
              {s.kop}
            </a>
          ))}
        </nav>
      )}

      {term && gefilterd.length === 0 && (
        <p className="mt-8 text-stone-500">
          Niets gevonden voor &ldquo;{zoek}&rdquo; — probeer een ander woord.
        </p>
      )}

      <div className="mt-8 space-y-12">
        {gefilterd.map((s) => (
          <section key={s.kop} id={anker(s.kop)}>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {s.kop}
            </h2>
            <div className="mt-4 space-y-4">
              {s.blokken.map((b) => (
                <div
                  key={b.titel}
                  className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="font-semibold">{markeer(b.titel)}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-stone-600 whitespace-pre-line">
                    {markeer(b.tekst)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
