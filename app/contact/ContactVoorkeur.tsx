"use client";

import { useState } from "react";

const DAGDELEN = ["ochtend", "middag", "avond"] as const;

const inputStijl =
  "mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 focus:border-[#31956B] focus:outline-none focus:ring-2 focus:ring-[#e3eedd]";

/** Hoe wil de aanvrager benaderd worden: mailen, of bellen op een dagdeel dat hem uitkomt. */
export default function ContactVoorkeur() {
  const [voorkeur, setVoorkeur] = useState<"mailen" | "bellen">("mailen");
  const [dagdelen, setDagdelen] = useState<string[]>([]);

  const keuzeStijl = (actief: boolean) =>
    `flex-1 cursor-pointer rounded-xl border px-4 py-3 text-sm font-semibold text-center transition ${
      actief ? "border-[#31956B] bg-[#eff3e8] text-[#244b3d]" : "border-stone-300 bg-white text-stone-600 hover:border-[#31956B]"
    }`;

  return (
    <div>
      <p className="block text-sm font-semibold">Hoe wil je dat Jos contact opneemt?</p>
      <input type="hidden" name="contactvoorkeur" value={voorkeur} />
      <div className="mt-1.5 flex gap-3" role="radiogroup" aria-label="Contactvoorkeur">
        <button type="button" role="radio" aria-checked={voorkeur === "mailen"} onClick={() => setVoorkeur("mailen")} className={keuzeStijl(voorkeur === "mailen")}>
          ✉️ Mail me
        </button>
        <button type="button" role="radio" aria-checked={voorkeur === "bellen"} onClick={() => setVoorkeur("bellen")} className={keuzeStijl(voorkeur === "bellen")}>
          📞 Bel me
        </button>
      </div>

      {voorkeur === "bellen" && (
        <div className="mt-4 space-y-4 rounded-xl border border-[#dde7d9] bg-[#f6f9f2] p-4">
          <div>
            <label htmlFor="telefoon" className="block text-sm font-semibold">
              Telefoonnummer
            </label>
            <input id="telefoon" name="telefoon" type="tel" autoComplete="tel" required className={inputStijl} />
          </div>
          <div>
            <p className="block text-sm font-semibold">Wanneer komt het je uit? (kies er gerust meer)</p>
            <input type="hidden" name="belmoment" value={dagdelen.join(", ")} />
            <div className="mt-1.5 flex flex-wrap gap-2">
              {DAGDELEN.map((d) => {
                const aan = dagdelen.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={aan}
                    onClick={() => setDagdelen((huidig) => (aan ? huidig.filter((x) => x !== d) : [...huidig, d]))}
                    className={`cursor-pointer rounded-full border px-4 py-2 text-sm capitalize transition ${
                      aan ? "border-[#31956B] bg-[#31956B] text-white" : "border-stone-300 bg-white text-stone-600 hover:border-[#31956B]"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-stone-500">
              Overdag druk met je eigen werk? Geen probleem: Jos belt ook &apos;s avonds.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
