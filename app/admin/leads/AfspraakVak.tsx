"use client";

import { duurInWoorden, momentInWoorden } from "@/lib/afspraken";
import { afspraakHandmatig, bevestigAfspraak, verwijderAfspraakBlok } from "../acties-afspraken";
import ActieKnop from "../klant/[id]/ActieKnop";
import AfspraakMailKnop from "../klant/[id]/AfspraakMailKnop";
import AfzegMetReden from "../klant/[id]/AfzegMetReden";
import DagKlaarzetten from "../klant/[id]/DagKlaarzetten";
import MailVoorbeeldKnop from "../klant/[id]/MailVoorbeeldKnop";

export type LeadAfspraak = {
  id: number;
  startIso: string;
  duurMinuten: number;
  status: string;
  naam: string | null;
  email: string | null;
  telefoon: string | null;
  opmerking: string | null;
};
export type LeadBlok = { id: number; datum: string; van: string; tot: string; duurMinuten: number };
export type LeadAfspraakStand = {
  blokken: LeadBlok[];
  afspraken: LeadAfspraak[];
  token: string | null;
  mailOpTekst: string | null;
};

function dagTekst(datum: string): string {
  return new Date(`${datum}T12:00:00`).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
}

/**
 * Kennismaken met een potentiële klant: dezelfde afsprakenmodule als bij een
 * klant, maar gehangen aan de lead. Er is nog geen portaal en nog geen account,
 * dus alles loopt via de planlink, en bij het bevestigen kan Jos een Zoom- of
 * Teams-link meegeven in plaats van te bellen.
 */
