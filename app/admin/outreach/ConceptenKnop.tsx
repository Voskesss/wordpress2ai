"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Zet voor alle nieuwe prospects een gepersonaliseerd concept van mail 1
 * klaar (op basis van de scan-waarnemingen). Verstuurt niets. */
export default function ConceptenKnop({ aantalNieuw }: { aantalNieuw: number }) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);

  async function klaarzetten() {
    if (bezig) return;
    setBezig(true);
    setMelding(null);
    try {
      const res = await fetch("/api/admin/concepten-klaarzetten", { method: "POST" });
      const data = (await res.json()) as {
        gemaakt?: number;
        fouten?: string[];
        melding?: string;
      };
      if (data.melding) setMelding(data.melding);
      else
        setMelding(
          `${data.gemaakt ?? 0} concept${(data.gemaakt ?? 0) === 1 ? "" : "en"} klaargezet — lees ze na via "Persoonlijke versie bewerken" en verstuur zelf.` +
            (data.fouten?.length ? ` Niet gelukt: ${data.fouten.join(", ")}.` : "")
        );
      router.refresh();
    } catch {
      setMelding("Klaarzetten mislukte — probeer het zo nog eens.");
    } finally {
      setBezig(false);
    }
  }

  if (aantalNieuw === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-3xl border border-violet-200 bg-violet-50/50 p-4">
      <button
        onClick={klaarzetten}
        disabled={bezig}
        className="rounded-full bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-600 disabled:opacity-50 cursor-pointer"
      >
        {bezig ? "Concepten schrijven... (±1 min)" : `🪄 Zet concepten klaar voor ${aantalNieuw} nieuwe prospect${aantalNieuw === 1 ? "" : "s"}`}
      </button>
      <p className="min-w-[14rem] flex-1 text-xs text-stone-500">
        De AI schrijft per prospect een persoonlijke mail 1 op basis van de
        scan-waarnemingen. Er wordt <strong>niets verstuurd</strong> — jij
        leest na, stuurt bij en klikt zelf op versturen.
      </p>
      {melding && <p className="w-full text-sm font-medium text-violet-800">{melding}</p>}
    </div>
  );
}
