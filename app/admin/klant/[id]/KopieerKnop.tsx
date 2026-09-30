"use client";
import { useState } from "react";

/** Kopieert één waarde naar het klembord, voor overtypen-vrije DNS-regels. */
export default function KopieerKnop({ tekst, label }: { tekst: string; label?: string }) {
  const [klaar, setKlaar] = useState(false);
  return (
    <button
      type="button"
      title={`Kopieer ${label ?? tekst}`}
      onClick={() => {
        void navigator.clipboard.writeText(tekst).then(() => {
          setKlaar(true);
          setTimeout(() => setKlaar(false), 1800);
        });
      }}
      className={`ml-1.5 inline-flex cursor-pointer items-center rounded-md border px-1.5 py-0.5 align-middle text-[11px] font-semibold ${
        klaar ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-stone-300 bg-white text-stone-600 hover:border-violet-400 hover:text-violet-700"
      }`}
    >
      {klaar ? "✓" : "kopieer"}
    </button>
  );
}
