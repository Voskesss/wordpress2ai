"use client";

import { useState } from "react";

export default function ChatHulp() {
  const [vraag, setVraag] = useState("");
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<{ goed: boolean; tekst: string } | null>(null);

  async function verstuur() {
    if (bezig || vraag.trim().length < 5) return;
    setBezig(true);
    setMelding(null);
    try {
      const res = await fetch("/api/portal/hulpvraag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tekst: vraag }),
      });
      const uit = (await res.json()) as { ok?: boolean; error?: string };
      if (uit.ok) {
        setMelding({ goed: true, tekst: "Verstuurd! Jos mailt je zo snel mogelijk terug." });
        setVraag("");
      } else {
        setMelding({ goed: false, tekst: uit.error ?? "Versturen mislukte." });
      }
    } catch {
      setMelding({ goed: false, tekst: "Versturen mislukte — probeer het zo nog eens." });
    } finally {
      setBezig(false);
    }
  }

  return (
    <details className="mb-2 shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700">
      <summary className="cursor-pointer font-semibold">
        Hoe pas ik mijn website aan?
      </summary>
      <div className="mt-3 space-y-3 text-xs leading-relaxed">
        <ol className="list-decimal space-y-2 pl-4">
          <li>
            <strong>Vertel wat en waar.</strong> Bijvoorbeeld: “Zet op de
            contactpagina dat we zaterdag van 9 tot 16 uur open zijn.” Verstuur
            met de pijl.
          </li>
          <li>
            <strong>Bekijk je concept.</strong> Dat is een voorstel, nog niet
            zichtbaar voor bezoekers. Op je telefoon kies je “Bekijk concept”.
            Klopt het niet? Typ wat er anders moet.
          </li>
          <li>
            <strong>Zet het zelf live.</strong> Controleer tekst, foto’s en
            links. Klik daarna op “Publiceer” en wacht op de bevestiging.
          </li>
        </ol>
        <p>
          Een foto vervangen? Stuur je foto mee en noem de pagina en de plek.
          Met “Wijs aan” kun je het onderdeel ook aanklikken.
        </p>
        <p>
          “Concept weggooien” verwijdert je nog niet gepubliceerde wijzigingen.
          “Stap terug” draait alleen de laatste stap van het concept terug.
        </p>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
          <p className="font-semibold text-stone-700">Kom je er niet uit? Vraag het Jos:</p>
          <textarea
            value={vraag}
            onChange={(e) => setVraag(e.target.value)}
            rows={2}
            placeholder="Beschrijf kort waar je tegenaan loopt..."
            className="mt-2 w-full resize-none rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs focus:border-[#31956B] focus:outline-none"
          />
          <button
            onClick={verstuur}
            disabled={bezig || vraag.trim().length < 5}
            className="mt-2 rounded-full bg-[#244b3d] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#2d5c4b] disabled:opacity-50 cursor-pointer"
          >
            {bezig ? "Versturen..." : "Verstuur naar Jos"}
          </button>
          {melding && (
            <p className={`mt-2 font-medium ${melding.goed ? "text-emerald-700" : "text-red-600"}`}>
              {melding.tekst}
            </p>
          )}
        </div>
      </div>
    </details>
  );
}
