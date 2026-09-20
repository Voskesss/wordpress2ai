"use client";

import { useState } from "react";
import { bewaarConcept, conceptOverslaan, formulierGedaan } from "../acties-leads";
import ActieKnop from "../klant/[id]/ActieKnop";
import AiMailVak from "./AiMailVak";
import { STAP_LABELS, type MailStap } from "@/lib/lead-opvolging";

export type ConceptRij = {
  id: number;
  naam: string;
  email: string | null;
  website: string | null;
  soort: MailStap;
  onderwerp: string | null;
  tekst: string | null;
};

/** Eén klaarstaande mailstap. De inhoud maakt Jos zelf (samen met de chat) en
 * plakt hij in het bewerkveld; daarna nakijken → versturen via de Mailer, of
 * (bij de formulier-stap) kopiëren en op hun contactpagina plakken. */
export default function OpvolgKaart({ concept }: { concept: ConceptRij }) {
  const [gekopieerd, setGekopieerd] = useState(false);
  const isFormulier = concept.soort === "formulier";
  const heeftTekst = Boolean(concept.tekst && concept.onderwerp);

  const mailerUrl = `/admin/mailer?${new URLSearchParams({
    aan: concept.email ?? "",
    onderwerp: concept.onderwerp ?? "",
    tekst: concept.tekst ?? "",
    demo: "0",
  }).toString()}`;

  async function kopieer() {
    try {
      await navigator.clipboard.writeText(concept.tekst ?? "");
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

      {!heeftTekst && (
        <p className="mt-1.5 text-sm text-stone-600">
          Tekst nog maken — schrijf hem samen met de chat en plak hem hieronder.
        </p>
      )}

      <details className="mt-1.5" open={!heeftTekst}>
        <summary className="cursor-pointer text-xs font-semibold text-violet-700">
          {heeftTekst ? "Tekst bekijken of bewerken" : "Tekst plakken"}
        </summary>
        <form action={bewaarConcept} className="mt-2">
          <input type="hidden" name="id" value={concept.id} />
          <input
            name="onderwerp"
            required
            defaultValue={concept.onderwerp ?? ""}
            placeholder="Onderwerp"
            className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm focus:border-violet-600 focus:outline-none"
          />
          <textarea
            name="tekst"
            required
            rows={heeftTekst ? 8 : 5}
            defaultValue={concept.tekst ?? ""}
            placeholder="Plak hier de mailtekst (zonder groet onderaan — die voegt de mail zelf toe)"
            className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm focus:border-violet-600 focus:outline-none"
          />
          <ActieKnop label="💾 Tekst bewaren" bezigLabel="Bewaren..." klaarLabel="✓ Bewaard" className="mt-2 rounded-full bg-violet-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-violet-600 cursor-pointer" />
        </form>
      </details>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isFormulier ? (
          <>
            {heeftTekst && (
              <button
                type="button"
                onClick={kopieer}
                className="rounded-full bg-violet-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-violet-600 cursor-pointer"
              >
                {gekopieerd ? "✓ Gekopieerd" : "📋 Tekst kopiëren"}
              </button>
            )}
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
          heeftTekst && (
            <a href={mailerUrl} className="rounded-full bg-violet-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-violet-600">
              ✉️ Nakijken en versturen
            </a>
          )
        )}
        <form action={conceptOverslaan}>
          <input type="hidden" name="id" value={concept.id} />
          <ActieKnop
            label="✕ Van de lijst halen"
            bezigLabel="..."
            title="Deze stap is niet (meer) nodig — het kaartje verdwijnt, de lead blijft gewoon staan"
            className="rounded-full border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-600 hover:border-red-400 hover:text-red-600 cursor-pointer"
          />
        </form>
      </div>
      <AiMailVak leadId={concept.id} heeftConcept={heeftTekst} />
    </div>
  );
}
