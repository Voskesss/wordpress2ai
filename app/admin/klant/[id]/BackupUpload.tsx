"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

export type BackupRij = { id: number; bestandsnaam: string; grootteBytes: number | null; omschrijving: string | null; datum: string };

function grootte(bytes: number | null): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
}

/** WordPress-kopieën (terugweg-garantie): uploaden rechtstreeks naar de EU-Blob-opslag, en de lijst beheren. */
export default function BackupUpload({ siteId, rijen }: { siteId: number; rijen: BackupRij[] }) {
  const router = useRouter();
  const bestandRef = useRef<HTMLInputElement>(null);
  const [omschrijving, setOmschrijving] = useState("");
  const [voortgang, setVoortgang] = useState<number | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  async function start() {
    const bestand = bestandRef.current?.files?.[0];
    if (!bestand || voortgang !== null) return;
    setFout(null);
    setVoortgang(0);
    try {
      const blob = await upload(`wp-backups/site-${siteId}/${bestand.name}`, bestand, {
        access: "public",
        handleUploadUrl: "/api/admin/backup-upload?stap=token",
        clientPayload: JSON.stringify({ siteId }),
        onUploadProgress: ({ percentage }) => setVoortgang(Math.round(percentage)),
      });
      const res = await fetch("/api/admin/backup-upload?stap=klaar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, blobUrl: blob.url, bestandsnaam: bestand.name, grootte: bestand.size, omschrijving }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Opslaan mislukt");
      if (bestandRef.current) bestandRef.current.value = "";
      setOmschrijving("");
      router.refresh();
    } catch (e) {
      setFout(e instanceof Error ? e.message : "Upload mislukt — probeer het opnieuw.");
    } finally {
      setVoortgang(null);
    }
  }

  async function verwijder(id: number) {
    if (!confirm("Deze WordPress-kopie definitief verwijderen? De klant kan hem dan niet meer downloaden.")) return;
    await fetch(`/api/admin/backup-upload?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="mt-3 space-y-3 text-sm">
      {rijen.length > 0 && (
        <ul className="divide-y divide-stone-100">
          {rijen.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
              <span>
                <a href={`/api/portal/meenemen/wordpress?siteId=${siteId}&id=${r.id}`} className="font-semibold text-violet-700 hover:underline">
                  {r.bestandsnaam}
                </a>{" "}
                <span className="text-xs text-stone-500">
                  {grootte(r.grootteBytes)} · {r.datum}
                  {r.omschrijving && <> · {r.omschrijving}</>}
                </span>
              </span>
              <button type="button" onClick={() => verwijder(r.id)} className="text-xs text-red-600 hover:underline cursor-pointer">
                Verwijderen
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <label className="block font-semibold">
          Zip-bestand
          <input ref={bestandRef} type="file" accept=".zip,.gz,application/zip,application/gzip" className="mt-1 block text-sm" />
        </label>
        <label className="block min-w-[14rem] flex-1 font-semibold">
          Omschrijving (optioneel)
          <input
            value={omschrijving}
            onChange={(e) => setOmschrijving(e.target.value)}
            placeholder="bijv. Volledige kopie vóór de overstap, sept 2026"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-normal"
          />
        </label>
        <button
          type="button"
          onClick={start}
          disabled={voortgang !== null}
          className="rounded-full bg-[#31956B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#245747] disabled:opacity-60 cursor-pointer"
        >
          {voortgang !== null ? `Uploaden... ${voortgang}%` : "⬆ Uploaden"}
        </button>
      </div>
      {fout && <p className="text-red-700">{fout}</p>}
      <p className="text-xs text-stone-500">
        De klant ziet deze kopieën in zijn portaal onder &quot;Je website en gegevens meenemen&quot; en kan ze zelf downloaden.
      </p>
    </div>
  );
}
