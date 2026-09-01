"use client";

import { useState } from "react";

/** Bewerkvak voor één mail (onderwerp + tekst) met AI-hulp: typ een
 * aanwijzing ("korter", "noem het rieten dak") en de AI herschrijft —
 * zo vaak als nodig. De velden worden gewoon met het formulier meegestuurd. */
export default function MailBewerker({
  beginOnderwerp,
  beginTekst,
  bedrijf,
  website,
  observatie,
  sjabloon,
}: {
  beginOnderwerp: string;
  beginTekst: string;
  bedrijf?: string;
  website?: string;
  observatie?: string | null;
  /** true = sjabloonmodus: AI laat {{invulvelden}} intact */
  sjabloon?: boolean;
}) {
  const [onderwerp, setOnderwerp] = useState(beginOnderwerp);
  const [tekst, setTekst] = useState(beginTekst);
  const [aanwijzing, setAanwijzing] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function verbeter() {
    if (!aanwijzing.trim() || bezig) return;
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch("/api/admin/mail-verbeter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onderwerp, tekst, aanwijzing, bedrijf, website, observatie, sjabloon }),
      });
      const data = (await res.json()) as { onderwerp?: string; tekst?: string; error?: string };
      if (data.onderwerp && data.tekst) {
        setOnderwerp(data.onderwerp);
        setTekst(data.tekst);
        setAanwijzing("");
      } else {
        setFout(data.error ?? "Herschrijven lukte niet — probeer het nog eens.");
      }
    } catch {
      setFout("Herschrijven lukte niet — probeer het nog eens.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="grid gap-2">
      <input
        name="onderwerp"
        value={onderwerp}
        onChange={(e) => setOnderwerp(e.target.value)}
        className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm focus:border-violet-600 focus:outline-none"
      />
      <textarea
        name="tekst"
        rows={12}
        value={tekst}
        onChange={(e) => setTekst(e.target.value)}
        className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 font-mono text-[13px] leading-relaxed focus:border-violet-600 focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50/50 p-2.5">
        <input
          value={aanwijzing}
          onChange={(e) => setAanwijzing(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              verbeter();
            }
          }}
          placeholder='AI-aanwijzing — bv. "korter", "noem hun rieten daken", "minder verkoperig"'
          className="min-w-[14rem] flex-1 rounded-xl border border-violet-200 bg-white px-3.5 py-2 text-sm focus:border-violet-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={verbeter}
          disabled={bezig || !aanwijzing.trim()}
          className="rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-600 disabled:opacity-50 cursor-pointer"
        >
          {bezig ? "Bezig..." : "✨ Verbeter"}
        </button>
      </div>
      {fout && <p className="text-xs text-red-600">{fout}</p>}
      <p className="text-[11px] text-stone-400">
        Geef zo vaak aanwijzingen als je wilt — elke keer wordt de tekst
        hierboven bijgewerkt. Zelf tikken kan ook gewoon. Groet en afmeldknop
        komen er automatisch onder. Vergeet niet op te slaan als hij goed is.
      </p>
    </div>
  );
}
