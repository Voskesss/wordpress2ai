import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { leadActies, leads } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { LEAD_STATUSSEN, statusInfo, vandaag } from "@/lib/leads";
import {
  actieAfvinken,
  actieToevoegen,
  actieVerwijderen,
  leadBijwerken,
  leadToevoegen,
  leadVerwijderen,
} from "../acties-leads";
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
type Actie = typeof leadActies.$inferSelect;

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
      <label className="block text-sm font-semibold sm:col-span-2">
        Notities
        <textarea name="notities" rows={3} defaultValue={lead?.notities ?? ""} className={invoer} />
      </label>
    </div>
  );
}

function ActieRegel({ actie, nu }: { actie: Actie; nu: string }) {
  const teLaat = !actie.gedaan && actie.datum && actie.datum < nu;
  const isVandaag = !actie.gedaan && actie.datum === nu;
  return (
    <li className="flex items-start gap-2 py-1">
      <form action={actieAfvinken}>
        <input type="hidden" name="id" value={actie.id} />
        <input type="hidden" name="gedaan" value={actie.gedaan ? "0" : "1"} />
        <button
          type="submit"
          title={actie.gedaan ? "Terugzetten naar open" : "Afvinken"}
          className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border text-xs cursor-pointer ${
            actie.gedaan
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-stone-400 bg-white text-transparent hover:border-emerald-600 hover:text-emerald-600"
          }`}
        >
          ✓
        </button>
      </form>
      <div className="min-w-0 flex-1 text-sm">
        <span className={actie.gedaan ? "text-stone-400 line-through" : "text-stone-800"}>{actie.tekst}</span>
        {actie.gedaan && actie.gedaanOp ? (
          <span className="ml-2 text-xs text-stone-400">
            gedaan {actie.gedaanOp.toLocaleDateString("nl-NL", { day: "numeric", month: "short", timeZone: "Europe/Amsterdam" })}
          </span>
        ) : (
          actie.datum && (
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                teLaat ? "bg-red-100 text-red-800" : isVandaag ? "bg-amber-100 text-amber-900" : "bg-stone-100 text-stone-600"
              }`}
            >
              {teLaat ? "te laat · " : isVandaag ? "vandaag · " : ""}
              {datumTekst(actie.datum)}
            </span>
          )
        )}
      </div>
      <form action={actieVerwijderen}>
        <input type="hidden" name="id" value={actie.id} />
        <button type="submit" title="Actie verwijderen" className="text-xs text-stone-300 hover:text-red-600 cursor-pointer">
          ✕
        </button>
      </form>
    </li>
  );
}

