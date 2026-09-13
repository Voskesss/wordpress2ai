"use client";

import { useState } from "react";

type Resultaat = {
  domein: string;
  registrar: string;
  nameservers: string[];
  dnsBij: string;
  mail: string;
  mailCode: string;
  mx: string[];
  spf: string[];
  dmarc: string[];
  siteIp: string[];
  www: string[];
  subdomeinen: { sub: string; data: string }[];
  advies: string;
};

const MAIL_KLEUR: Record<string, string> = {
  hoster: "bg-amber-50 border-amber-300 text-amber-800",
  google: "bg-sky-50 border-sky-300 text-sky-800",
  microsoft: "bg-sky-50 border-sky-300 text-sky-800",
  doorsturen: "bg-stone-100 border-stone-300 text-stone-600",
  soverin: "bg-emerald-50 border-emerald-300 text-emerald-800",
  geen: "bg-stone-100 border-stone-300 text-stone-600",
};

function Kaart({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">{titel}</h2>
      <div className="mt-2 text-sm text-stone-700">{children}</div>
    </div>
  );
}

export default function IntakeCheck() {
  const [domein, setDomein] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [res, setRes] = useState<Resultaat | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (!domein.trim() || bezig) return;
    setBezig(true);
    setFout(null);
    setRes(null);
    try {
      const r = await fetch("/api/admin/intake-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domein }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Check mislukt");
      setRes(j as Resultaat);
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Check mislukt");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={check} className="flex gap-3">
        <input
          value={domein}
          onChange={(e) => setDomein(e.target.value)}
          placeholder="domeinvanklant.nl"
          className="flex-1 rounded-full border border-stone-300 px-5 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
          autoFocus
        />
        <button
          type="submit"
          disabled={bezig}
          className="rounded-full bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {bezig ? "Bezig…" : "Check"}
        </button>
      </form>

      {fout && <p className="text-sm text-red-600">{fout}</p>}
      {bezig && (
        <p className="text-sm text-stone-500">
          DNS, registrar en mailsituatie opzoeken — duurt een paar seconden…
        </p>
      )}

      {res && (
        <>
          {res.advies && (
            <div className="rounded-xl border-2 border-violet-300 bg-violet-50 p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-violet-500">
                Advies tijdens het gesprek
              </h2>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
                {res.advies}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Kaart titel="1 · Domein">
              <p>
                Registrar: <b>{res.registrar}</b>
              </p>
              <p className="mt-1 text-stone-500">
                Losse registrar? Dan blijft het domein daar en gaan alleen de nameservers om.
                Gebundeld bij de hoster? Eerst losmaken vóór er iets wordt opgezegd.
              </p>
            </Kaart>

            <Kaart titel="2 · DNS">
              <p>
                Draait bij: <b>{res.dnsBij}</b>
              </p>
              <p className="mt-1 break-all font-mono text-xs text-stone-500">
                {res.nameservers.join(" · ") || "geen nameservers gevonden"}
              </p>
              {res.subdomeinen.length > 0 && (
                <p className="mt-2 text-stone-500">
                  Subdomeinen in gebruik (moeten mee bij verhuizing):{" "}
                  <b>{res.subdomeinen.map((s) => s.sub).join(", ")}</b>
                </p>
              )}
            </Kaart>

            <Kaart titel="3 · E-mail">
              <span
                className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${MAIL_KLEUR[res.mailCode] ?? "bg-stone-100 border-stone-300"}`}
              >
                {res.mail}
              </span>
              {res.mx.length > 0 && (
                <p className="mt-2 break-all font-mono text-xs text-stone-500">
                  MX: {res.mx.join(", ")}
                </p>
              )}
              <p className="mt-1 font-mono text-xs text-stone-500">
                SPF: {res.spf.length} record{res.spf.length === 1 ? "" : "s"}
                {res.spf.length > 1 && " ⚠️ (mag er maar één zijn)"} · DMARC:{" "}
                {res.dmarc.length > 0 ? "aanwezig" : "ontbreekt"}
              </p>
            </Kaart>

            <Kaart titel="4 · Prijzen (inkoop → richtprijs)">
              <ul className="space-y-1 font-mono text-xs">
                <li>Mailbox Soverin: €10/jr → €2,50–3/mnd</li>
                <li>Mailmigratie: eenmalig €75–150</li>
                <li>Domein + DNS-beheer: €10–15/jr → €25/jr</li>
                <li>Alleen doorsturen: gratis bij de site</li>
              </ul>
            </Kaart>
          </div>

          <details className="rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-stone-400">
              Ruwe gegevens
            </summary>
            <pre className="mt-3 overflow-x-auto text-xs">{JSON.stringify(res, null, 2)}</pre>
          </details>
        </>
      )}
    </div>
  );
}
