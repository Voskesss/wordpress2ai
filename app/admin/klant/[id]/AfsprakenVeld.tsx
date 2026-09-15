"use client";

import { useState } from "react";

/** Vrij veld voor aanvullende afspraken, met een AI-knop die losse
 * aantekeningen omschrijft tot nette regels voor de opdrachtbevestiging. */
export default function AfsprakenVeld({ standaard }: { standaard: string }) {
  const [tekst, setTekst] = useState(standaard);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function maakNetjes() {
    if (!tekst.trim() || bezig) return;
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch("/api/admin/afspraken-netjes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tekst }),
      });
      const d = (await res.json()) as { tekst?: string; error?: string };
      if (d.tekst) setTekst(d.tekst);
      else setFout(d.error ?? "Het lukte niet — probeer het zo nog eens.");
    } catch {
      setFout("Het lukte niet — probeer het zo nog eens.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <>
      <textarea
        name="afspraken"
        rows={3}
        maxLength={1500}
        placeholder={
          "Typ het gerust in steekwoorden, bijv.: domein registreren wij, 15 pj in maandbedrag / email via ons, 4 van de 16 pm — en klik dan op ✨"
        }
        value={tekst}
        onChange={(e) => setTekst(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 font-normal text-sm focus:border-violet-600 focus:outline-none"
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={maakNetjes}
          disabled={bezig || !tekst.trim()}
          className="rounded-full border border-violet-300 px-3.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50 cursor-pointer"
        >
          {bezig ? "Bezig met herschrijven..." : "✨ Maak er nette afspraakregels van"}
        </button>
        <span className="text-xs text-stone-400">Controleer het resultaat even; jij blijft bepalen wat er staat.</span>
        {fout && <span className="text-xs font-medium text-red-600">{fout}</span>}
      </div>
    </>
  );
}
