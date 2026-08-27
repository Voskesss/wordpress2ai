"use client";

import { useState } from "react";

type Resultaat = {
  domein: string;
  diagnose: { status: string; tekst: string };
  mx: string[];
  spf: string | null;
  dmarc: string | null;
  nameservers: string[];
};

const KLEUR: Record<string, string> = {
  extern: "border-emerald-300 bg-emerald-50 text-emerald-900",
  migratie: "border-red-300 bg-red-50 text-red-900",
  check: "border-amber-300 bg-amber-50 text-amber-900",
  geen: "border-stone-300 bg-stone-50 text-stone-700",
};

export default function MailCheck() {
  const [domein, setDomein] = useState("");
  const [bezig, setBezig] = useState(false);
  const [resultaat, setResultaat] = useState<Resultaat | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  async function check() {
    if (!domein.trim() || bezig) return;
    setBezig(true);
    setFout(null);
    setResultaat(null);
    try {
      const res = await fetch(
        `/api/admin/mail-check?domein=${encodeURIComponent(domein.trim())}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Er ging iets mis");
      setResultaat(data);
    } catch (e) {
      setFout(e instanceof Error ? e.message : "Er ging iets mis");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="mt-8 rounded-3xl border border-stone-200 bg-white p-6">
      <h2 className="font-display text-lg font-semibold">
        E-mailcheck (doe dit bij elke intake)
      </h2>
      <p className="mt-1 text-sm text-stone-500">
        Waar draait de mail van de klant? Bepaalt of er een e-mailmigratie bij
        de offerte moet.
      </p>
      <div className="mt-4 flex gap-2">
        <input
          value={domein}
          onChange={(e) => setDomein(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && check()}
          placeholder="klantdomein.nl"
          className="flex-1 min-w-0 rounded-xl border border-stone-300 px-4 py-2.5 text-sm focus:border-violet-600 focus:outline-none"
        />
        <button
          onClick={check}
          disabled={bezig || !domein.trim()}
          className="rounded-full bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-600 disabled:opacity-50 cursor-pointer"
        >
          {bezig ? "Bezig..." : "Check"}
        </button>
      </div>
      {fout && <p className="mt-3 text-sm text-red-700">{fout}</p>}
      {resultaat && (
        <div className="mt-4 space-y-3 text-sm">
          <p
            className={`rounded-2xl border px-4 py-3 font-medium ${KLEUR[resultaat.diagnose.status] ?? KLEUR.check}`}
          >
            {resultaat.diagnose.tekst}
          </p>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 font-mono text-xs space-y-1 overflow-x-auto">
            <p><span className="text-stone-400">MX:</span> {resultaat.mx.join("  ·  ") || "—"}</p>
            <p><span className="text-stone-400">SPF:</span> {resultaat.spf ?? "— (noteren: moet mee!)"}</p>
            <p><span className="text-stone-400">DMARC:</span> {resultaat.dmarc ?? "—"}</p>
            <p><span className="text-stone-400">NS:</span> {resultaat.nameservers.join(", ") || "—"}</p>
          </div>
        </div>
      )}
    </div>
  );
}
