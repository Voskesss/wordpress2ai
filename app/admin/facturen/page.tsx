import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { facturen } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { euroTekst } from "@/lib/mollie";

export const metadata: Metadata = {
  title: "Facturen",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

export default async function Facturen() {
  await requireAdmin();
  const alle = await db.select().from(facturen).orderBy(desc(facturen.id)).catch(() => null);
  const perMaand = new Map<string, NonNullable<typeof alle>>();
  for (const f of alle ?? []) {
    if (!f.nummer) continue;
    const maand = f.datum.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }).slice(0, 7);
    if (!perMaand.has(maand)) perMaand.set(maand, []);
    perMaand.get(maand)!.push(f);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/admin" className="text-sm text-stone-500 hover:text-violet-700">
        ← Alle klanten
      </Link>
      <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">🧾 Facturen</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-stone-600">
        Facturen van WordSwap-abonnementen (reeks WS-JJJJ-NNNN). Ze worden automatisch gemaakt en gemaild zodra een betaling
        binnen is. Download per maand het bestand voor SnelStart of je boekhouder. Je SnelStart-facturen hebben een eigen
        nummerreeks, dus die lopen niet door elkaar.
      </p>

      {alle === null ? (
        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          De factuurtabel is nog niet aangemaakt. Draai eerst de migratie <code>db/migrations/20260915-facturen.sql</code>.
        </p>
      ) : perMaand.size === 0 ? (
        <p className="mt-6 text-sm text-stone-500">Nog geen facturen. Die verschijnen hier na de eerste betaling.</p>
      ) : (
        [...perMaand.entries()].map(([maand, lijst]) => {
          const [jaar, m] = maand.split("-");
          const totaal = lijst.reduce((s, f) => s + f.totaalCent, 0);
          const btw = lijst.reduce((s, f) => s + f.btwCent, 0);
          return (
            <section key={maand} className="mt-8 overflow-hidden rounded-2xl border border-stone-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-4 py-3">
                <div>
                  <h2 className="font-semibold capitalize">
                    {MAANDEN[Number(m) - 1]} {jaar}
                  </h2>
                  <p className="text-xs text-stone-500">
                    {lijst.length} {lijst.length === 1 ? "factuur" : "facturen"} · totaal {euroTekst(totaal)} · waarvan btw {euroTekst(btw)}
                  </p>
                </div>
                <a
                  href={`/api/admin/facturen-export?maand=${maand}`}
                  className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700"
                >
                  ⬇ Download voor SnelStart
                </a>
              </div>
              <ul className="divide-y divide-stone-100 text-sm">
                {lijst.map((f) => (
                  <li key={f.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:grid-cols-[9rem_minmax(0,1fr)_6rem_7rem]">
                    <a href={`/api/admin/factuur/${f.nummer}`} target="_blank" rel="noreferrer" className="font-semibold text-violet-700 hover:underline">
                      {f.nummer}
                    </a>
                    <span className="truncate text-stone-700">
                      <Link href={`/admin/klant/${f.siteId}#abonnement`} className="hover:underline">
                        {f.klantBedrijf ?? f.klantNaam}
                      </Link>
                      <span className="ml-2 text-xs text-stone-400">{f.datum.toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" })}</span>
                    </span>
                    <span className="text-right font-medium">{euroTekst(f.totaalCent)}</span>
                    <span className={`text-right text-xs ${f.verstuurd ? "text-emerald-700" : "text-red-700"}`}>
                      {f.verstuurd ? "✓ gemaild" : "niet gemaild"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
