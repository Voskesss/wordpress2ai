import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { aiKosten, changes, formulierInzendingen, messages, sites, usage } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { aanvraagVerwerken } from "./acties";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_KLEUR: Record<string, string> = {
  actief: "bg-emerald-50 border-emerald-200 text-emerald-700",
  migratie: "bg-amber-50 border-amber-200 text-amber-700",
  gepauzeerd: "bg-stone-100 border-stone-200 text-stone-500",
  opgezegd: "bg-red-50 border-red-200 text-red-700",
};

async function demoLeads() {
  const demoSiteIds = await db
    .select({ id: sites.id })
    .from(sites)
    .where(eq(sites.isDemo, true));
  if (demoSiteIds.length === 0) return [];
  const { inArray, isNotNull, and: en, desc, sql } = await import("drizzle-orm");
  const rijen = await db
    .select({
      clerkUserId: messages.clerkUserId,
      laatste: sql<string>`max(${messages.aangemaakt})`,
      aantal: sql<number>`count(*)`,
    })
    .from(messages)
    .where(
      en(
        inArray(messages.siteId, demoSiteIds.map((s) => s.id)),
        isNotNull(messages.clerkUserId),
        eq(messages.rol, "klant")
      )
    )
    .groupBy(messages.clerkUserId)
    .orderBy(desc(sql`max(${messages.aangemaakt})`))
    .then((r) => r.slice(0, 25));
  const leads: { email: string; aantal: number; laatste: string }[] = [];
  for (const rij of rijen) {
    if (!rij.clerkUserId) continue;
    try {
      const res = await fetch(
        `https://api.clerk.com/v1/users/${rij.clerkUserId}`,
        { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } }
      );
      if (!res.ok) continue;
      const u = (await res.json()) as {
        email_addresses?: { email_address: string }[];
      };
      leads.push({
        email: u.email_addresses?.[0]?.email_address ?? "onbekend",
        aantal: Number(rij.aantal),
        laatste: new Date(rij.laatste).toLocaleString("nl-NL"),
      });
    } catch {}
  }
  return leads;
}

