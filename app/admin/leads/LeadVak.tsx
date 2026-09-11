"use client";

import { useState } from "react";
import { maakOpvolgmail } from "@/lib/opvolgmail";
import { richtprijs, type ScanResultaat } from "@/lib/prospectscan-shared";

/** Warme leads (uit de Meta-advertentie) opvolgen: naam + mail + website
 * overtypen uit het Leadcentrum, één knop, en de opvolgmail staat klaar in de
 * Mailer — met aanhef, check-uitkomst, richtprijs en voorproefje-aanbod. */
export default function LeadVak() {
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [gebeld, setGebeld] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [resultaat, setResultaat] = useState<ScanResultaat | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  const voornaam = naam.trim().split(/\s+/)[0] ?? "";

  async function checkEnKlaarzetten() {
    if (!website.trim() || bezig) return;
    setBezig(true);
    setFout(null);
    setResultaat(null);
    try {
      const res = await fetch("/api/admin/prospect-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domein: website }),
      });
      const r = (await res.json()) as ScanResultaat;
      if (!r.bereikbaar) {
        setFout(`${r.domein} is niet bereikbaar — klopt het adres?`);
        return;
      }
      setResultaat(r);
    } catch {
      setFout("De check mislukte — probeer het zo nog eens.");
    } finally {
      setBezig(false);
    }
  }

  function mailerUrl(r: ScanResultaat) {
    const m = maakOpvolgmail(r, voornaam, { gebeld });
    const q = new URLSearchParams({
      aan: email.trim() || r.email || "",
      onderwerp: m.onderwerp,
      tekst: m.tekst,
    });
    return `/admin/mailer?${q.toString()}`;
  }

  const invoer =
    "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 font-normal text-sm focus:border-violet-600 focus:outline-none";

  return (
    <div className="mt-8 rounded-3xl border border-stone-200 bg-white p-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Naam
          <input
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            placeholder="Roelie Reiling"
            className={invoer}
          />
        </label>
        <label className="block text-sm font-semibold">
          E-mail
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="naam@voorbeeld.nl"
            className={invoer}
          />
        </label>
        <label className="block text-sm font-semibold sm:col-span-2">
          Website
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && checkEnKlaarzetten()}
            placeholder="bedrijfsnaam.nl"
            className={invoer}
          />
        </label>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-stone-600">
        <input
          type="checkbox"
          checked={gebeld}
          onChange={(e) => setGebeld(e.target.checked)}
          className="h-4 w-4 accent-violet-700"
        />
        Ik heb al gebeld maar kreeg geen gehoor (zet dat in de mail)
      </label>
      <button
        onClick={checkEnKlaarzetten}
        disabled={bezig || !website.trim()}
        className="mt-4 rounded-full bg-violet-700 px-6 py-2.5 text-white text-sm font-semibold hover:bg-violet-600 disabled:opacity-50 cursor-pointer"
      >
        {bezig ? "Site checken..." : "🔍 Check de site"}
      </button>

      {fout && <p className="mt-3 text-sm font-medium text-red-600">{fout}</p>}

      {resultaat && (
        <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm">
          <p className="font-semibold">
            {resultaat.stempel} — {resultaat.domein}{" "}
            <span className="font-normal text-stone-500">
              ({resultaat.laadMs}ms
              {resultaat.paginas > 0 && (
                <> · {resultaat.paginas} pagina&apos;s → richtprijs {richtprijs(resultaat.paginas)}</>
              )}
              )
            </span>
          </p>
          {[...(resultaat.kapot ?? []), ...(resultaat.bevindingen ?? [])].length > 0 ? (
            <ul className="mt-2 list-disc pl-5 text-stone-600 space-y-0.5">
              {[...(resultaat.kapot ?? []), ...(resultaat.bevindingen ?? [])].map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-stone-600">
              Technisch niets geks gevonden — de mail schuift dan vanzelf naar het gemak-verhaal.
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href={mailerUrl(resultaat)}
              className="rounded-full bg-violet-700 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-600"
            >
              ✉️ Opvolgmail klaarzetten{voornaam ? ` voor ${voornaam}` : ""}
            </a>
            <span className="text-xs text-stone-400">
              opent de Mailer, ingevuld — jij leest na en verstuurt
            </span>
          </div>
          {!email.trim() && !resultaat.email && (
            <p className="mt-2 text-xs text-amber-700">
              Let op: geen e-mailadres ingevuld of gevonden — vul het aan-veld straks zelf in.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
