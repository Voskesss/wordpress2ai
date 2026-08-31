"use client";

import { useState } from "react";

/** Observatie-tekstveld met AI-knop: maakt van een snelle aantekening
 * nette mailtekst (het veld wordt gewoon met het formulier meegestuurd). */
export default function ObservatieVeld({
  naam,
  beginwaarde,
  bedrijfVeld = "bedrijf",
  websiteVeld = "website",
  className,
}: {
  naam: string;
  beginwaarde?: string;
  bedrijfVeld?: string;
  websiteVeld?: string;
  className?: string;
}) {
  const [tekst, setTekst] = useState(beginwaarde ?? "");
  const [bezig, setBezig] = useState(false);

  async function maakNetjes(e: React.MouseEvent<HTMLButtonElement>) {
    if (!tekst.trim() || bezig) return;
    setBezig(true);
    try {
      // Bedrijf/website uit hetzelfde formulier meegeven voor context
      const form = e.currentTarget.closest("form");
      const bedrijf = (form?.elements.namedItem(bedrijfVeld) as HTMLInputElement | null)?.value;
      const website = (form?.elements.namedItem(websiteVeld) as HTMLInputElement | null)?.value;
      const res = await fetch("/api/admin/observatie-netjes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tekst, bedrijf, website }),
      });
      const data = (await res.json()) as { netjes?: string };
      if (data.netjes) setTekst(data.netjes);
    } finally {
      setBezig(false);
    }
  }

  return (
    <div>
      <textarea
        name={naam}
        rows={3}
        value={tekst}
        onChange={(e) => setTekst(e.target.value)}
        placeholder='Typ gewoon wat je ziet — bijv. "site traag op mobiel, menu valt buiten beeld, fotos wel mooi" — en klik dan op de AI-knop.'
        className={className}
      />
      <button
        type="button"
        onClick={maakNetjes}
        disabled={bezig || !tekst.trim()}
        className="mt-1.5 rounded-full border border-violet-300 px-3.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50 cursor-pointer"
      >
        {bezig ? "Bezig met herschrijven..." : "✨ Maak er nette mailtekst van"}
      </button>
    </div>
  );
}