export default async function Admin() {
  await requireAdmin();
  const leads = await demoLeads();
  const { desc } = await import("drizzle-orm");
  const alleAanvragen = await db
    .select()
    .from(formulierInzendingen)
    .where(eq(formulierInzendingen.siteRepo, "wordswap"))
    .orderBy(desc(formulierInzendingen.id));
  const aanvragen = alleAanvragen.filter((a) => !a.gearchiveerd).slice(0, 20);
  const afgehandeld = alleAanvragen.filter((a) => a.gearchiveerd).slice(0, 60);
  const alleSites = await db.select().from(sites).orderBy(sites.id);
  const maand = new Date().toISOString().slice(0, 7);

  const rijen = await Promise.all(
    alleSites.map(async (site) => {
      const [verbruik] = await db
        .select()
        .from(usage)
        .where(and(eq(usage.siteId, site.id), eq(usage.maand, maand)));
      const alleChanges = await db
        .select()
        .from(changes)
        .where(eq(changes.siteId, site.id));
      const kosten = await db
        .select()
        .from(aiKosten)
        .where(and(eq(aiKosten.siteId, site.id), eq(aiKosten.maand, maand)));
      return {
        site,
        wijzigingen: verbruik?.wijzigingen ?? 0,
        openConcepten: alleChanges.filter((c) => c.status === "concept").length,
        aiMicroUsd: kosten.reduce((s, r) => s + r.kostenMicroUsd, 0),
      };
    })
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Klanten
          </h1>
          <p className="mt-2 text-stone-600">
            {alleSites.length} site{alleSites.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link
            href="/admin/handleiding"
            className="rounded-full border border-stone-300 px-5 py-2.5 text-stone-600 text-sm font-semibold hover:border-violet-400"
          >
            Handleiding
          </Link>
          <Link
            href="/admin/media"
            className="rounded-full border border-stone-300 px-5 py-2.5 text-stone-600 text-sm font-semibold hover:border-violet-400"
          >
            Merkmateriaal
          </Link>
          <a
            href="/api/opruimen"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-stone-300 px-5 py-2.5 text-stone-600 text-sm font-semibold hover:border-violet-400"
            title="Oude bouwopdrachten en branches opruimen"
          >
            Opruimen
          </a>
          <Link
            href="/admin/outreach"
            className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700"
          >
            📣 Outreach
          </Link>
          <Link
            href="/admin/webinars"
            className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700"
          >
            🎥 Webinars
          </Link>
          <Link
            href="/admin/nieuw"
            className="rounded-full border-2 border-violet-600 px-5 py-2.5 text-violet-700 text-sm font-semibold hover:bg-violet-50"
          >
            + Nieuwe klant
          </Link>
          <Link
            href="/admin/migraties"
            className="rounded-full bg-violet-700 px-5 py-2.5 text-white text-sm font-semibold hover:bg-violet-600"
          >
            Migraties
          </Link>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {rijen.length === 0 && (
          <p className="rounded-3xl border border-stone-200 bg-white p-8 text-stone-500">
            Nog geen klanten. Start een migratie of maak een klant aan.
          </p>
        )}
        {rijen.map(({ site, wijzigingen, openConcepten, aiMicroUsd }) => (
          <Link
            key={site.id}
            href={`/admin/klant/${site.id}`}
            className="lift flex items-center justify-between gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm hover:border-violet-300"
          >
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold truncate">
                {site.naam}
              </p>
              <p className="text-sm text-stone-500 truncate">
                {site.domein ?? "geen domein"} · {site.githubRepo}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 text-sm">
              {openConcepten > 0 && (
                <span className="rounded-full bg-amber-50 border border-amber-300 px-3 py-1 font-medium text-amber-800">
                  {openConcepten} concept{openConcepten === 1 ? "" : "en"}
                </span>
              )}
              <span className="hidden sm:inline rounded-full bg-violet-50 border border-violet-200 px-3 py-1 font-medium text-violet-700">
                {wijzigingen}/30 deze maand
              </span>
              {aiMicroUsd > 0 && (
                <span
                  className="hidden md:inline rounded-full bg-stone-100 border border-stone-200 px-3 py-1 font-medium text-stone-600"
                  title="Werkelijke AI-kosten deze maand"
                >
                  {`$${(aiMicroUsd / 1_000_000).toFixed(2)} AI`}
                </span>
              )}
              <span
                className={`rounded-full border px-3 py-1 font-medium capitalize ${STATUS_KLEUR[site.status] ?? ""}`}
              >
                {site.status}
              </span>
              <span className="text-stone-300 text-xl">›</span>
            </div>
          </Link>
        ))}
      </div>

      {aanvragen.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-2xl font-semibold">
            Aanvragen via de site
          </h2>
          <div className="mt-4 space-y-3">
            {aanvragen.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-stone-200 bg-white p-5 text-sm"
              >
                <p className="flex items-center justify-between gap-2 text-xs text-stone-400">
                  {a.aangemaakt.toLocaleString("nl-NL")}
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 font-medium capitalize text-violet-700">
                    {a.formulier}
                  </span>
                </p>
                <dl className="mt-2 space-y-1">
                  {Object.entries(a.velden as Record<string, string>).map(
                    ([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <dt className="font-semibold text-stone-700 shrink-0 capitalize">
                          {k}:
                        </dt>
                        <dd className="text-stone-600 break-words min-w-0">
                          {v}
                        </dd>
                      </div>
                    )
                  )}
                </dl>
                <div className="mt-3 flex gap-4">
                  <form action={aanvraagVerwerken}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="actie" value="archiveer" />
                    <button type="submit" className="text-xs font-medium text-stone-500 hover:text-violet-700 cursor-pointer">
                      ✓ Afgehandeld
                    </button>
                  </form>
                  <form action={aanvraagVerwerken}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="actie" value="verwijder" />
                    <button type="submit" className="text-xs text-stone-400 hover:text-red-600 cursor-pointer">
                      Verwijderen
                    </button>
                  </form>
                </div>
              </div>
            ))}
            {aanvragen.length === 0 && (
              <p className="text-sm text-stone-500">Geen openstaande aanvragen — netjes bijgewerkt.</p>
            )}
            {afgehandeld.length > 0 && (
              <details>
                <summary className="cursor-pointer text-xs text-stone-400 hover:text-stone-600">
                  Afgehandeld ({afgehandeld.length})
                </summary>
                <div className="mt-2 space-y-2 max-h-80 overflow-y-auto">
                  {afgehandeld.map((a) => (
                    <div key={a.id} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-500">
                      <p className="flex flex-wrap items-center gap-2">
                        <span>{a.aangemaakt.toLocaleDateString("nl-NL")}</span>
                        <span className="font-medium capitalize text-stone-600">{a.formulier}</span>
                        <span className="truncate">
                          {Object.entries(a.velden as Record<string, string>)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" · ")}
                        </span>
                      </p>
                      <div className="mt-1 flex gap-3">
                        <form action={aanvraagVerwerken}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="actie" value="terug" />
                          <button type="submit" className="hover:text-violet-700 cursor-pointer">↩ Terugzetten</button>
                        </form>
                        <form action={aanvraagVerwerken}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="actie" value="verwijder" />
                          <button type="submit" className="hover:text-red-600 cursor-pointer">Verwijderen</button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      )}

      {leads.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-2xl font-semibold">Demo-leads</h2>
          <p className="mt-1 text-sm text-stone-600">
            Mensen die de probeer-demo hebben gebruikt — warme leads om na te
            bellen of te mailen.
          </p>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-stone-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500">
                  <th className="p-3 font-medium">E-mail</th>
                  <th className="p-3 font-medium">Berichten</th>
                  <th className="p-3 font-medium">Laatst actief</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.email} className="border-t border-stone-100">
                    <td className="p-3 font-medium text-stone-800">
                      {lead.email}
                    </td>
                    <td className="p-3 text-stone-600">{lead.aantal}</td>
                    <td className="p-3 text-stone-600">{lead.laatste}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
