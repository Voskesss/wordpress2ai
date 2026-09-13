"use client";

import { useEffect, useState } from "react";

type Aankondiging = { id: number; titel: string; tekst: string; link: string | null };

/** Berichten van WordSwap bovenaan het portaal; wegklikken wordt in de browser onthouden. */
export default function Aankondigingen({ lijst }: { lijst: Aankondiging[] }) {
  const [weg, setWeg] = useState<Set<number> | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("wordswap-aankondigingen-weg");
      setWeg(new Set(raw ? (JSON.parse(raw) as number[]) : []));
    } catch {
      setWeg(new Set());
    }
  }, []);
  if (!weg) return null;
  const zichtbaar = lijst.filter((a) => !weg.has(a.id));
  if (zichtbaar.length === 0) return null;
  const sluit = (id: number) => {
    const nieuw = new Set(weg);
    nieuw.add(id);
    setWeg(nieuw);
    try {
      localStorage.setItem("wordswap-aankondigingen-weg", JSON.stringify([...nieuw]));
    } catch {}
  };
  return (
    <div className="mb-6 space-y-3">
      {zichtbaar.map((a) => (
        <div key={a.id} role="status" className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
          <span className="mt-0.5 text-base" aria-hidden>📣</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{a.titel}</p>
            <p className="mt-0.5 whitespace-pre-wrap text-violet-800">{a.tekst}</p>
            {a.link && (
              <a href={a.link} className="mt-1 inline-block font-semibold underline underline-offset-2" target="_blank" rel="noopener">
                Meer lezen
              </a>
            )}
          </div>
          <button onClick={() => sluit(a.id)} aria-label="Aankondiging sluiten" className="shrink-0 rounded-full px-2 text-lg leading-none text-violet-500 hover:text-violet-900 cursor-pointer">×</button>
        </div>
      ))}
    </div>
  );
}
