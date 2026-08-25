import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { bouwJobs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import MigratieImport from "./MigratieImport";
import BouwWachtrij from "./BouwWachtrij";

export const metadata: Metadata = {
  title: "Migraties",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

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

      <BouwWachtrij
        start={jobs.map((j) => ({
          id: j.id,
          status: j.status,
          voortgang: j.voortgang,
          siteNaam: j.siteNaam,
        }))}
      />

      <div className="mt-8">
        <MigratieImport />
      </div>
    </div>
  );
}
