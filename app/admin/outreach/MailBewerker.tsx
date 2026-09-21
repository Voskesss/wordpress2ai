"use client";

import { useRef, useState } from "react";

/** Bewerkvak voor één mail (onderwerp + tekst) met AI-hulp: typ een
 * aanwijzing ("korter", "noem het rieten dak") en de AI herschrijft,
 * zo vaak als nodig. De velden worden gewoon met het formulier meegestuurd. */
export default function MailBewerker({
  beginOnderwerp,
  beginTekst,
  bedrijf,
  website,
  observatie,
  sjabloon,
  los,
}: {
  beginOnderwerp: string;
  beginTekst: string;
  bedrijf?: string;
  website?: string;
  observatie?: string | null;
  /** true = sjabloonmodus: AI laat {{invulvelden}} intact */
  sjabloon?: boolean;
  /** true = vrije mail (mailer): geen acquisitie-huisstijl */
  los?: boolean;
}) {
  const [onderwerp, setOnderwerp] = useState(beginOnderwerp);
  const [tekst, setTekst] = useState(beginTekst);
  const [aanwijzing, setAanwijzing] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [uploadt, setUploadt] = useState(false);
  const tekstRef = useRef<HTMLTextAreaElement>(null);
  const bestandRef = useRef<HTMLInputElement>(null);

  /** Afbeelding uploaden en als markering invoegen waar de cursor staat. */
  async function voegAfbeeldingToe(bestand: File) {
    setUploadt(true);
    setFout(null);
    try {
      const formulier = new FormData();
      formulier.append("afbeelding", bestand);
      const res = await fetch("/api/admin/mail-afbeelding", { method: "POST", body: formulier });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!data.url) {
        setFout(data.error ?? "Uploaden lukte niet. Probeer het nog eens.");
        return;
      }
      const markering = `[afbeelding: ${data.url}]`;
      const veld = tekstRef.current;
      const positie = veld?.selectionStart ?? tekst.length;
      const voor = tekst.slice(0, positie).replace(/\s*$/, "");
      const na = tekst.slice(positie).replace(/^\s*/, "");
      setTekst(`${voor}${voor ? "\n\n" : ""}${markering}${na ? `\n\n${na}` : "\n"}`);
    } catch {
      setFout("Uploaden lukte niet. Probeer het nog eens.");
    } finally {
      setUploadt(false);
      if (bestandRef.current) bestandRef.current.value = "";
    }
  }

  async function verbeter() {
    if (!aanwijzing.trim() || bezig) return;
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch("/api/admin/mail-verbeter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onderwerp, tekst, aanwijzing, bedrijf, website, observatie, sjabloon, los }),
      });
      // Wordt de aanvraag door het platform afgekapt, dan komt er geen JSON
      // maar een foutpagina terug. Dat gaf eerder "probeer het nog eens",
      // waardoor het leek alsof de AI hikte terwijl de tijd gewoon op was.
      const soort = res.headers.get("content-type") ?? "";
      if (!soort.includes("application/json")) {
        setFout(
          res.status === 504
            ? "Het herschrijven duurde te lang en is afgebroken. Probeer een kortere aanwijzing."
            : `Er ging iets mis bij het herschrijven (code ${res.status}). Je tekst hierboven is niet veranderd.`
        );
        return;
      }
      const data = (await res.json()) as { onderwerp?: string; tekst?: string; error?: string };
      if (data.onderwerp && data.tekst) {
        setOnderwerp(data.onderwerp);
        setTekst(data.tekst);
        setAanwijzing("");
      } else {
        setFout(data.error ?? "Herschrijven lukte niet. Probeer het nog eens.");
      }
    } catch {
      setFout("Het herschrijven kwam niet aan. Controleer je verbinding en probeer het nog eens.");
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
        ref={tekstRef}
        name="tekst"
        rows={12}
        value={tekst}
        onChange={(e) => setTekst(e.target.value)}
        className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 font-mono text-[13px] leading-relaxed focus:border-violet-600 focus:outline-none"
      />
      <div>
        <input
          ref={bestandRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const bestand = e.target.files?.[0];
            if (bestand) voegAfbeeldingToe(bestand);
          }}
        />
        <button
          type="button"
          onClick={() => bestandRef.current?.click()}
          disabled={uploadt}
          className="rounded-full border border-stone-300 bg-white px-4 py-1.5 text-sm font-semibold text-stone-700 hover:border-violet-600 disabled:opacity-60 cursor-pointer"
        >
          {uploadt ? "Bezig met uploaden..." : "🖼 Afbeelding toevoegen"}
        </button>
        <span className="ml-2 text-[11px] text-stone-400">
          komt op de plek van je cursor, met 👁 zie je hoe hij aankomt
        </span>
      </div>
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
          placeholder='AI-aanwijzing, bv. "korter", "noem hun rieten daken", "minder verkoperig"'
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
        Geef zo vaak aanwijzingen als je wilt. Elke keer wordt de tekst
        hierboven bijgewerkt. Zelf tikken kan ook gewoon.{" "}
        {los
          ? "Groet en handtekening komen er automatisch onder."
          : "Groet, handtekening en afmeldknop komen er automatisch onder. Vergeet niet op te slaan als hij goed is."}
      </p>
    </div>
  );
}
