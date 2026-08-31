"use client";

import { useState } from "react";
import type { ScanResultaat } from "@/lib/prospectscan";

/** Website scannen vanuit de admin: WordPress + verwaarlozing checken en
 * het resultaat met één klik in het prospect-formulier zetten. */
export default function ScanVak() {
  const [domein, setDomein] = useState("");
  const [bezig, setBezig] = useState(false);
  const [resultaat, setResultaat] = useState<ScanResultaat | null>(null);
  const [branche, setBranche] = useState("");
  const [plaats, setPlaats] = useState("");
  const [zoekBezig, setZoekBezig] = useState(false);
  const [gevonden, setGevonden] = useState<ScanResultaat[] | null>(null);

  async function scan() {
    if (!domein.trim() || bezig) return;
    setBezig(true);
    setResultaat(null);
    try {
      const res = await fetch("/api/admin/prospect-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domein }),
      });
      setResultaat((await res.json()) as ScanResultaat);
    } finally {
      setBezig(false);
    }
  }

  async function zoek() {
    if (!branche.trim() || zoekBezig) return;
    setZoekBezig(true);
    setGevonden(null);
    try {
      const res = await fetch("/api/admin/prospect-zoek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branche, plaats }),
      });
      const data = (await res.json()) as { resultaten?: ScanResultaat[] };
      setGevonden(data.resultaten ?? []);
    } finally {
      setZoekBezig(false);
    }
  }

  function vulMet(r: ScanResultaat) {
    const form = document.getElementById("prospect-formulier") as HTMLFormElement | null;
    if (!form) return;
    const zet = (naam: string, waarde: string) => {
      const veld = form.elements.namedItem(naam) as HTMLInputElement | HTMLTextAreaElement | null;
      if (!veld) return;
      const setter = Object.getOwnPropertyDescriptor(
        naam === "observatie" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        "value"
      )?.set;
      setter?.call(veld, waarde);
      veld.dispatchEvent(new Event("input", { bubbles: true }));
    };
    zet("website", r.domein);
    if (r.bedrijf) zet("bedrijf", r.bedrijf);
    if (r.email) zet("email", r.email);
    if (r.observatie) zet("observatie", r.observatie);
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function vulFormulier() {
    if (!resultaat) return;
    const form = document.getElementById("prospect-formulier") as HTMLFormElement | null;
    if (!form) return;
    const zet = (naam: string, waarde: string) => {
      const veld = form.elements.namedItem(naam) as HTMLInputElement | HTMLTextAreaElement | null;
      if (veld && !(naam !== "website" && naam !== "observatie" && veld.value)) {
        // website/observatie altijd overschrijven; bedrijf/email alleen als leeg
      }
      if (veld) {
        if (["website", "observatie", "bedrijf", "email"].includes(naam) || !veld.value) {
          const setter = Object.getOwnPropertyDescriptor(
            naam === "observatie" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
            "value"
          )?.set;
          setter?.call(veld, waarde);
          veld.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    };
    zet("website", resultaat.domein);
    if (resultaat.bedrijf) zet("bedrijf", resultaat.bedrijf);
    if (resultaat.email) zet("email", resultaat.email);
    if (resultaat.observatie) zet("observatie", resultaat.observatie);
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="mt-8 rounded-3xl border border-stone-200 bg-white p-6">
      <h2 className="font-display text-xl font-semibold">🎯 Vind WordPress-prospects</h2>
      <p className="mt-1 text-sm text-stone-600">
        Geef een branche (en eventueel een plaats) — ik zoek bedrijfssites,
        check welke op WordPress draaien en sorteer op verwaarlozing.
      </p>
      <div className="mt-3 flex gap-2 flex-wrap">
        <input
          value={branche}
          onChange={(e) => setBranche(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && zoek()}
          placeholder="branche — bijv. schildersbedrijf"
          className="flex-1 min-w-[12rem] rounded-xl border border-stone-300 px-4 py-2.5 text-sm focus:border-violet-600 focus:outline-none"
        />
        <input
          value={plaats}
          onChange={(e) => setPlaats(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && zoek()}
          placeholder="plaats (optioneel)"
          className="w-40 rounded-xl border border-stone-300 px-4 py-2.5 text-sm focus:border-violet-600 focus:outline-none"
        />
        <button
          onClick={zoek}
          disabled={zoekBezig || !branche.trim()}
          className="rounded-full bg-violet-700 px-5 py-2 text-white text-sm font-semibold hover:bg-violet-600 disabled:opacity-50 cursor-pointer"
        >
          {zoekBezig ? "Zoeken & scannen... (±30 sec)" : "Zoek"}
        </button>
      </div>

      {gevonden && (
        <div className="mt-4 space-y-2">
          {gevonden.length === 0 && (
            <p className="text-sm text-stone-500">Niets bruikbaars gevonden — probeer een andere branche of plaats.</p>
          )}
          {gevonden.map((r) => (
            <div
              key={r.domein}
              className={`flex flex-wrap items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm ${
                r.isWordpress && r.score >= 4
                  ? "border-violet-300 bg-violet-50/60"
                  : "border-stone-200 bg-stone-50"
              }`}
            >
              <span className="font-semibold">{r.stempel}</span>
              <a
                href={`https://${r.domein}`}
                target="_blank"
                rel="noreferrer"
                className="text-violet-700 hover:underline"
              >
                {r.domein} ↗
              </a>
              {r.isWordpress && (
                <span className="text-stone-500">score {r.score} · {r.laadMs}ms</span>
              )}
              {r.email ? (
                <span className="text-stone-500">✉️ {r.email}</span>
              ) : (
                <span className="text-amber-600">✉️ mail niet gevonden</span>
              )}
              {r.bevindingen.length > 0 && (
                <span className="w-full text-xs text-stone-500 sm:w-auto sm:flex-1 truncate">
                  {r.bevindingen.join(" · ")}
                </span>
              )}
              {r.isWordpress && (
                <button
                  onClick={() => vulMet(r)}
                  className="ml-auto rounded-full border border-violet-400 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 cursor-pointer"
                >
                  ↓ naar formulier
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <h3 className="mt-6 font-semibold text-sm text-stone-700">🔍 Of scan één specifieke website</h3>
      <div className="mt-3 flex gap-2 flex-wrap">
        <input
          value={domein}
          onChange={(e) => setDomein(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && scan()}
          placeholder="bedrijfsnaam.nl"
          className="flex-1 min-w-[14rem] rounded-xl border border-stone-300 px-4 py-2.5 text-sm focus:border-violet-600 focus:outline-none"
        />
        <button
          onClick={scan}
          disabled={bezig || !domein.trim()}
          className="rounded-full bg-violet-700 px-5 py-2 text-white text-sm font-semibold hover:bg-violet-600 disabled:opacity-50 cursor-pointer"
        >
          {bezig ? "Scannen..." : "Scan"}
        </button>
      </div>

      {resultaat && (
        <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm">
          {!resultaat.bereikbaar ? (
            <p>❌ <strong>{resultaat.domein}</strong> is niet bereikbaar.</p>
          ) : !resultaat.isWordpress ? (
            <p>
              ⚪ <strong>{resultaat.domein}</strong> lijkt geen WordPress
              ({resultaat.laadMs}ms) — waarschijnlijk geen match voor de
              overstap-pitch.
            </p>
          ) : (
            <>
              <p className="font-semibold">
                {resultaat.stempel} — {resultaat.domein}{" "}
                <span className="font-normal text-stone-500">
                  (score {resultaat.score}, {resultaat.laadMs}ms)
                </span>
              </p>
              <p className="mt-1 text-stone-600">
                {resultaat.bedrijf && <>Bedrijf: <strong>{resultaat.bedrijf}</strong>. </>}
                {resultaat.email ? (
                  <>E-mail: <strong>{resultaat.email}</strong></>
                ) : (
                  <span className="text-amber-700">Geen e-mailadres gevonden — even zelf op hun site kijken.</span>
                )}
              </p>
              {resultaat.bevindingen.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-stone-600 space-y-0.5">
                  {resultaat.bevindingen.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
              <button
                onClick={vulFormulier}
                className="mt-3 rounded-full border border-violet-400 px-4 py-1.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 cursor-pointer"
              >
                ↓ Zet in het prospect-formulier
              </button>
              <span className="ml-2 text-xs text-stone-400">
                (vult website + observatie in — daarna ✨-knop voor nette tekst)
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
