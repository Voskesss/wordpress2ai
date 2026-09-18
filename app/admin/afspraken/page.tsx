import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { duurInWoorden } from "@/lib/afspraken";
import { alleKomendeAfspraken } from "@/lib/afspraken-db";
import { bevestigAfspraak } from "../acties-afspraken";
import AfzegMetReden from "../klant/[id]/AfzegMetReden";
import MailVoorbeeldKnop from "../klant/[id]/MailVoorbeeldKnop";
import ActieKnop from "../klant/[id]/ActieKnop";

export const dynamic = "force-dynamic";

function tijdvak(start: Date, duurMinuten: number): string {
  const t = (d: Date) =>
    d.toLocaleTimeString("nl-NL", { timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit" });
  return `${t(start)}–${t(new Date(start.getTime() + duurMinuten * 60_000))}`;
}

function dagKop(start: Date): string {
  return start.toLocaleDateString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Agenda-overzicht: alle komende aanvragen en afspraken van alle klanten. */
export default async function AfsprakenOverzicht() {
  await requireAdmin();
  const rijen = await alleKomendeAfspraken();
  const aanvragen = rijen.filter((r) => r.afspraak.status === "aangevraagd").length;

  // Per dag groeperen, in de volgorde waarin ze al staan (op afspraakdatum)
  const dagen: { kop: string; items: typeof rijen }[] = [];
  for (const rij of rijen) {
    const kop = dagKop(rij.afspraak.start);
    const laatste = dagen[dagen.length - 1];
    if (laatste?.kop === kop) laatste.items.push(rij);
    else dagen.push({ kop, items: [rij] });
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/admin" className="text-sm text-stone-500 hover:text-violet-700">
        ← Admin
      </Link>
      <h1 className="mt-3 font-display text-3xl sm:text-4xl font-semibold tracking-tight">📅 Afspraken</h1>
      <p className="mt-2 text-sm text-stone-600">
        Alle komende afspraken en aanvragen, van al je klanten, op volgorde van de afspraakdatum.
        {aanvragen > 0 && (
          <>
            {" "}
            <strong className="text-amber-800">
              {aanvragen} aanvraag{aanvragen === 1 ? "" : "en"} wacht{aanvragen === 1 ? "" : "en"} op je bevestiging.
            </strong>
          </>
        )}
      </p>

      {dagen.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 text-stone-600">
          Er staat niets gepland. Dagen klaarzetten doe je bij de klant zelf, in het blok &quot;Afspraak inplannen&quot;.
        </p>
      ) : (
        <div className="mt-8 space-y-6">
          {dagen.map((dag) => (
            <section key={dag.kop}>
              <h2 className="font-display text-lg font-semibold text-stone-800">{dag.kop}</h2>
              <div className="mt-2 space-y-2">
                {dag.items.map(({ afspraak: a, siteNaam }) => (
                  <div
                    key={a.id}
                    className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                      a.status === "bevestigd"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "border-amber-200 bg-amber-50 text-amber-900"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      {a.status === "bevestigd" ? "✓" : a.ingelogd ? "⏳ ✅" : "⏳ 🔗"}{" "}
                      <strong>{tijdvak(a.start, a.duurMinuten)}</strong> (
                      {duurInWoorden(a.duurMinuten)}) ·{" "}
                      <Link href={`/admin/klant/${a.siteId}#afspraken-blok`} className="font-semibold underline">
                        {siteNaam}
                      </Link>
                      {a.naam ? ` · ${a.naam}` : ""}
                      {a.telefoon ? ` · ${a.telefoon}` : ""}
                      {a.opmerking ? ` · "${a.opmerking}"` : ""}
                    </span>
                    {a.status === "aangevraagd" && (
                      <>
                        <form action={bevestigAfspraak} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="siteId" value={a.siteId} />
                          <input type="hidden" name="afspraakId" value={a.id} />
                          <input
                            name="contact"
                            defaultValue={a.telefoon ?? ""}
                            placeholder="Bellen op… of bv. 'Ik stuur je een Teams-uitnodiging.'"
                            title="Leeg = bellen op het opgegeven nummer. Een zin wordt letterlijk in de mail gezet."
                            className="w-56 rounded-lg border border-stone-300 px-2.5 py-1 text-xs focus:border-emerald-500 focus:outline-none"
                          />
                          <MailVoorbeeldKnop klein soort="afspraak-bevestiging" siteId={a.siteId} extra={{ afspraakId: String(a.id) }} velden={[["contact", "contact"]]} />
                          <ActieKnop
                            label="Bevestigen"
                            bezigLabel="Bevestigen..."
                            klaarLabel="✓ Bevestigd"
                            className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                          />
                        </form>
                        <AfzegMetReden siteId={a.siteId} afspraakId={a.id} label="Afwijzen" />
                      </>
                    )}
                    {a.status === "bevestigd" && (
                      <AfzegMetReden siteId={a.siteId} afspraakId={a.id} label="Afzeggen" />
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <p className="mt-8 text-xs text-stone-500">
        ⏳ = wacht op jouw bevestiging · ✅ = aangevraagd door de ingelogde klant · 🔗 = via de planlink
      </p>
    </main>
  );
}