function LeadKaart({ lead, acties, nu }: { lead: Lead; acties: Actie[]; nu: string }) {
  const s = statusInfo(lead.status);
  const openActies = acties
    .filter((a) => !a.gedaan)
    .sort((a, b) => (a.datum ?? "9999").localeCompare(b.datum ?? "9999"));
  const gedaan = acties
    .filter((a) => a.gedaan)
    .sort((a, b) => (b.gedaanOp?.getTime() ?? 0) - (a.gedaanOp?.getTime() ?? 0));
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
      <p className="mt-1 text-xs text-stone-500">
        {[lead.email, lead.telefoon].filter(Boolean).join(" · ") || "Nog geen e-mail of telefoon"}
      </p>

      <div className="mt-3 rounded-xl bg-stone-50 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Acties</p>
        {openActies.length > 0 ? (
          <ul className="mt-1">
            {openActies.map((a) => (
              <ActieRegel key={a.id} actie={a} nu={nu} />
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-stone-400">Geen open acties.</p>
        )}
        <form action={actieToevoegen} className="mt-2 flex flex-wrap items-center gap-2">
          <input type="hidden" name="leadId" value={lead.id} />
          <input
            name="actie"
            required
            placeholder="Nieuwe actie, bijv. nabellen"
            className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm focus:border-violet-600 focus:outline-none"
          />
          <input
            name="datum"
            type="date"
            className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm focus:border-violet-600 focus:outline-none"
          />
          <ActieKnop
            label="＋ Toevoegen"
            bezigLabel="..."
            klaarLabel="✓"
            className="rounded-full bg-violet-700 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-violet-600 cursor-pointer"
          />
        </form>
        {gedaan.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-semibold text-stone-500">Gedaan ({gedaan.length})</summary>
            <ul className="mt-1">
              {gedaan.map((a) => (
                <ActieRegel key={a.id} actie={a} nu={nu} />
              ))}
            </ul>
          </details>
        )}
      </div>

      {lead.notities && <p className="mt-3 whitespace-pre-line text-sm text-stone-600">{lead.notities}</p>}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold text-violet-700">Gegevens en status bijwerken</summary>
        <form action={leadBijwerken} className="mt-3">
          <input type="hidden" name="id" value={lead.id} />
          <LeadVelden lead={lead} />
          <ActieKnop label="Opslaan" bezigLabel="Opslaan..." className="mt-3 rounded-full bg-violet-700 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-600 cursor-pointer" />
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
  const alleActies = await db.select().from(leadActies).catch(() => null);
  const actiesPerLead = new Map<number, Actie[]>();
  for (const a of alleActies ?? []) {
    if (!actiesPerLead.has(a.leadId)) actiesPerLead.set(a.leadId, []);
    actiesPerLead.get(a.leadId)!.push(a);
  }
  const eersteDatum = (l: Lead) =>
    (actiesPerLead.get(l.id) ?? [])
      .filter((a) => !a.gedaan && a.datum)
      .map((a) => a.datum!)
      .sort()[0] ?? "9999";
  const open = (alle ?? [])
    .filter((l) => statusInfo(l.status).open)
    .sort((a, b) => eersteDatum(a).localeCompare(eersteDatum(b)));
  const dicht = (alle ?? []).filter((l) => !statusInfo(l.status).open);
  const teDoen = (alleActies ?? []).filter((a) => !a.gedaan && a.datum && a.datum <= nu).length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/admin" className="text-sm text-stone-500 hover:text-violet-700">
        ← Alle klanten
      </Link>
      <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">🎯 Leads</h1>
      <p className="mt-3 text-stone-600 leading-relaxed max-w-2xl">
        Iedereen die zelf contact zocht, met hun status en jouw acties. Nieuwe aanvragen vind je in het{" "}
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
        <>
          <p className="mt-6 text-sm font-semibold text-stone-700">
            {teDoen > 0 ? `🔔 ${teDoen} ${teDoen === 1 ? "actie staat" : "acties staan"} voor vandaag of eerder` : "✓ Niets meer voor vandaag"}
            <span className="font-normal text-stone-500"> · {open.length} open leads</span>
          </p>

          <details className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white p-4" open={open.length === 0}>
            <summary className="cursor-pointer text-sm font-semibold text-violet-700">＋ Nieuwe lead toevoegen</summary>
            <form action={leadToevoegen} className="mt-3">
              <LeadVelden />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-semibold">
                  Eerste actie
                  <input name="actie" placeholder="Bijv. mail sturen" className={invoer} />
                </label>
                <label className="block text-sm font-semibold">
                  Wanneer
                  <input name="datum" type="date" defaultValue={nu} className={invoer} />
                </label>
              </div>
              <ActieKnop label="Lead toevoegen" bezigLabel="Toevoegen..." klaarLabel="✓ Toegevoegd" className="mt-3 rounded-full bg-violet-700 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-600 cursor-pointer" />
            </form>
          </details>

          <div className="mt-4 space-y-3">
            {open.map((l) => (
              <LeadKaart key={l.id} lead={l} acties={actiesPerLead.get(l.id) ?? []} nu={nu} />
            ))}
          </div>

          {dicht.length > 0 && (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-semibold text-stone-600">Afgerond ({dicht.length})</summary>
              <div className="mt-3 space-y-3">
                {dicht.map((l) => (
                  <LeadKaart key={l.id} lead={l} acties={actiesPerLead.get(l.id) ?? []} nu={nu} />
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
