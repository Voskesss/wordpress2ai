import { requireAdmin } from "@/lib/auth";
import { leesRapport } from "@/lib/gezondheid";
import ActieKnop from "@/app/admin/klant/[id]/ActieKnop";
import { nuControleren } from "./acties";

export const dynamic = "force-dynamic";

const KLEUR: Record<string, string> = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
  waarschuwing: "border-amber-200 bg-amber-50 text-amber-900",
  fout: "border-red-200 bg-red-50 text-red-800",
};
const BOL: Record<string, string> = { ok: "🟢", waarschuwing: "🟠", fout: "🔴" };

/** Dashboard: elke stille afhankelijkheid dagelijks echt aangeraakt. */
export default async function GezondheidPagina() {
  await requireAdmin();
  const rapport = await leesRapport();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Gezondheid</h1>
        <form action={nuControleren}>
          <ActieKnop
            label="Nu controleren"
            bezigLabel="Alles aanraken... (±30 s)"
            klaarLabel="✓ Gecontroleerd"
            className="rounded-full bg-violet-700 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-600 cursor-pointer"
          />
        </form>
      </div>
      <p className="mt-2 text-sm text-stone-600">
        Elke nacht raakt de controle alle koppelingen en live klantsites echt aan. Wordt iets rood dat gisteren
        groen was, dan krijg je automatisch één mailtje.
      </p>
      {!rapport && (
        <p className="mt-6 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
          Nog geen meting. Klik op &quot;Nu controleren&quot; voor de eerste.
        </p>
      )}
      {rapport && (
        <>
          <p className="mt-4 text-xs text-stone-500">
            Laatste meting:{" "}
            {new Date(rapport.gemetenOp).toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })}
          </p>
          <div className="mt-4 space-y-2">
            {rapport.checks.map((c) => (
              <div key={c.sleutel} className={`flex items-start gap-3 rounded-xl border px-4 py-2.5 text-sm ${KLEUR[c.status]}`}>
                <span aria-hidden>{BOL[c.status]}</span>
                <div className="min-w-0">
                  <span className="font-semibold">{c.naam}</span>
                  <span className="ml-2">{c.detail}</span>
                </div>
              </div>
            ))}
          </div>
          <h2 className="mt-10 font-display text-xl font-semibold">Pakketversies</h2>
          <p className="mt-1 text-sm text-stone-500">
            Bijwerken blijft een bewuste klus met de volledige teststraat; dit is alleen de wekker.
          </p>
          <div className="mt-3 space-y-2">
            {rapport.versies.map((v) => (
              <div key={v.pakket} className={`flex items-center gap-3 rounded-xl border px-4 py-2 text-sm ${KLEUR[v.status]}`}>
                <span aria-hidden>{BOL[v.status]}</span>
                <code className="font-semibold">{v.pakket}</code>
                <span className="ml-auto">
                  {v.status === "ok" ? v.huidig : `${v.huidig} → ${v.laatste}`}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
