import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { formulierBevestigingen, sites } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { BRON_LABEL, type Bron } from "@/lib/formulier-bevestiging";

export const metadata: Metadata = { title: "Formulieren", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Alle formulieren van alle klanten: welke tekst ze gebruiken en wie hem het laatst aanpaste. */
export default async function FormulierenOverzicht() {
  await requireAdmin();
  const alleSites = await db.select().from(sites).orderBy(asc(sites.naam));
  const rijen = await db
    .select()
    .from(formulierBevestigingen)
    .orderBy(asc(formulierBevestigingen.formulier))
    .catch(() => []);
  const perSite = alleSites
    .map((s) => ({ site: s, formulieren: rijen.filter((r) => r.siteId === s.id) }))
    .filter((x) => x.formulieren.length > 0 || (!x.site.isDemo && x.site.githubRepo !== "wordswap"));
  const telling = (bron: Bron) => rijen.filter((r) => r.bron === bron).length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/admin" className="text-sm text-stone-500 hover:text-violet-700">
        ← Admin
      </Link>
      <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">✉️ Formulieren</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-600">
        Per formulier de bevestigingsmail die invullers krijgen. Aanpassen doe je bij de klant (blok
        Bevestigingsmails), de klant kan het zelf in zijn portaal. Nieuwe formulieren worden bij elke publicatie
        herkend en krijgen één voorstel van de AI.
      </p>
      <p className="mt-3 flex flex-wrap gap-2 text-xs">
        {(Object.keys(BRON_LABEL) as Bron[]).map((b) => (
          <span key={b} className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-stone-600">
            {BRON_LABEL[b]}: <strong>{telling(b)}</strong>
          </span>
        ))}
        <span className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-stone-600">
          Uitgezet: <strong>{rijen.filter((r) => !r.aan).length}</strong>
        </span>
      </p>
      <div className="mt-8 space-y-4">
        {perSite.map(({ site, formulieren }) => (
          <section key={site.id} className="rounded-3xl border border-stone-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">{site.naam}</h2>
              <Link href={`/admin/klant/${site.id}`} className="text-sm font-semibold text-violet-700 hover:underline">
                Aanpassen bij de klant →
              </Link>
            </div>
            {formulieren.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">Nog geen formulieren ingelezen.</p>
            ) : (
              <ul className="mt-3 divide-y divide-stone-100">
                {formulieren.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                    <span className="font-medium text-stone-800">{f.formulier}</span>
                    <span className="min-w-0 flex-1 truncate text-stone-500">{f.onderwerp}</span>
                    <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs text-stone-600">
                      {BRON_LABEL[(f.bron in BRON_LABEL ? f.bron : "standaard") as Bron]}
                    </span>
                    {!f.aan && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">uit</span>}
                    {(f.paginas as string[]).length === 0 && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">niet meer op de site</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
