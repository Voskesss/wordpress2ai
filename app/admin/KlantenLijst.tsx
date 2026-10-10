"use client";

import Link from "next/link";
import { useState } from "react";
import { VerbruikBalk } from "./VerbruikBalk";
import { dagenSinds, geleden } from "@/lib/geleden";

export type KlantRij = {
  id: number;
  naam: string;
  domein: string | null;
  status: string;
  isDemo: boolean;
  eigen: boolean;
  livegang: { klaar: number; totaal: number } | null;
  openConcepten: number;
  /** AI-verbruik deze maand en het maandbudget, in dollars (zoals ai_kosten) */
  aiUsd: number;
  budgetUsd: number;
  /** YYYY-MM-DD: opgezegd, website mag na deze datum offline */
  offlineNa: string | null;
  /** Is er een klantaccount gekoppeld (anders zegt "laatst ingelogd" niets) */
  gekoppeld: boolean;
  /** ISO-tijd: laatst in het portaal (Clerk) en laatste chatbericht van de klantkant */
  laatstInPortaal: string | null;
  laatsteChat: string | null;
  /** De inlogdienst gaf geen antwoord: dan tonen we "onbekend", niet "nooit" */
  portaalOnbekend?: boolean;
};

/** Eén regel activiteit: wanneer in het portaal, wanneer de chat gebruikt.
 * Grijs als het recent is, oranje na een maand stilte, zodat stille klanten opvallen. */
function Activiteit({ r }: { r: KlantRij }) {
  if (!r.gekoppeld) return <p className="mt-0.5 text-[11px] text-stone-400">nog geen klantaccount gekoppeld</p>;
  const stuk = (icoon: string, wat: string, iso: string | null) => {
    const d = dagenSinds(iso);
    const stil = d === null || d > 30;
    return (
      <span
        title={iso ? `${wat}: ${new Date(iso).toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })}` : `${wat}: nog nooit`}
        className={stil ? "text-amber-700" : "text-stone-500"}
      >
        {icoon} {wat} {geleden(iso)}
      </span>
    );
  };
  return (
    <p data-activiteit className="mt-0.5 flex flex-wrap gap-x-3 text-[11px]">
      {r.portaalOnbekend ? <span className="text-stone-400">👤 portaal onbekend</span> : stuk("👤", "portaal", r.laatstInPortaal)}
      {stuk("💬", "chat", r.laatsteChat)}
    </p>
  );
}

/** Klantenlijst in groepen (live, migratie, overig), compact en doorzoekbaar. */
export default function KlantenLijst({ rijen }: { rijen: KlantRij[] }) {
  const [zoek, setZoek] = useState("");
  // Volgorde binnen de groepen: zoals altijd, of wie het langst niets liet zien bovenaan
  const [volgorde, setVolgorde] = useState<"standaard" | "stil">("standaard");
  const q = zoek.trim().toLowerCase();
  const gezocht = q ? rijen.filter((r) => `${r.naam} ${r.domein ?? ""}`.toLowerCase().includes(q)) : rijen;
  const laatsteTeken = (r: KlantRij) => Math.max(r.laatstInPortaal ? Date.parse(r.laatstInPortaal) : 0, r.laatsteChat ? Date.parse(r.laatsteChat) : 0);
  const gevonden = volgorde === "stil" ? [...gezocht].sort((a, b) => laatsteTeken(a) - laatsteTeken(b)) : gezocht;

  const groepen: { titel: string; uitleg: string; rijen: KlantRij[]; dicht?: boolean }[] = [
    // Live eerst: de klanten die er al zijn (wens Jos, 02-10-2026)
    {
      titel: "✅ Live",
      uitleg: "draait op het eigen domein",
      rijen: gevonden.filter((r) => !r.isDemo && !r.eigen && r.status === "actief" && !r.offlineNa),
    },
    {
      titel: "🚀 In migratie",
      uitleg: "wordt overgezet of wacht op livegang",
      rijen: gevonden.filter((r) => !r.isDemo && !r.eigen && r.status === "migratie"),
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
      <label className="mt-2 flex items-center gap-2 text-xs text-stone-600 sm:ml-3 sm:mt-0 sm:inline-flex">
        Volgorde
        <select
          value={volgorde}
          onChange={(e) => setVolgorde(e.target.value as "standaard" | "stil")}
          className="rounded-xl border border-stone-300 bg-white px-2 py-1.5 text-xs focus:border-violet-500 focus:outline-none"
        >
          <option value="standaard">Standaard</option>
          <option value="stil">Langst stil bovenaan</option>
        </select>
      </label>
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
                          </p>
                          {!r.isDemo && !r.eigen && <Activiteit r={r} />}
                          <VerbruikBalk gebruikt={r.aiUsd} budget={r.budgetUsd} />
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