export default function AfspraakVak({
  leadId,
  stand,
  startDatum,
  heeftEmail,
}: {
  leadId: number;
  stand: LeadAfspraakStand;
  startDatum: string;
  heeftEmail: boolean;
}) {
  const planLink = stand.token ? `https://www.wordswap.nl/afspraak/${stand.token}` : null;

  return (
    <div className="mt-3 rounded-xl border border-stone-200 bg-white px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">📅 Kennismaken</p>
      <p className="mt-1 text-sm text-stone-600">
        Zet dagen klaar en stuur het voorstel; hij kiest zelf een moment. Staat er niets klaar, dan gaat er ook niets uit.
      </p>

      {stand.afspraken.length > 0 && (
        <div className="mt-3 space-y-2">
          {stand.afspraken.map((a) =>
            a.status === "bevestigd" ? (
              <div
                key={a.id}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
              >
                <span>
                  ✓ Afgesproken: <strong>{momentInWoorden(new Date(a.startIso), a.duurMinuten)}</strong>
                  {a.naam ? ` met ${a.naam}` : ""}
                  {a.telefoon ? ` · ${a.telefoon}` : ""}
                  {a.opmerking ? ` · "${a.opmerking}"` : ""}
                </span>
                <AfzegMetReden leadId={leadId} afspraakId={a.id} label="Afzeggen" />
              </div>
            ) : (
              <div
                key={a.id}
                className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900"
              >
                <span>
                  🔗 Aangevraagd: <strong>{momentInWoorden(new Date(a.startIso), a.duurMinuten)}</strong>
                  {a.naam ? ` door ${a.naam}` : ""}
                  {a.email ? ` (${a.email})` : ""}
                  {a.telefoon ? ` · ${a.telefoon}` : ""}
                  {a.opmerking ? ` · "${a.opmerking}"` : ""}
                </span>
                <form action={bevestigAfspraak} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="leadId" value={leadId} />
                  <input type="hidden" name="afspraakId" value={a.id} />
                  <input
                    name="contact"
                    defaultValue={a.telefoon ?? ""}
                    placeholder="Bellen op… of bv. 'Ik stuur je een Zoom-link.'"
                    title="Leeg = bellen op het opgegeven nummer. Een zin wordt letterlijk in de mail en op de planpagina gezet."
                    className="w-56 rounded-lg border border-stone-300 px-2.5 py-1 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                  <input
                    name="bericht"
                    placeholder="Eigen berichtje in de mail (mag leeg)"
                    className="w-56 rounded-lg border border-stone-300 px-2.5 py-1 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                  <input
                    name="onderwerp"
                    placeholder="Onderwerp van de mail (leeg = 'Afspraak bevestigd: ...')"
                    title="Eigen onderwerpregel voor de bevestigingsmail. Leeg = 'Afspraak bevestigd:' met het moment erachter."
                    className="w-56 rounded-lg border border-stone-300 px-2.5 py-1 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                  <MailVoorbeeldKnop
                    klein
                    soort="afspraak-bevestiging"
                    leadId={leadId}
                    extra={{ afspraakId: String(a.id) }}
                    velden={[["contact", "contact"], ["bericht", "bericht"], ["onderwerp", "onderwerp"]]}
                  />
                  <ActieKnop
                    label="Bevestigen"
                    bezigLabel="Bevestigen..."
                    klaarLabel="✓ Bevestigd"
                    className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                  />
                </form>
                <AfzegMetReden leadId={leadId} afspraakId={a.id} label="Afwijzen" />
              </div>
            ),
          )}
        </div>
      )}

      <DagKlaarzetten leadId={leadId} startDatum={startDatum} />

      {stand.blokken.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-stone-700">
          {stand.blokken.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-3">
              <span>
                {dagTekst(b.datum)} · {b.van}–{b.tot} · gesprek van {duurInWoorden(b.duurMinuten)}
              </span>
              <form action={verwijderAfspraakBlok}>
                <input type="hidden" name="leadId" value={leadId} />
                <input type="hidden" name="blokId" value={b.id} />
                <ActieKnop
                  label="Weghalen"
                  bezigLabel="..."
                  klaarLabel="✓"
                  className="text-xs font-semibold text-stone-500 underline cursor-pointer"
                />
              </form>
            </li>
          ))}
        </ul>
      )}

      {stand.blokken.length > 0 &&
        (heeftEmail ? (
          <AfspraakMailKnop leadId={leadId} verstuurdOp={stand.mailOpTekst} />
        ) : (
          <p className="mt-3 text-sm text-amber-800">
            Vul eerst een e-mailadres in bij zijn gegevens, dan kun je het voorstel mailen. De planlink hieronder kun je
            wel al appen.
          </p>
        ))}

      <details className="mt-3 border-t border-stone-100 pt-2">
        <summary className="cursor-pointer text-xs font-semibold text-violet-700">
          ✍️ Zelf een afspraak vastleggen (al afgesproken per mail of telefoon)
        </summary>
        <p className="mt-1.5 text-xs text-stone-500">
          Voor als je het al geregeld hebt en hij de planlink dus nooit heeft gebruikt. Er gaat{" "}
          <strong>geen mail</strong> uit: die heeft hij al van jou gehad. De afspraak staat meteen in je agenda en
          houdt dat tijdvak vrij in je planlink.
        </p>
        <form action={afspraakHandmatig} className="mt-2 flex flex-wrap items-end gap-2">
          <input type="hidden" name="leadId" value={leadId} />
          <label className="text-xs font-semibold text-stone-600">
            Wanneer
            <input
              name="datum"
              type="date"
              required
              defaultValue={startDatum}
              className="mt-0.5 block rounded-lg border border-stone-300 px-2.5 py-1 text-xs focus:border-violet-600 focus:outline-none"
            />
          </label>
          <label className="text-xs font-semibold text-stone-600">
            Hoe laat
            <input
              name="tijd"
              type="time"
              required
              step={900}
              defaultValue="10:00"
              className="mt-0.5 block rounded-lg border border-stone-300 px-2.5 py-1 text-xs focus:border-violet-600 focus:outline-none"
            />
          </label>
          <label className="text-xs font-semibold text-stone-600">
            Hoe lang
            <select
              name="duur"
              defaultValue="30"
              className="mt-0.5 block rounded-lg border border-stone-300 px-2.5 py-1 text-xs focus:border-violet-600 focus:outline-none"
            >
              <option value="30">30 minuten</option>
              <option value="60">1 uur</option>
              <option value="90">1,5 uur</option>
              <option value="120">2 uur</option>
            </select>
          </label>
          <input
            name="contact"
            placeholder="Hoe? (leeg = bellen)"
            title="Leeg betekent bellen. Een zin als 'Ik stuur een Teams-link.' wordt letterlijk overgenomen."
            className="w-48 rounded-lg border border-stone-300 px-2.5 py-1 text-xs focus:border-violet-600 focus:outline-none"
          />
          <input
            name="onderwerp"
            placeholder="Waar gaat het over? (mag leeg)"
            className="w-48 rounded-lg border border-stone-300 px-2.5 py-1 text-xs focus:border-violet-600 focus:outline-none"
          />
          <ActieKnop
            label="Vastleggen"
            bezigLabel="Vastleggen..."
            klaarLabel="✓ Staat erin"
            className="rounded-full bg-violet-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-600 cursor-pointer"
          />
        </form>
      </details>

      {planLink && (
        <p className="mt-3 border-t border-stone-100 pt-2 text-xs text-stone-500">
          Planlink om te mailen of appen (werkt zonder account):{" "}
          <a href={planLink} className="font-semibold text-violet-700 hover:underline">
            {planLink}
          </a>
        </p>
      )}
    </div>
  );
}
