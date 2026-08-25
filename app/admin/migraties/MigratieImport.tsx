"use client";

import { useState } from "react";

type Overzicht = {
  siteTitel: string;
  siteUrl: string;
  paginas: { titel: string; pad: string; status: string; tekens: number }[];
  berichten: { titel: string; pad: string; status: string; tekens: number }[];
  mediaAantal: number;
  overig: Record<string, number>;
  manifest: object;
};

export default function MigratieImport() {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [overzicht, setOverzicht] = useState<Overzicht | null>(null);
  const [wxrFile, setWxrFile] = useState<File | null>(null);
  const [siteNaam, setSiteNaam] = useState("");
  const [repoNaam, setRepoNaam] = useState("");
  const [bouwStatus, setBouwStatus] = useState<string | null>(null);
  const [bouwResultaat, setBouwResultaat] = useState<{
    repoUrl: string;
    paginas: number;
    afbeeldingen: number;
  } | null>(null);

  async function upload(file: File) {
    setBezig(true);
    setFout(null);
    setOverzicht(null);
    setBouwResultaat(null);
    setWxrFile(file);
    try {
      const form = new FormData();
      form.set("wxr", file);
      const res = await fetch("/api/admin/migratie-import", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Er ging iets mis");
      setOverzicht(data);
      setSiteNaam(data.siteTitel ?? "");
      setRepoNaam(
        (data.siteTitel ?? "")
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 40)
      );
    } catch (e) {
      setFout(e instanceof Error ? e.message : "Er ging iets mis");
    } finally {
      setBezig(false);
    }
  }

  async function bouwSite() {
    if (!wxrFile || bouwStatus) return;
    setFout(null);
    setBouwResultaat(null);
    setBouwStatus("Starten...");
    try {
      const form = new FormData();
      form.set("wxr", wxrFile);
      form.set("siteNaam", siteNaam);
      form.set("repoNaam", repoNaam);
      const res = await fetch("/api/admin/migratie-bouw", {
        method: "POST",
        body: form,
      });
      if (!res.body) throw new Error("geen stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const regels = buffer.split("\n");
        buffer = regels.pop() ?? "";
        for (const regel of regels) {
          if (!regel.trim()) continue;
          try {
            const event = JSON.parse(regel);
            if (event.type === "status") setBouwStatus(event.tekst);
            if (event.type === "fout") throw new Error(event.tekst);
            if (event.type === "klaar") setBouwResultaat(event);
          } catch (e) {
            if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
              if (!e.message.startsWith("Unexpected")) throw e;
            }
          }
        }
      }
    } catch (e) {
      setFout(e instanceof Error ? e.message : "Er ging iets mis");
    } finally {
      setBouwStatus(null);
    }
  }

  function downloadManifest() {
    if (!overzicht) return;
    const blob = new Blob([JSON.stringify(overzicht.manifest, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "seo-manifest.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <label className="block rounded-3xl border-2 border-dashed border-stone-300 bg-white p-10 text-center cursor-pointer hover:border-violet-400">
        <input
          type="file"
          accept=".xml,text/xml,application/xml"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
        <p className="font-semibold">
          {bezig ? "Bezig met uitlezen..." : "Klik om een WordPress-export (.xml) te kiezen"}
        </p>
        <p className="mt-1 text-sm text-stone-500">
          In WordPress: Extra → Exporteren → Alle content → Download exportbestand
        </p>
      </label>

      {fout && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-red-800 text-sm">
          {fout}
        </p>
      )}

      {overzicht && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-stone-200 bg-white p-6">
            <h2 className="font-display text-xl font-semibold">
              {overzicht.siteTitel}
            </h2>
            <p className="text-stone-500 text-sm">{overzicht.siteUrl}</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-violet-50 border border-violet-200 px-3 py-1 font-medium text-violet-700">
                {overzicht.paginas.length} pagina&apos;s
              </span>
              <span className="rounded-full bg-violet-50 border border-violet-200 px-3 py-1 font-medium text-violet-700">
                {overzicht.berichten.length} berichten
              </span>
              <span className="rounded-full bg-violet-50 border border-violet-200 px-3 py-1 font-medium text-violet-700">
                {overzicht.mediaAantal} media-bestanden
              </span>
              {Object.entries(overzicht.overig).map(([type, n]) => (
                <span
                  key={type}
                  className="rounded-full bg-stone-100 border border-stone-200 px-3 py-1 text-stone-500"
                >
                  {n}× {type} (overgeslagen)
                </span>
              ))}
            </div>
            <button
              onClick={downloadManifest}
              className="mt-4 rounded-full border border-stone-300 px-5 py-2 text-sm font-semibold hover:border-violet-400 cursor-pointer"
            >
              Download seo-manifest.json
            </button>
          </div>

          {/* Bouw site */}
          <div className="rounded-3xl border-2 border-violet-600 bg-violet-50/40 p-6">
            <h3 className="font-display text-lg font-semibold">
              Stap 2 — Bouw de nieuwe site
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Naam van de site
                <input
                  value={siteNaam}
                  onChange={(e) => setSiteNaam(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 font-normal focus:border-violet-600 focus:outline-none"
                />
              </label>
              <label className="block text-sm font-semibold">
                Interne naam (repo)
                <input
                  value={repoNaam}
                  onChange={(e) => setRepoNaam(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 font-normal font-mono text-sm focus:border-violet-600 focus:outline-none"
                />
              </label>
            </div>
            <button
              onClick={bouwSite}
              disabled={Boolean(bouwStatus) || !siteNaam || !repoNaam}
              className="mt-4 rounded-full bg-violet-700 px-6 py-2.5 text-white font-semibold hover:bg-violet-600 disabled:opacity-50 cursor-pointer"
            >
              {bouwStatus ? "Bezig..." : "Bouw site"}
            </button>
            {bouwStatus && (
              <p className="mt-3 text-sm text-violet-700 animate-pulse font-medium">
                {bouwStatus}
              </p>
            )}
            {bouwResultaat && (
              <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-semibold">
                  Site gebouwd: {bouwResultaat.paginas} pagina&apos;s,{" "}
                  {bouwResultaat.afbeeldingen} afbeeldingen
                </p>
                <p className="mt-1">
                  <a
                    href={bouwResultaat.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-medium"
                  >
                    Bekijk de bestanden
                  </a>{" "}
                  · Volgende stap: koppel de repo in Netlify (Add new project →
                  Import) en zet de sitenaam in het admin-overzicht.
                </p>
              </div>
            )}
          </div>

          {[
            ["Pagina's", overzicht.paginas] as const,
            ["Berichten", overzicht.berichten] as const,
          ].map(([kop, items]) =>
            items.length === 0 ? null : (
              <div
                key={kop}
                className="overflow-x-auto rounded-2xl border border-stone-200 bg-white"
              >
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500">
                      <th className="p-3 font-medium">{kop}</th>
                      <th className="p-3 font-medium">Pad</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium">Omvang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p, i) => (
                      <tr key={i} className="border-b border-stone-100 last:border-0">
                        <td className="p-3 font-medium text-stone-800">{p.titel}</td>
                        <td className="p-3 text-stone-600">{p.pad}</td>
                        <td className="p-3 text-stone-600">
                          {p.status === "publish" ? (
                            <span className="text-emerald-700">gepubliceerd</span>
                          ) : (
                            p.status
                          )}
                        </td>
                        <td className="p-3 text-stone-600">
                          {p.tekens > 0
                            ? `${Math.round(p.tekens / 1000)}k tekens`
                            : "leeg"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
