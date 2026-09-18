import { duurInWoorden, komendeWerkdagen, momentInWoorden } from "@/lib/afspraken";
import { afspraakStand } from "@/lib/afspraken-db";
import { bevestigAfspraak, verwijderAfspraakBlok } from "../../acties-afspraken";
import AfzegMetReden from "./AfzegMetReden";
import DagKlaarzetten from "./DagKlaarzetten";
import AfspraakMailKnop from "./AfspraakMailKnop";
import ActieKnop from "./ActieKnop";

function dagTekst(datum: string): string {
  return new Date(`${datum}T12:00:00`).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
}

/**
 * Afspraken per klant: dagen klaarzetten, aanvragen bevestigen. Zolang er niets
 * klaarstaat ziet de klant hier ook niets van.
 */
export default async function AfsprakenBlok({ siteId }: { siteId: number }) {
  const { blokken, afspraken: rijen, token, mailOp } = await afspraakStand(siteId);
  const morgen = komendeWerkdagen(1)[0];
  const planLink = token ? `https://www.wordswap.nl/afspraak/${token}` : null;

  return (
    <div id="afspraken" className="mt-6 rounded-3xl border border-stone-200 bg-white p-6">
      <h2 className="font-display text-xl font-semibold">📅 Afspraak inplannen</h2>
      <p className="mt-2 text-sm text-stone-600">
        Zet hier dagen klaar waarop deze klant met jou kan afspreken. De klant ziet ze in zijn portaal (en via de
        planlink) en kiest een starttijd, steeds op het hele of halve uur. Jij bevestigt; dan gaat er een mail uit met
        een agendabestand en verdwijnen de voorgestelde dagen. Staat er niets klaar, dan ziet de klant er niets van.
      </p>

      {rijen.length > 0 && (
        <div className="mt-4 space-y-2">
          {rijen.map((a) =>
            a.status === "bevestigd" ? (
              <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                <span>
                  ✓ Afgesproken: <strong>{momentInWoorden(a.start, a.duurMinuten)}</strong>
                  {a.naam ? ` met ${a.naam}` : ""}
                  {a.telefoon ? ` · ${a.telefoon}` : ""}
                  {a.opmerking ? ` · "${a.opmerking}"` : ""}
                </span>
                <AfzegMetReden siteId={siteId} afspraakId={a.id} label="Afzeggen" />
              </div>
            ) : (
              <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <span>
                  {a.ingelogd ? "✅ " : "🔗 "}
                  Aangevraagd: <strong>{momentInWoorden(a.start, a.duurMinuten)}</strong>
                  {a.naam ? ` door ${a.naam}` : ""}
                  {a.email ? ` (${a.email})` : ""}
                  {a.telefoon ? ` · ${a.telefoon}` : ""}
                  {a.opmerking ? ` · "${a.opmerking}"` : ""}
                  {a.ingelogd ? " · ingelogd als deze klant" : " · via de planlink (gegevens niet gecontroleerd)"}
                </span>
                <form action={bevestigAfspraak}>
                  <input type="hidden" name="siteId" value={siteId} />
                  <input type="hidden" name="afspraakId" value={a.id} />
                  <ActieKnop
                    label="Bevestigen"
                    bezigLabel="Bevestigen..."
                    klaarLabel="✓ Bevestigd"
                    className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                  />
                </form>
                <AfzegMetReden siteId={siteId} afspraakId={a.id} label="Afwijzen" />
              </div>
            ),
          )}
        </div>
      )}

      <DagKlaarzetten siteId={siteId} startDatum={morgen} />

      {blokken.length > 0 ? (
        <ul className="mt-4 space-y-1 text-sm text-stone-700">
          {blokken.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-3">
              <span>
                {dagTekst(b.datum)} · {b.van}–{b.tot} · gesprek van {duurInWoorden(b.duurMinuten)}
              </span>
              <form action={verwijderAfspraakBlok}>
                <input type="hidden" name="siteId" value={siteId} />
                <input type="hidden" name="blokId" value={b.id} />
                <ActieKnop label="Weghalen" bezigLabel="..." klaarLabel="✓" className="text-xs font-semibold text-stone-500 underline cursor-pointer" />
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-stone-500">Er staat niets klaar; de klant ziet dus ook niets.</p>
      )}

      {blokken.length > 0 && (
        <AfspraakMailKnop
          siteId={siteId}
          verstuurdOp={
            mailOp
              ? mailOp.toLocaleString("nl-NL", {
                  timeZone: "Europe/Amsterdam",
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : null
          }
        />
      )}

      {planLink && (
        <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500">
          Planlink om te mailen of appen (werkt ook zonder account):{" "}
          <a href={planLink} className="font-semibold text-violet-700 hover:underline">
            {planLink}
          </a>
        </p>
      )}
    </div>
  );
}
