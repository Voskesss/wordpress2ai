"use client";

import { useMemo, useState } from "react";
import { LEAD_STATUSSEN, waLeadLink, statusInfo } from "@/lib/leads";
import {
  actieAfvinken,
  actieToevoegen,
  actieVerwijderen,
  leadBijwerken,
  leadToevoegen,
  leadVerwijderen,
} from "../acties-leads";
import ActieKnop from "../klant/[id]/ActieKnop";
import AfspraakVak, { type LeadAfspraakStand } from "./AfspraakVak";
import KlantKnop from "./KlantKnop";
import AiMailVak from "./AiMailVak";

export type LeadRij = {
  /** Gezet zodra deze lead klant is geworden */
  siteId?: number | null;
  id: number;
  naam: string;
  email: string | null;
  telefoon: string | null;
  website: string | null;
  bron: string | null;
  soort: string;
  status: string;
  notities: string | null;
  oordeel: string | null;
  conceptSoort: string | null;
  heeftConcept: boolean;
  bijgewerkt: string;
};

/** Eén regel in de mail-tijdlijn van een lead (Mailer, eigen Soverin-mail of reactie). */
export type PostRegel = {
  richting: "uit" | "in";
  via: string;
  onderwerp: string | null;
  fragment: string | null;
  datum: string;
};

export type ActieRij = {
  id: number;
  leadId: number;
  tekst: string;
  datum: string | null;
  gedaan: boolean;
  gedaanOp: string | null;
};

const invoer =
  "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 font-normal text-sm focus:border-violet-600 focus:outline-none";

function datumTekst(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
}

