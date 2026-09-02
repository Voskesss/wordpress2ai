"use client";

import { useRef, useState } from "react";
import MailBewerker from "../outreach/MailBewerker";

/** Losse mails versturen vanuit jos@wordswap.nl, met AI-hulp en vaste
 * handtekening. Antwoorden komen via de doorsturing gewoon in je inbox. */
export default function MailerVak() {
  const formRef = useRef<HTMLFormElement>(null);
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<{ goed: boolean; tekst: string } | null>(null);
  const [sleutel, setSleutel] = useState(0); // reset van de bewerker na verzenden

  async function verstuur(e: React.FormEvent) {
    e.preventDefault();
    if (bezig || !formRef.current) return;
    const data = new FormData(formRef.current);
    const aan = String(data.get("aan") ?? "");
    const onderwerp = String(data.get("onderwerp") ?? "");
    const tekst = String(data.get("tekst") ?? "");
    setBezig(true);
    setMelding(null);
    try {
      const res = await fetch("/api/admin/mail-versturen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aan, onderwerp, tekst }),
      });
      const uit = (await res.json()) as { ok?: boolean; error?: string };
      if (uit.ok) {
        setMelding({ goed: true, tekst: `Verstuurd naar ${aan} ✓` });
        formRef.current.reset();
        setSleutel((k) => k + 1);
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
    <form ref={formRef} onSubmit={verstuur} className="mt-8 grid gap-3">
      <label className="block text-sm font-semibold">
        Aan
        <input
          name="aan"
          type="email"
          required
          placeholder="naam@bedrijf.nl"
          className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 font-normal text-sm focus:border-violet-600 focus:outline-none"
        />
      </label>
      <MailBewerker key={sleutel} beginOnderwerp="" beginTekst="" los />
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <p className="text-xs font-semibold text-stone-500">
          Dit komt er automatisch onder:
        </p>
        <div className="mt-2 border-t-[3px] border-violet-700 pt-4">
          <div className="flex items-center gap-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mail.png" alt="" width={52} height={52} className="rounded-xl" />
            <div>
              <p className="text-[16px] font-bold text-stone-900">Jos Klijnhout</p>
              <p className="text-[13px] text-stone-600">
                <span className="font-bold text-stone-900">W<span className="text-violet-700">ord</span>Swap</span> · websites zonder onderhoud
              </p>
              <p className="text-[13px]">
                <span className="font-semibold text-violet-700">wordswap.nl</span>
                <span className="text-stone-300"> · </span>
                <span className="text-stone-500">jos@wordswap.nl</span>
              </p>
            </div>
          </div>
          <span className="mt-3.5 inline-block rounded-full bg-violet-700 px-5 py-2 text-[13px] font-semibold text-white">
            Probeer de demo — pas een site aan door te typen
          </span>
        </div>
      </div>
      {melding && (
        <p className={`text-sm font-medium ${melding.goed ? "text-emerald-700" : "text-red-600"}`}>
          {melding.tekst}
        </p>
      )}
      <div>
        <button
          type="submit"
          disabled={bezig}
          className="rounded-full bg-violet-700 px-6 py-2.5 text-white text-sm font-semibold hover:bg-violet-600 disabled:opacity-50 cursor-pointer"
        >
          {bezig ? "Versturen..." : "📤 Verstuur vanuit jos@wordswap.nl"}
        </button>
      </div>
    </form>
  );
}
