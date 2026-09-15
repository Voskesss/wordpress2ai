"use client";

import { useState } from "react";

const MANIEREN = [
  { waarde: "mailen", label: "✉️ Mailen" },
  { waarde: "bellen", label: "📞 Bellen" },
] as const;
const DAGDELEN = ["ochtend", "middag", "avond"] as const;

/** Hoe wil de aanvrager benaderd worden: mailen en/of bellen, en zo ja op welk dagdeel. */
export default function ContactVoorkeur() {
  const [manieren, setManieren] = useState<string[]>([]);
  const [dagdelen, setDagdelen] = useState<string[]>([]);
  const bellen = manieren.includes("bellen");

  const wissel = (lijst: string[], waarde: string) =>
    lijst.includes(waarde) ? lijst.filter((x) => x !== waarde) : [...lijst, waarde];

  const knopStijl = (aan: boolean) =>
    `cursor-pointer rounded-full border px-4 py-2 text-sm transition ${
      aan ? "border-[#31956B] bg-[#31956B] text-white" : "border-stone-300 bg-white text-stone-600 hover:border-[#31956B]"
    }`;

  return (
    <div>
      <p className="block text-sm font-semibold">Hoe mag Jos contact opnemen? (optioneel, kies er gerust meer)</p>
      <input type="hidden" name="contactvoorkeur" value={manieren.join(" en ")} />
      <div className="mt-1.5 flex flex-wrap gap-2">
        {MANIEREN.map((m) => (
          <button
            key={m.waarde}
            type="button"
            aria-pressed={manieren.includes(m.waarde)}
            onClick={() => setManieren((huidig) => wissel(huidig, m.waarde))}
            className={knopStijl(manieren.includes(m.waarde))}
          >
            {m.label}
          </button>
        ))}
      </div>

      {bellen && (
        <div className="mt-3">
          <p className="block text-sm font-semibold">Wanneer komt bellen je uit?</p>
          <input type="hidden" name="belmoment" value={dagdelen.join(", ")} />
          <div className="mt-1.5 flex flex-wrap gap-2">
            {DAGDELEN.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={dagdelen.includes(d)}
                onClick={() => setDagdelen((huidig) => wissel(huidig, d))}
                className={`${knopStijl(dagdelen.includes(d))} capitalize`}
              >
                {d}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-stone-500">
            Overdag druk met je eigen werk? Geen probleem: Jos belt ook &apos;s avonds. Vul hierboven je telefoonnummer in.
          </p>
        </div>
      )}
    </div>
  );
}