function DatumLabel({ datum, nu }: { datum: string; nu: string }) {
  const teLaat = datum < nu;
  const isVandaag = datum === nu;
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        teLaat ? "bg-red-100 text-red-800" : isVandaag ? "bg-amber-100 text-amber-900" : "bg-stone-100 text-stone-600"
      }`}
    >
      {teLaat ? "te laat · " : isVandaag ? "vandaag · " : ""}
      {datumTekst(datum)}
    </span>
  );
}

function LeadVelden({ lead }: { lead?: LeadRij }) {
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
        Oordeel (past dit bij ons?)
        <textarea name="oordeel" rows={2} defaultValue={lead?.oordeel ?? ""} placeholder="Bijv. sterk — echt bedrijf op WordPress" className={invoer} />
      </label>
      <label className="block text-sm font-semibold sm:col-span-2">
        Notities
        <textarea name="notities" rows={3} defaultValue={lead?.notities ?? ""} className={invoer} />
      </label>
    </div>
  );
}

function PostTijdlijn({ regels }: { regels: PostRegel[] }) {
  return (
    <div className="mt-3 rounded-xl border border-stone-200 bg-white px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Mailcontact</p>
      <ul className="mt-1 space-y-1.5">
        {regels.map((r, i) => (
          <li key={i} className="text-sm">
            <span className={r.richting === "in" ? "font-semibold text-emerald-700" : "text-stone-700"}>
              {r.richting === "in" ? "📥 Reactie" : r.via === "contactformulier" ? "📮 Via hun contactformulier" : `📤 Gemaild (${r.via})`}
            </span>{" "}
            <span className="text-xs text-stone-400">
              {new Date(r.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Amsterdam" })}
            </span>
            {r.onderwerp && <span className="text-stone-500"> · {r.onderwerp}</span>}
            {r.fragment && (
              <details className="mt-0.5">
                <summary className="cursor-pointer text-xs text-violet-700">tekst</summary>
                <p className="mt-1 whitespace-pre-line rounded-lg bg-stone-50 p-2 text-xs text-stone-600">{r.fragment}</p>
              </details>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Wat er als laatste gebeurde met deze lead.
 *
 * Waarom dit er moest komen: in de rij stond alleen de VOLGENDE actie. Jos
 * mailde iemand vanuit zijn eigen postbus en zag dat nergens terug, dus leek
 * het alsof er niets gebeurd was. Nu staat het er, ongeacht of de mail uit de
 * Mailer kwam of uit Soverin.
 */
function LaatsteContact({ regel }: { regel?: PostRegel }) {
  if (!regel) return <span className="text-xs text-stone-300">nog geen contact</span>;
  const wat = regel.richting === "in" ? "reactie" : "gemaild";
  const dag = new Date(regel.datum).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Amsterdam",
  });
  return (
    <span className="truncate text-xs text-stone-400" title={regel.onderwerp ?? undefined}>
      {regel.richting === "in" ? "↙" : "↗"} {wat} · {dag}
      {regel.via && regel.via !== "reactie" ? ` · ${regel.via}` : ""}
    </span>
  );
}

function ActieRegel({ actie, nu }: { actie: ActieRij; nu: string }) {
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
        <span className={actie.gedaan ? "text-stone-400 line-through" : "text-stone-800"}>{actie.tekst}</span>{" "}
        {actie.gedaan && actie.gedaanOp ? (
          <span className="text-xs text-stone-400">
            gedaan {new Date(actie.gedaanOp).toLocaleDateString("nl-NL", { day: "numeric", month: "short", timeZone: "Europe/Amsterdam" })}
          </span>
        ) : (
          actie.datum && <DatumLabel datum={actie.datum} nu={nu} />
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

function LeadKaart({
  lead,
  acties,
  post,
  nu,
  afspraken,
  morgen,
  repoVoorstel,
}: {
  lead: LeadRij;
  acties: ActieRij[];
  post: PostRegel[];
  nu: string;
  afspraken: LeadAfspraakStand;
  morgen: string;
  repoVoorstel: string;
}) {
  const openActies = acties.filter((a) => !a.gedaan).sort((a, b) => (a.datum ?? "9999").localeCompare(b.datum ?? "9999"));
  const gedaan = acties.filter((a) => a.gedaan).sort((a, b) => (b.gedaanOp ?? "").localeCompare(a.gedaanOp ?? ""));
  return (
    <div className="border-t border-stone-200 bg-stone-50/60 px-4 pb-5 pt-3">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
        {!lead.email && !lead.telefoon && <span>Nog geen e-mail of telefoon</span>}
        {lead.email && (
          <a href={`mailto:${lead.email}`} className="hover:text-violet-700 hover:underline">
            {lead.email}
          </a>
        )}
        {lead.telefoon && waLeadLink(lead.telefoon, lead.naam, "") ? (
          <a
            href={waLeadLink(lead.telefoon, lead.naam, "") ?? undefined}
            target="_blank"
            rel="noreferrer"
            title="Open dit nummer in WhatsApp"
            className="hover:text-emerald-700 hover:underline"
          >
            {lead.telefoon}
          </a>
        ) : (
          lead.telefoon && <span>{lead.telefoon}</span>
        )}
        {waLeadLink(lead.telefoon, lead.naam) && (
          <a
            href={waLeadLink(lead.telefoon, lead.naam) ?? undefined}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            📱 App: net gemaild
          </a>
        )}
        {lead.bron && <span>· via {lead.bron}</span>}
        {lead.soort === "partner" && <span>· partner</span>}
      </p>

      {lead.oordeel && (
        <p className="mt-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
          🤖 {lead.oordeel}
        </p>
      )}
      {lead.heeftConcept && (
        <p className="mt-2 text-sm font-medium text-amber-800">⏳ Er staat een mail klaar — zie bovenaan de pagina.</p>
      )}
      {!lead.heeftConcept && statusInfo(lead.status).open && lead.email && <AiMailVak leadId={lead.id} heeftConcept={false} />}

      {post.length > 0 && <PostTijdlijn regels={post} />}

      <div className="mt-3 rounded-xl border border-stone-200 bg-white px-3 py-2">
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
          <input name="datum" type="date" className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm focus:border-violet-600 focus:outline-none" />
          <ActieKnop label="＋ Toevoegen" bezigLabel="..." klaarLabel="✓" className="rounded-full bg-violet-700 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-violet-600 cursor-pointer" />
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

      <AfspraakVak leadId={lead.id} stand={afspraken} startDatum={morgen} heeftEmail={Boolean(lead.email)} />

      {lead.siteId ? (
        <p className="mt-3 text-sm text-emerald-800">
          ✓ Klant geworden ·{" "}
          <a href={`/admin/klant/${lead.siteId}`} className="font-semibold underline">
            naar de klantpagina
          </a>
        </p>
      ) : (
        <KlantKnop leadId={lead.id} naam={lead.naam} voorstel={repoVoorstel} />
      )}

      {lead.notities && <p className="mt-3 whitespace-pre-line text-sm text-stone-600">{lead.notities}</p>}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold text-violet-700">Gegevens en status bijwerken</summary>
        <form key={lead.bijgewerkt} action={leadBijwerken} className="mt-3">
          <input type="hidden" name="id" value={lead.id} />
          <LeadVelden lead={lead} />
          <ActieKnop label="Opslaan" bezigLabel="Opslaan..." className="mt-3 rounded-full bg-violet-700 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-600 cursor-pointer" />
        </form>
        <form
          action={leadVerwijderen}
          className="mt-2"
          onSubmit={(e) => {
            if (!confirm(`${lead.naam} en alle acties verwijderen?`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={lead.id} />
          <ActieKnop label="Lead verwijderen" bezigLabel="Verwijderen..." klaarLabel="Verwijderd" className="text-xs text-red-600 hover:underline cursor-pointer" />
        </form>
      </details>
    </div>
  );
}

export default function LeadLijst({
  leads,
  acties,
  post,
  nu,
  afspraken,
  morgen,
  repoVoorstellen,
}: {
  leads: LeadRij[];
  acties: ActieRij[];
  post: Record<number, PostRegel[]>;
  nu: string;
  /** Afspraakstand per lead-id; leads zonder dagen of afspraken staan er niet in */
  afspraken: Record<number, LeadAfspraakStand>;
  /** Eerstvolgende werkdag, als voorzet bij het klaarzetten */
  morgen: string;
  /** Voorgestelde repo-naam per lead-id, voor "wordt klant" */
  repoVoorstellen: Record<number, string>;
}) {
  const [filter, setFilter] = useState("open");
  // Standaard op laatste contact: Jos wil zien bij wie hij het laatst iets
  // gedaan heeft, ook als dat een mail vanuit zijn eigen postbus was. De
  // oude volgorde (eerstvolgende actie) blijft kiesbaar, want die is een
  // takenlijst en dat is iets anders dan een tijdlijn.
  const [sorteer, setSorteer] = useState<"contact" | "actie">("contact");
  const [zoek, setZoek] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const actiesPerLead = useMemo(() => {
    const m = new Map<number, ActieRij[]>();
    for (const a of acties) {
      if (!m.has(a.leadId)) m.set(a.leadId, []);
      m.get(a.leadId)!.push(a);
    }
    return m;
  }, [acties]);

  /** Laatste regel uit de tijdlijn; page.tsx levert die al nieuwste-eerst. */
  const laatste = (id: number) => post[id]?.[0];

  const volgende = (id: number) =>
    (actiesPerLead.get(id) ?? [])
      .filter((a) => !a.gedaan)
      .sort((a, b) => (a.datum ?? "9999").localeCompare(b.datum ?? "9999"))[0];

  const zichtbaar = useMemo(() => {
    const woorden = zoek.toLowerCase().split(/\s+/).filter(Boolean);
    return leads
      .filter((l) =>
        filter === "open" ? statusInfo(l.status).open : filter === "alle" ? true : filter === "partner" ? l.soort === "partner" : l.status === filter,
      )
      .filter((l) => {
        if (woorden.length === 0) return true;
        const tekst = [
          l.naam,
          l.email,
          l.telefoon,
          l.website,
          l.bron,
          l.notities,
          l.oordeel,
          l.soort,
          statusInfo(l.status).label,
          ...(actiesPerLead.get(l.id) ?? []).map((a) => a.tekst),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return woorden.every((w) => tekst.includes(w));
      })
      .sort((a, b) =>
        sorteer === "contact"
          ? // Nieuwste contact bovenaan; wie nog nooit contact had onderaan.
            (laatste(b.id)?.datum ?? "").localeCompare(laatste(a.id)?.datum ?? "")
          : (volgende(a.id)?.datum ?? "9999").localeCompare(volgende(b.id)?.datum ?? "9999")
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, actiesPerLead, filter, zoek, sorteer]);

  const teDoen = acties.filter((a) => !a.gedaan && a.datum && a.datum <= nu).length;
  const aantalOpen = leads.filter((l) => statusInfo(l.status).open).length;

  return (
    <>
      <p className="mt-6 text-sm font-semibold text-stone-700">
        {teDoen > 0 ? `🔔 ${teDoen} ${teDoen === 1 ? "actie staat" : "acties staan"} voor vandaag of eerder` : "✓ Niets meer voor vandaag"}
        <span className="font-normal text-stone-500"> · {aantalOpen} open leads</span>
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          type="search"
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          placeholder="🔍 Zoek op naam, website, e-mail, notitie of actie..."
          className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm focus:border-violet-600 focus:outline-none"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm focus:border-violet-600 focus:outline-none"
        >
          <option value="open">Alle open leads</option>
          <option value="alle">Alles, ook afgerond</option>
          <option value="partner">Partners</option>
          <optgroup label="Per status">
            {LEAD_STATUSSEN.map((s) => (
              <option key={s.waarde} value={s.waarde}>
                {s.label}
              </option>
            ))}
          </optgroup>
        </select>
        <select
          value={sorteer}
          onChange={(e) => setSorteer(e.target.value as "contact" | "actie")}
          title="Waarop de lijst gesorteerd staat"
          className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm focus:border-violet-600 focus:outline-none"
        >
          <option value="contact">Laatste contact bovenaan</option>
          <option value="actie">Eerstvolgende actie bovenaan</option>
        </select>
      </div>

      <details className="mt-3 rounded-2xl border border-dashed border-stone-300 bg-white p-4">
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

      <div className="mt-3 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="hidden grid-cols-[1.1fr_1fr_0.9fr_1.6fr] gap-3 border-b border-stone-200 bg-stone-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-stone-500 sm:grid">
          <span>Wie</span>
          <span>Website</span>
          <span>Status</span>
          <span>Eerstvolgende actie</span>
        </div>
        {zichtbaar.length === 0 && <p className="px-4 py-6 text-center text-sm text-stone-500">Geen leads gevonden.</p>}
        {zichtbaar.map((l) => {
          const s = statusInfo(l.status);
          const v = volgende(l.id);
          const isOpen = openId === l.id;
          return (
            <div key={l.id} className="border-b border-stone-100 last:border-b-0">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : l.id)}
                aria-expanded={isOpen}
                className={`grid w-full grid-cols-1 gap-1 px-4 py-2.5 text-left text-sm hover:bg-violet-50/50 cursor-pointer sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.6fr)] sm:items-center sm:gap-3 ${
                  isOpen ? "bg-violet-50/60" : ""
                }`}
              >
                <span className="truncate font-semibold text-stone-900">
                  <span className="mr-1 inline-block w-3 text-stone-400">{isOpen ? "▾" : "▸"}</span>
                  {l.naam}
                  {l.soort === "partner" && <span className="ml-1.5 text-xs font-normal text-stone-400">partner</span>}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-stone-600">{l.website ?? "—"}</span>
                  {l.telefoon && <span className="truncate text-xs text-stone-400">{l.telefoon}</span>}
                </span>
                <span>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${s.kleur}`}>{s.label}</span>
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <LaatsteContact regel={laatste(l.id)} />
                  <span className="flex min-w-0 items-center gap-1.5 text-stone-700" title={v?.tekst}>
                  {v ? (
                    <>
                      <span className="min-w-0 truncate">{v.tekst}</span>
                      {v.datum && (
                        <span className="shrink-0">
                          <DatumLabel datum={v.datum} nu={nu} />
                        </span>
                      )}
                    </>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </span>
                </span>
              </button>
              {isOpen && (
                <LeadKaart
                  lead={l}
                  acties={actiesPerLead.get(l.id) ?? []}
                  post={post[l.id] ?? []}
                  nu={nu}
                  afspraken={afspraken[l.id] ?? { blokken: [], afspraken: [], token: null, mailOpTekst: null }}
                  morgen={morgen}
                  repoVoorstel={repoVoorstellen[l.id] ?? ""}
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
