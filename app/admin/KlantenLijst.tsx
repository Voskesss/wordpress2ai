"use client";

import Link from "next/link";
import { useState } from "react";

export type KlantRij = {
  id: number;
  naam: string;
  domein: string | null;
  status: string;
  isDemo: boolean;
  eigen: boolean;
  livegang: { klaar: number; totaal: number } | null;
  openConcepten: number;
  wijzigingen: number;
  aiUsd: number;
  /** YYYY-MM-DD: opgezegd, website mag na deze datum offline */
  offlineNa: string | null;
};

/** Klantenlijst in groepen (migratie, live, overig), compact en doorzoekbaar. */
export default function KlantenLijst({ rijen }: { rijen: KlantRij[] }) {
  const [zoek, setZoek] = useState("");
  const q = zoek.trim().toLowerCase();
  const gevonden = q ? rijen.filter((r) => `${r.naam} ${r.domein ?? ""}`.toLowerCase().includes(q)) : rijen;

  const groepen: { titel: string; uitleg: string; rijen: KlantRij[]; dicht?: boolean }[] = [
    {
      titel: "🚀 In migratie",
      uitleg: "wordt overgezet of wacht op livegang",
      rijen: gevonden.filter((r) => !r.isDemo && !r.eigen && r.status === "migratie"),
    },
    {
      titel: "✅ Live",
      uitleg: "draait op het eigen domein",
      rijen: gevonden.filter((r) => !r.isDemo && !r.eigen && r.status === "actief" && !r.offlineNa),
    },
    {
      titel: "⏸ Gepauzeerd of opgezegd",
      uitleg: "",
      rijen: gevonden.filter(
        (r) => !r.isDemo && !r.eigen && (Boolean(r.offlineNa) || (r.status !== "migratie" && r.status !== "actief")),
      ),
    },
    {
      titel: "Demo en eigen site",
      uitleg: "",
      rijen: gevonden.filter((r) => r.isDemo || r.eigen),
      dicht: !q,
    },
  ];

  return (
    <div className="mt-8">
      <input
        type="search"
        value={zoek}
        onChange={(e) => setZoek(e.target.value)}
        placeholder="Zoek op naam of domein…"
        className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none sm:max-w-sm"
      />
      {rijen.length === 0 && (
        <p className="mt-4 rounded-3xl border border-stone-200 bg-white p-8 text-stone-500">
          Nog geen klanten. Start een migratie of maak een klant aan.
        </p>
      )}
      {q && gevonden.length === 0 && <p className="mt-4 text-sm text-stone-500">Niets gevonden voor “{zoek}”.</p>}

      <div className="mt-5 space-y-6">
        {groepen
          .filter((g) => g.rijen.length > 0)
          .map((g) => (
            <details key={g.titel} open={!g.dicht}>
              <summary className="cursor-pointer list-none text-sm font-semibold text-stone-700">
                {g.titel} <span className="font-normal text-stone-400">({g.rijen.length}{g.uitleg ? ` · ${g.uitleg}` : ""})</span>
              </summary>
              <ul className="mt-2 divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
                {g.rijen.map((r) => {
                  const livegangOpen = r.livegang && r.livegang.klaar < r.livegang.totaal;
                  return (
                    <li key={r.id}>
                      <Link
                        href={`/admin/klant/${r.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-stone-900">{r.naam}</p>
                          <p className="truncate text-xs text-stone-500">
                            {r.domein ?? "geen domein"}
                            <span className="hidden sm:inline">
                              {" "}· {r.wijzigingen}/30 wijzigingen{r.aiUsd > 0 ? ` · $${r.aiUsd.toFixed(2)} AI` : ""}
                            </span>
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-xs">
                          {livegangOpen && (
                            <span
                              title="Livegang-checklist: open de klant voor de details"
                              className={`rounded-full border px-2.5 py-0.5 font-medium ${
                                r.status === "actief" ? "border-red-300 bg-red-50 text-red-800" : "border-sky-200 bg-sky-50 text-sky-800"
                              }`}
                            >
                              🚀 {r.livegang!.klaar}/{r.livegang!.totaal}
                            </span>
                          )}
                          {r.offlineNa && (
                            <span
                              title="Opgezegd: dit is de dag waarop de website offline mag"
                              className="rounded-full border border-red-300 bg-red-50 px-2.5 py-0.5 font-medium text-red-800"
                            >
                              🚪 offline na{" "}
                              {new Date(`${r.offlineNa}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                            </span>
                          )}
                          {r.openConcepten > 0 && (
                            <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 font-medium text-amber-800">
                              {r.openConcepten} concept{r.openConcepten === 1 ? "" : "en"}
                            </span>
                          )}
                          <span className="text-lg text-stone-300">›</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </details>
          ))}
      </div>
    </div>
  );
}
