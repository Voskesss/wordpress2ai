"use client";

import { useEffect, useState } from "react";

type Job = {
  id: number;
  status: "wachtend" | "bezig" | "klaar" | "fout";
  voortgang: string | null;
  siteNaam: string;
  resultaat?: { siteId?: number; paginas?: number } | null;
};

const STIJL: Record<string, string> = {
  wachtend: "bg-stone-100 border-stone-200 text-stone-600",
  bezig: "bg-violet-50 border-violet-200 text-violet-700",
  klaar: "bg-emerald-50 border-emerald-200 text-emerald-700",
  fout: "bg-red-50 border-red-200 text-red-700",
};

export default function BouwWachtrij({ start }: { start: Job[] }) {
  const [jobs, setJobs] = useState<Job[]>(start);

  useEffect(() => {
    const actief = () => jobs.some((j) => j.status === "wachtend" || j.status === "bezig");
    const timer = setInterval(async () => {
      try {
        const res = await fetch("/api/admin/bouw-jobs");
        if (res.ok) setJobs((await res.json()).jobs);
      } catch {}
    }, actief() ? 4000 : 20000);
    return () => clearInterval(timer);
  }, [jobs]);

  async function verwijder(id: number) {
    setJobs((j) => j.filter((job) => job.id !== id));
    await fetch("/api/admin/bouw-jobs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: id }),
    }).catch(() => {});
  }

  async function annuleer(id: number) {
    await fetch("/api/admin/bouw-jobs/annuleer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: id }),
    }).catch(() => {});
    const res = await fetch("/api/admin/bouw-jobs");
    if (res.ok) setJobs((await res.json()).jobs);
  }

  if (jobs.length === 0) return null;
  return (
    <div className="mt-8 rounded-3xl border border-stone-200 bg-white overflow-hidden">
      <h2 className="font-display text-lg font-semibold px-6 pt-5">
        Bouwwachtrij
      </h2>
      <table className="mt-3 w-full text-left text-sm">
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="border-t border-stone-100">
              <td className="px-6 py-3 font-medium text-stone-800 whitespace-nowrap">
                #{job.id} {job.siteNaam}
              </td>
              <td className="px-3 py-3">
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STIJL[job.status]}`}>
                  {job.status}
                </span>
              </td>
              <td className="px-3 py-3 text-stone-500">
                <span
                  title={job.voortgang ?? undefined}
                  className={
                    job.status === "fout"
                      ? "block max-w-xl whitespace-pre-wrap break-words text-red-700"
                      : `line-clamp-1 ${job.status === "bezig" ? "animate-pulse" : ""}`
                  }
                >
                  {job.voortgang}
                </span>
              </td>
              <td className="px-6 py-3 text-right whitespace-nowrap">
                {(job.status === "wachtend" || job.status === "bezig") && (
                  <button
                    onClick={() => annuleer(job.id)}
                    className="text-red-600 hover:underline cursor-pointer"
                  >
                    Annuleer
                  </button>
                )}
                {job.status === "klaar" && job.resultaat?.siteId && (
                  <a
                    href={`/admin/klant/${job.resultaat.siteId}`}
                    className="rounded-full bg-violet-700 px-4 py-1.5 text-white font-semibold hover:bg-violet-600"
                  >
                    Naar klantpagina →
                  </a>
                )}
                {(job.status === "klaar" || job.status === "fout") && (
                  <button
                    onClick={() => verwijder(job.id)}
                    title="Uit de wachtrij verwijderen"
                    className="ml-4 text-stone-400 hover:text-red-600 cursor-pointer"
                  >
                    Verwijder
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
