"use client";

import { useState } from "react";
import { conceptOverslaan, formulierGedaan } from "../acties-leads";
import ActieKnop from "../klant/[id]/ActieKnop";
import { STAP_LABELS, type OpvolgStap } from "@/lib/lead-opvolging";

export type ConceptRij = {
  id: number;
  naam: string;
  email: string | null;
  website: string | null;
  soort: OpvolgStap;
  onderwerp: string;
  tekst: string;
};

/** Eén klaarstaande opvolgstap: nakijken → versturen via de Mailer, of (bij de
 * formulier-stap) de tekst kopiëren en zelf op hun contactpagina plakken. */
export default function OpvolgKaart({ concept }: { concept: ConceptRij }) {
  const [gekopieerd, setGekopieerd] = useState(false);
  const isFormulier = concept.soort === "formulier";

  const mailerUrl = `/admin/mailer?${new URLSearchParams({
    aan: concept.email ?? "",
    onderwerp: concept.onderwerp,
    tekst: concept.tekst,
    demo: "0",
  }).toString()}`;

  async function kopieer() {
    try {
      await navigator.clipboard.writeText(concept.tekst);
      setGekopieerd(true);
      setTimeout(() => setGekopieerd(false), 2500);
    } catch {
      // Selecteren en kopiëren kan altijd nog met de hand
    }
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
      <p className="text-sm font-semibold text-stone-900">
        {isFormulier ? "📮" : "✉️"} {STAP_LABELS[concept.soort]} · {concept.naam}
        {concept.website && <span className="ml-1.5 font-normal text-stone-500">{concept.website}</span>}
      </p>
      <details className="mt-1.5">
        <summary className="cursor-pointer text-xs font-semibold text-violet-700">Tekst bekijken</summary>
        <p className="mt-2 whitespace-pre-line rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-700">
          {concept.tekst}
        </p>
      </details>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isFormulier ? (
          <>
            <button
              type="button"
              onClick={kopieer}
              className="rounded-full bg-violet-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-violet-600 cursor-pointer"
            >
              {gekopieerd ? "✓ Gekopieerd" : "📋 Tekst kopiëren"}
            </button>
            {concept.website && (
              <a
                href={`https://${concept.website}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-stone-300 bg-white px-4 py-1.5 text-sm font-semibold text-stone-700 hover:border-violet-600"
              >
                Naar hun site ↗
              </a>
            )}
            <form action={formulierGedaan}>
              <input type="hidden" name="id" value={concept.id} />
              <ActieKnop label="✓ Verstuurd via hun formulier" bezigLabel="..." className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer" />
            </form>
          </>
        ) : (
          <a href={mailerUrl} className="rounded-full bg-violet-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-violet-600">
            ✉️ Nakijken en versturen
          </a>
        )}
        <form action={conceptOverslaan}>
          <input type="hidden" name="id" value={concept.id} />
          <ActieKnop label="Overslaan" bezigLabel="..." className="text-xs text-stone-500 hover:text-red-600 cursor-pointer" />
        </form>
      </div>
    </div>
  );
}
