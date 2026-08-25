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

  async function upload(file: File) {
    setBezig(true);
    setFout(null);
    setOverzicht(null);
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
    } catch (e) {
      setFout(e instanceof Error ? e.message : "Er ging iets mis");
    } finally {
      setBezig(false);
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
              className="mt-4 rounded-full bg-violet-700 px-5 py-2 text-white text-sm font-semibold hover:bg-violet-600 cursor-pointer"
            >
              Download seo-manifest.json
            </button>
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
