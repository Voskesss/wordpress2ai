import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { bouwJobs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import MigratieImport from "./MigratieImport";
import { annuleerJob } from "./acties";

export const metadata: Metadata = {
  title: "Migraties",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_STIJL: Record<string, string> = {
  wachtend: "bg-stone-100 border-stone-200 text-stone-600",
  bezig: "bg-violet-50 border-violet-200 text-violet-700",
  klaar: "bg-emerald-50 border-emerald-200 text-emerald-700",
  fout: "bg-red-50 border-red-200 text-red-700",
};

export default async function Migraties() {
  await requireAdmin();
  const jobs = await db
    .select()
    .from(bouwJobs)
    .orderBy(desc(bouwJobs.id))
    .then((r) => r.slice(0, 8));

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        Migraties
      </h1>
      <p className="mt-3 text-stone-600 max-w-2xl">
        Upload de WordPress-export van een klant om te zien wat er in de site
        zit. Dit is stap één van de migratie: het overzicht en het
        seo-manifest.
      </p>

      {jobs.length > 0 && (
        <div className="mt-8 rounded-3xl border border-stone-200 bg-white overflow-hidden">
          <h2 className="font-display text-lg font-semibold px-6 pt-5">
            Bouwwachtrij
          </h2>
          <table className="mt-3 w-full text-left text-sm">
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-t border-stone-100">
                  <td className="px-6 py-3 font-medium text-stone-800">
                    #{job.id} {job.siteNaam}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STIJL[job.status] ?? ""}`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-stone-500 max-w-[16rem]">
                    <span className="line-clamp-1">{job.voortgang}</span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    {(job.status === "wachtend" || job.status === "bezig") && (
                      <form action={annuleerJob} className="inline">
                        <input type="hidden" name="jobId" value={job.id} />
                        <button
                          type="submit"
                          className="text-red-600 hover:underline cursor-pointer"
                        >
                          Annuleer
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8">
        <MigratieImport />
      </div>
    </div>
  );
}
