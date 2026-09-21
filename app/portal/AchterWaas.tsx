"use client";

import { useState, type ReactNode } from "react";

/**
 * Legt een waas over een stuk waar je iets kunt stukmaken zonder het te merken,
 * met een knop om hem weg te halen.
 *
 * Waarom: een openliggend formulier nodigt uit tot invullen. Bij de gegevens
 * van je eigen mailserver is dat ongelukkig, want vul je iets verkeerds in dan
 * gebeurt er niets zichtbaars: je mail blijft aankomen, alleen niet meer vanaf
 * jouw adres. Een bewuste klik erbij scheelt dat.
 *
 * Bewust géén slot of wachtwoord: wie het weet mag het gewoon doen. Het is een
 * drempel, geen deur.
 */
export default function AchterWaas({
  knop,
  waarschuwing,
  children,
}: {
  knop: string;
  waarschuwing: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (open) return <>{children}</>;

  return (
    <div className="relative mt-4">
      {/* De inhoud blijft zichtbaar, zodat je ziet wat er achter zit, maar
          onbruikbaar. `inert` is het belangrijkste deel: zonder dat kun je met
          de tab-toets alsnog in een formulier belanden dat je niet kunt lezen. */}
      <div inert aria-hidden className="pointer-events-none select-none blur-[3px] opacity-60">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/50 p-4">
        <div className="max-w-md rounded-2xl border border-stone-200 bg-white p-5 text-center shadow-sm">
          <p className="text-sm text-stone-600">{waarschuwing}</p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-3 cursor-pointer rounded-full border border-stone-300 px-5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            {knop}
          </button>
        </div>
      </div>
    </div>
  );
}
