"use client";

import { useEffect, useState } from "react";

type Aankondiging = { id: number; titel: string; tekst: string; link: string | null };

/** Berichten van WordSwap: één keer schermvullend over de pagina heen (boven
 * de schermvullende chat, vandaar z-90), met een duidelijke sluitknop.
 * Bewust op ÉÉN plek gerenderd (het portaal): een eerdere opzet met én een
 * balk op de pagina én een overlay in de chat had twee losse geheugentjes,
 * en dan bleef de ander gewoon staan na het wegklikken (20-09). Wegklikken
 * wordt per account bewaard, met de browser-opslag als snelle eerste laag. */
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
    // Ook per account bewaren: dan hoef je hem op je telefoon niet nóg eens
    // weg te klikken. Mislukt dit stilletjes, dan vangt de browser-opslag het
    // op dit apparaat op en komt hij elders hooguit één keer terug.
    void fetch("/api/aankondiging-gezien", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  };
  {
    // Eén tegelijk, netjes in het midden; op een telefoon vult de kaart de
    // breedte en blijft de tekst scrolbaar binnen het scherm.
    const a = zichtbaar[0];
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-stone-900/40 p-4" role="dialog" aria-label="Aankondiging van WordSwap">
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
}
