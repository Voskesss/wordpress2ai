"use client";

import { useState } from "react";
import type { ScanResultaat } from "@/lib/prospectscan";

/** Website scannen vanuit de admin: WordPress + verwaarlozing checken en
 * het resultaat met één klik in het prospect-formulier zetten. */
export default function ScanVak() {
  const [domein, setDomein] = useState("");
  const [bezig, setBezig] = useState(false);
  const [resultaat, setResultaat] = useState<ScanResultaat | null>(null);

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
        if (naam === "website" || naam === "observatie" || !veld.value) {
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
    if (resultaat.observatie) zet("observatie", resultaat.observatie);
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="mt-8 rounded-3xl border border-stone-200 bg-white p-6">
      <h2 className="font-display text-xl font-semibold">🔍 Scan een website</h2>
      <p className="mt-1 text-sm text-stone-600">
        Plak een domein en zie direct: draait het op WordPress, en hoe slecht is
        het bijgehouden? Hoe hoger de score, hoe kansrijker.
      </p>
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
