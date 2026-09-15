import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { LEAD_STATUSSEN, statusInfo, vandaag } from "@/lib/leads";
import { leadBijwerken, leadToevoegen, leadVerwijderen } from "../acties-leads";
import ActieKnop from "../klant/[id]/ActieKnop";
import LeadVak from "./LeadVak";

export const metadata: Metadata = {
  title: "Leads",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const invoer =
  "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 font-normal text-sm focus:border-violet-600 focus:outline-none";

type Lead = typeof leads.$inferSelect;

function datumTekst(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
}

function LeadVelden({ lead }: { lead?: Lead }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm font-semibold">
        Naam
        <input name="naam" required defaultValue={lead?.naam ?? ""} className={invoer} />
      </label>
      <label className="block text-sm font-semibold">
        Website
        <input name="website" defaultValue={lead?.website ?? ""} placeholder="bedrijfsnaam.nl" className={invoer} />
      </label>
      <label className="block text-sm font-semibold">
        E-mail
        <input name="email" type="email" defaultValue={lead?.email ?? ""} className={invoer} />
      </label>
      <label className="block text-sm font-semibold">
        Telefoon
        <input name="telefoon" type="tel" defaultValue={lead?.telefoon ?? ""} className={invoer} />
      </label>
      <label className="block text-sm font-semibold">
        Status
        <select name="status" defaultValue={lead?.status ?? "nieuw"} className={invoer}>
          {LEAD_STATUSSEN.map((s) => (
            <option key={s.waarde} value={s.waarde}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-semibold">
          Soort
          <select name="soort" defaultValue={lead?.soort ?? "klant"} className={invoer}>
            <option value="klant">Klant</option>
            <option value="partner">Partner</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Bron
          <input name="bron" defaultValue={lead?.bron ?? "Meta-advertentie"} className={invoer} />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        Volgende actie
        <input name="volgendeActie" defaultValue={lead?.volgendeActie ?? ""} placeholder="Bijv. nabellen, kopie maken" className={invoer} />
      </label>
      <label className="block text-sm font-semibold">
        Wanneer
        <input name="actieDatum" type="date" defaultValue={lead?.actieDatum ?? ""} className={invoer} />
      </label>
      <label className="block text-sm font-semibold sm:col-span-2">
        Notities
        <textarea name="notities" rows={3} defaultValue={lead?.notities ?? ""} className={invoer} />
      </label>
    </div>
  );
}

function LeadKaart({ lead, nu }: { lead: Lead; nu: string }) {
  const s = statusInfo(lead.status);
  const teLaat = lead.actieDatum && lead.actieDatum < nu;
  const isVandaag = lead.actieDatum === nu;
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="text-base">{lead.naam}</strong>
        {lead.website && (
          <a href={`https://${lead.website}`} target="_blank" rel="noreferrer" className="text-sm text-violet-700 hover:underline">
            {lead.website} ↗
          </a>
        )}
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.kleur}`}>{s.label}</span>
        {lead.soort === "partner" && (
          <span className="rounded-full border border-stone-300 px-2.5 py-0.5 text-xs font-medium text-stone-600">partner</span>
        )}
        {lead.bron && <span className="text-xs text-stone-400">via {lead.bron}</span>}
      </div>
      {s.open && lead.volgendeActie && (
        <p
          className={`mt-2 rounded-xl px-3 py-2 text-sm ${
            teLaat ? "bg-red-50 text-red-800" : isVandaag ? "bg-amber-50 text-amber-900" : "bg-stone-50 text-stone-700"
          }`}
        >
          👉 <strong>{lead.volgendeActie}</strong>
          {lead.actieDatum && (
            <span className="ml-1">
              · {teLaat ? "te laat, was " : isVandaag ? "vandaag, " : ""}
              {datumTekst(lead.actieDatum)}
            </span>
          )}
        </p>
      )}
      <p className="mt-2 text-xs text-stone-500">
        {[lead.email, lead.telefoon].filter(Boolean).join(" · ") || "Nog geen e-mail of telefoon"}
      </p>
      {lead.notities && <p className="mt-2 whitespace-pre-line text-sm text-stone-600">{lead.notities}</p>}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold text-violet-700">Bijwerken</summary>
        <form action={leadBijwerken} className="mt-3">
          <input type="hidden" name="id" value={lead.id} />
          <LeadVelden lead={lead} />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ActieKnop label="Opslaan" bezigLabel="Opslaan..." className="rounded-full bg-violet-700 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-600 cursor-pointer" />
          </div>
        </form>
        <form action={leadVerwijderen} className="mt-2">
          <input type="hidden" name="id" value={lead.id} />
          <ActieKnop label="Lead verwijderen" bezigLabel="Verwijderen..." klaarLabel="Verwijderd" className="text-xs text-red-600 hover:underline cursor-pointer" />
        </form>
      </details>
    </div>
  );
}

export default async function Leads() {
  await requireAdmin();
  const nu = vandaag();
  const alle = await db.select().from(leads).orderBy(desc(leads.id)).catch(() => null);
  const open = (alle ?? [])
    .filter((l) => statusInfo(l.status).open)
    .sort((a, b) => (a.actieDatum ?? "9999").localeCompare(b.actieDatum ?? "9999"));
  const dicht = (alle ?? []).filter((l) => !statusInfo(l.status).open);
  const teDoen = open.filter((l) => l.actieDatum && l.actieDatum <= nu).length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/admin" className="text-sm text-stone-500 hover:text-violet-700">
        ← Alle klanten
      </Link>
      <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">🎯 Leads</h1>
      <p className="mt-3 text-stone-600 leading-relaxed max-w-2xl">
        Iedereen die zelf contact zocht, met de status en wat jij als volgende moet doen. Nieuwe
        aanvragen vind je in het{" "}
        <a href="https://business.facebook.com/latest/leads_center" target="_blank" rel="noreferrer" className="font-semibold text-violet-700 hover:underline">
          Leadcentrum van Meta ↗
        </a>{" "}
        en bij de formulieren van wordswap.nl.
      </p>

      {alle === null ? (
        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          De leadlijst is nog niet aangemaakt in de database. Draai eerst de migratie <code>db/migrations/20260915-leads.sql</code>.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm font-semibold text-stone-700">
            {teDoen > 0 ? `🔔 ${teDoen} ${teDoen === 1 ? "actie staat" : "acties staan"} voor vandaag of eerder` : "✓ Niets meer voor vandaag"}
            <span className="font-normal text-stone-500"> · {open.length} open</span>
          </p>

          <details className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white p-4" open={open.length === 0}>
            <summary className="cursor-pointer text-sm font-semibold text-violet-700">＋ Nieuwe lead toevoegen</summary>
            <form action={leadToevoegen} className="mt-3">
              <LeadVelden />
              <ActieKnop label="Lead toevoegen" bezigLabel="Toevoegen..." klaarLabel="✓ Toegevoegd" className="mt-3 rounded-full bg-violet-700 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-600 cursor-pointer" />
            </form>
          </details>

          <div className="mt-4 space-y-3">
            {open.map((l) => (
              <LeadKaart key={l.id} lead={l} nu={nu} />
            ))}
          </div>

          {dicht.length > 0 && (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-semibold text-stone-600">Afgerond ({dicht.length})</summary>
              <div className="mt-3 space-y-3">
                {dicht.map((l) => (
                  <LeadKaart key={l.id} lead={l} nu={nu} />
                ))}
              </div>
            </details>
          )}
        </>
      )}

      <h2 className="font-display mt-12 text-2xl font-semibold tracking-tight">🔍 Site checken en opvolgmail klaarzetten</h2>
      <p className="mt-2 text-sm text-stone-600">Eerst bellen werkt het best, de mail is het vangnet.</p>
      <LeadVak />
    </div>
  );
}
