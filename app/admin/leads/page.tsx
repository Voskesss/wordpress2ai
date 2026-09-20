import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { leadActies, leadPost, leads, verzondenMails } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { vandaag } from "@/lib/leads";
import type { MailStap } from "@/lib/lead-opvolging";
import BijwerkKnop from "./BijwerkKnop";
import LeadLijst, { type PostRegel } from "./LeadLijst";
import LeadVak from "./LeadVak";
import OpvolgKaart from "./OpvolgKaart";

export const metadata: Metadata = {
  title: "Leads",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
// De bijwerkronde (Meta + Soverin, inclusief terugblik) mag even duren
export const maxDuration = 120;

export default async function Leads() {
  await requireAdmin();
  const nu = vandaag();
  const alle = await db.select().from(leads).orderBy(desc(leads.id)).catch(() => null);
  const alleActies = await db.select().from(leadActies).catch(() => null);
  const allePost = await db.select().from(leadPost).catch(() => []);
  const alleVerzonden = await db.select().from(verzondenMails).catch(() => []);

  // Tijdlijn per lead: systeem-mails (Mailer) en Soverin-post, op e-mailadres bij elkaar
  const tijdlijn = new Map<number, PostRegel[]>();
  for (const l of alle ?? []) {
    const adres = l.email?.trim().toLowerCase();
    const regels: PostRegel[] = [
      ...alleVerzonden
        .filter((m) => adres && m.aan.trim().toLowerCase() === adres)
        .map((m) => ({
          richting: "uit" as const,
          via: "Mailer",
          onderwerp: m.onderwerp,
          fragment: m.tekst.slice(0, 300),
          datum: m.verzonden.toISOString(),
        })),
      ...allePost
        .filter((p) => p.leadId === l.id)
        .map((p) => ({
          richting: p.richting as "uit" | "in",
          via: p.bron === "soverin-inbox" ? "reactie" : p.bron === "contactformulier" ? "contactformulier" : "eigen mail",
          onderwerp: p.onderwerp,
          fragment: p.fragment,
          datum: p.datum.toISOString(),
        })),
    ].sort((a, b) => b.datum.localeCompare(a.datum));
    if (regels.length > 0) tijdlijn.set(l.id, regels);
  }

  const concepten = (alle ?? [])
    .filter((l) => l.conceptTekst && l.conceptOnderwerp && l.conceptSoort)
    .map((l) => ({
      id: l.id,
      naam: l.naam,
      email: l.email,
      website: l.website,
      soort: l.conceptSoort as MailStap,
      onderwerp: l.conceptOnderwerp!,
      tekst: l.conceptTekst!,
    }));

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

      <BijwerkKnop />

      {concepten.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-2xl font-semibold tracking-tight">📤 Klaarstaande mails</h2>
          <p className="mt-1 text-sm text-stone-600">
            Eerste mails en opvolgers, klaargezet door de AI — er gaat niets weg zonder jouw klik.
          </p>
          <div className="mt-3 grid gap-3">
            {concepten.map((c) => (
              <OpvolgKaart key={c.id} concept={c} />
            ))}
          </div>
        </section>
      )}

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
            oordeel: l.oordeel,
            conceptSoort: l.conceptSoort,
            heeftConcept: Boolean(l.conceptTekst),
            bijgewerkt: l.bijgewerkt.toISOString(),
          }))}
          post={Object.fromEntries(tijdlijn)}
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
