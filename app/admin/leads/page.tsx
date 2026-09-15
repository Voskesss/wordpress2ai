import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { leadActies, leads } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { vandaag } from "@/lib/leads";
import LeadLijst from "./LeadLijst";
import LeadVak from "./LeadVak";

export const metadata: Metadata = {
  title: "Leads",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Leads() {
  await requireAdmin();
  const nu = vandaag();
  const alle = await db.select().from(leads).orderBy(desc(leads.id)).catch(() => null);
  const alleActies = await db.select().from(leadActies).catch(() => null);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/admin" className="text-sm text-stone-500 hover:text-violet-700">
        ← Alle klanten
      </Link>
      <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">🎯 Leads</h1>
      <p className="mt-3 text-stone-600 leading-relaxed max-w-2xl">
        Iedereen die zelf contact zocht. Klik op een regel om de acties en gegevens te zien. Nieuwe
        aanvragen vind je in het{" "}
        <a href="https://business.facebook.com/latest/leads_center" target="_blank" rel="noreferrer" className="font-semibold text-violet-700 hover:underline">
          Leadcentrum van Meta ↗
        </a>{" "}
        en bij de formulieren van wordswap.nl.
      </p>

      {alle === null || alleActies === null ? (
        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          De leadlijst is nog niet helemaal aangemaakt in de database. Draai eerst de migraties{" "}
          <code>db/migrations/20260915-leads.sql</code> en <code>db/migrations/20260915-lead-acties.sql</code>.
        </p>
      ) : (
        <LeadLijst
          nu={nu}
          leads={alle.map((l) => ({
            id: l.id,
            naam: l.naam,
            email: l.email,
            telefoon: l.telefoon,
            website: l.website,
            bron: l.bron,
            soort: l.soort,
            status: l.status,
            notities: l.notities,
            bijgewerkt: l.bijgewerkt.toISOString(),
          }))}
          acties={alleActies.map((a) => ({
            id: a.id,
            leadId: a.leadId,
            tekst: a.tekst,
            datum: a.datum,
            gedaan: a.gedaan,
            gedaanOp: a.gedaanOp?.toISOString() ?? null,
          }))}
        />
      )}

      <h2 className="font-display mt-12 text-2xl font-semibold tracking-tight">🔍 Site checken en opvolgmail klaarzetten</h2>
      <p className="mt-2 text-sm text-stone-600">Eerst bellen werkt het best, de mail is het vangnet.</p>
      <LeadVak />
    </div>
  );
}
