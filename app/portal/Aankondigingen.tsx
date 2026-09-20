"use client";

import { useEffect, useState } from "react";

type Aankondiging = { id: number; titel: string; tekst: string; link: string | null };

/** Berichten van WordSwap. Standaard een balk bovenaan het portaal; met
 * `overlay` één keer schermvullend over de pagina heen (zoals de
 * publiceer-overlay) — in de chat scrolde de balk gewoon mee het beeld uit
 * zodra het gesprek vol stond (20-09). Wegklikken onthoudt de browser. */
export default function Aankondigingen({ lijst, overlay = false }: { lijst: Aankondiging[]; overlay?: boolean }) {
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
    // Ook per account bewaren: dan hoef je hem op je telefoon niet nóg eens
    // weg te klikken. Mislukt dit stilletjes, dan vangt de browser-opslag het
    // op dit apparaat op en komt hij elders hooguit één keer terug.
    void fetch("/api/aankondiging-gezien", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  };
  if (overlay) {
    // Eén tegelijk, netjes in het midden; op een telefoon vult de kaart de
    // breedte en blijft de tekst scrolbaar binnen het scherm.
    const a = zichtbaar[0];
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-900/40 p-4" role="dialog" aria-label="Aankondiging van WordSwap">
        <div className="w-full max-w-md max-h-[85dvh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
          <p className="text-3xl" aria-hidden>📣</p>
          <h3 className="mt-2 text-lg font-semibold text-stone-900">{a.titel}</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-600">{a.tekst}</p>
          {a.link && (
            <a href={a.link} className="mt-2 inline-block text-sm font-semibold text-violet-700 underline underline-offset-2" target="_blank" rel="noopener">
              Meer lezen
            </a>
          )}
          <button
            onClick={() => sluit(a.id)}
            className="mt-5 w-full rounded-full bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-600 cursor-pointer"
          >
            Oké, ik heb het gezien
          </button>
        </div>
      </div>
    );
  }
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
