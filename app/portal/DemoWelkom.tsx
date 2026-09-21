"use client";

import { useEffect, useState } from "react";

/** Eenmalig welkomstscherm voor demo-gebruikers: legt uit wat de bedoeling is. */
export default function DemoWelkom() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem("demoWelkomGezien")) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  const sluit = () => {
    try {
      localStorage.setItem("demoWelkomGezien", "1");
    } catch {}
    setOpen(false);
  };

  if (!open) return null;

  const stappen: [string, string, string][] = [
    [
      "1",
      "Vraag een wijziging",
      "Klik op een van de voorbeelden onder de chat, of typ (of spreek) gewoon zelf wat je anders wilt.",
    ],
    [
      "2",
      "Bekijk het concept",
      "De AI bouwt het voor je en laat een voorbeeld zien. Nog niet goed? Zeg gewoon wat er anders moet.",
    ],
    [
      "3",
      "Publiceer zelf",
      "Tevreden? Klik op Publiceer en wacht op de bevestiging. De wijziging staat dan op de demo-site. Zo werkt het straks ook met jóuw website.",
    ],
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-stone-900/60 p-4 backdrop-blur-sm">
      <div className="my-auto max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
        <p className="text-3xl">👋</p>
        <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight">
          Welkom bij de WordSwap-demo!
        </h2>
        <p className="mt-2 text-stone-600 leading-relaxed">
          Dit is de website van een <strong>fictieve bakkerij</strong>. Jij mag
          hem aanpassen, zo ervaar je precies hoe makkelijk je straks je eigen
          website beheert, zonder iets van techniek te weten. Onder de chat
          staan vier voorbeelden klaar: één klik en je ziet het gebeuren.
        </p>
        <div className="mt-5 space-y-4">
          {stappen.map(([nr, kop, tekst]) => (
            <div key={nr} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                {nr}
              </span>
              <div>
                <p className="font-semibold">{kop}</p>
                <p className="text-sm text-stone-600 leading-relaxed">{tekst}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs text-stone-400">
          De demo-site wordt elk uur teruggezet, dus je kunt niets kapotmaken.
        </p>
        <p className="mt-2 rounded-xl bg-violet-50 px-3 py-2 text-xs text-violet-800 sm:hidden">
          💻 Tip: op een computer werkt de demo nóg prettiger, daar zie je de
          site groot naast de chat.
        </p>
        <button
          // Vroeger zette deze knop één opdracht klaar in de invoerbalk. Nu
          // staan er vier knoppen onder de chat die het ook meteen versturen,
          // dus hier alleen sluiten: anders staat er tekst in de balk die de
          // bezoeker moet wegwerken voor hij op een suggestie kan klikken.
          onClick={sluit}
          className="lift mt-5 w-full rounded-full bg-violet-700 px-6 py-3.5 font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-600"
        >
          Leuk, ik ga het proberen →
        </button>
      </div>
    </div>
  );
}
