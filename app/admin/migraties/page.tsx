import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import MigratieImport from "./MigratieImport";

export const metadata: Metadata = {
  title: "Migraties",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Migraties() {
  await requireAdmin();
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
      <div className="mt-8">
        <MigratieImport />
      </div>
    </div>
  );
}
