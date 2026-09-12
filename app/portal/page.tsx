import HerstelMelding from "./HerstelMelding";
import { createPreviewAccess } from "@/lib/preview-access";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { changes, messages, sites } from "@/db/schema";
import { vanafLaatsteNieuwGesprek } from "@/lib/gesprek";
import { requireUser } from "@/lib/auth";
import Chat from "./Chat";
import DemoWelkom from "./DemoWelkom";
import { demoLiveWorker, demoWorker } from "@/lib/demo";
import SiteExtra from "./SiteExtra";

export const metadata: Metadata = {
  title: "Mijn websites",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Portal({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const { site: gekozenParam } = await searchParams;
  const userId = await requireUser();
  const { and, or } = await import("drizzle-orm");

  // Uitgenodigde klant die voor het eerst inlogt? Site automatisch koppelen.
  const { currentUser } = await import("@clerk/nextjs/server");
  const gebruiker = await currentUser();
  const emails = (gebruiker?.emailAddresses ?? []).map((e) =>
    e.emailAddress.toLowerCase(),
  );
  if (emails.length > 0) {
    const { inArray, isNull } = await import("drizzle-orm");
    await db
      .update(sites)
      .set({ clerkUserId: userId, uitnodigingEmail: null })
      .where(inArray(sites.uitnodigingEmail, emails))
      .catch(() => {});
  }

  let mijnSites = await db
    .select()
    .from(sites)
    .where(or(eq(sites.clerkUserId, userId), eq(sites.isDemo, true)));
  // Echte klanten zien hun eigen site(s), niet ook nog de probeer-demo
  const heeftEigenSite = mijnSites.some(
    (s) => !s.isDemo && s.clerkUserId === userId,
  );

  // Meerdere websites? Eén tegelijk tonen, met een keuzebalk erboven.
  // Standaard de eigen site (niet de demo), anders de eerste.
  const gekozenId = Number(gekozenParam);
  if (heeftEigenSite) mijnSites = mijnSites.filter((s) => !s.isDemo);
  // Meerdere websites zonder keuze in het adres? Dan eerst een overzicht,
  // niet meteen in de eerste website belanden.
  const toonOverzicht = mijnSites.length > 1 && !mijnSites.some((s) => s.id === gekozenId);
  const getoondeSite = toonOverzicht
    ? undefined
    : (mijnSites.find((s) => s.id === gekozenId) ??
      mijnSites.find((s) => !s.isDemo && s.clerkUserId === userId) ??
      mijnSites[0]);
  const herstelMap: Record<number, number> = {};
  const getoondeSites = getoondeSite ? [getoondeSite] : [];

  const historieMap: Record<
    number,
    { rol: "klant" | "assistent"; tekst: string }[]
  > = {};
  for (const site of mijnSites) {
    const rows = await db
      .select()
      .from(messages)
      .where(
        site.isDemo
          ? and(eq(messages.siteId, site.id), eq(messages.clerkUserId, userId))
          : eq(messages.siteId, site.id),
      )
      .orderBy(messages.id);
    historieMap[site.id] = vanafLaatsteNieuwGesprek(rows)
      .slice(-30)
      .map((m) => ({ rol: m.rol, tekst: m.tekst }));
  }

  const demoHeeftWijzigingen: Record<number, boolean> = {};
  const openConceptMap: Record<
    number,
    | {
        previewUrl: string | null;
        changeId: number;
        prompt: string;
        paginas: string[];
      }
    | undefined
  > = {};
  for (const site of mijnSites) {
    const rows = await db
      .select()
      .from(changes)
      .where(
        site.isDemo
          ? and(eq(changes.siteId, site.id), eq(changes.clerkUserId, userId))
          : eq(changes.siteId, site.id),
      )
      .orderBy(changes.id);
    const herstel = rows.find((c) => c.status === "herstel_mislukt");
    if (herstel) herstelMap[site.id] = herstel.id;
    const laatsteConcept = rows
      .filter(
        (c) =>
          (c.status === "concept" || c.status === "publicatie_mislukt") &&
          // Demo: concepten van vóór de sandbox-ombouw negeren
          (!site.isDemo || c.branch.startsWith("demo-")),
      )
      .at(-1);
    if (site.isDemo)
      demoHeeftWijzigingen[site.id] = rows.some(
        (c) => c.branch.startsWith("demo-") && c.status === "gepubliceerd",
      );
    if (laatsteConcept) {
      openConceptMap[site.id] = {
        previewUrl: laatsteConcept.previewUrl,
        changeId: laatsteConcept.id,
        prompt: laatsteConcept.promptTekst,
        paginas: Array.isArray(laatsteConcept.bestanden)
          ? (laatsteConcept.bestanden as string[])
          : [],
      };
    }
  }

  return (
    <div data-demo-step={mijnSites.some((s) => s.isDemo) ? "portal" : undefined} className="mx-auto max-w-[1500px] px-2 sm:px-6 py-4 sm:py-10">
      {mijnSites.some((s) => s.isDemo && s.clerkUserId !== userId) && (
        <DemoWelkom />
      )}
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        {mijnSites.length > 1 ? "Mijn websites" : "Mijn website"}
      </h1>
      {toonOverzicht && (
        <>
          <p className="mt-2 text-stone-600">Kies de website die je wilt bijhouden.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mijnSites.map((s) => (
              <a
                key={s.id}
                href={`/portal?site=${s.id}`}
                className="group flex flex-col rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-md"
              >
                <h2 className="font-display text-xl font-semibold group-hover:text-violet-700">
                  {s.isDemo && s.clerkUserId !== userId ? "🧪 Probeer-demo" : s.naam}
                </h2>
                <p className="mt-1 text-sm text-stone-500">{s.domein ?? "domein volgt"}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium">
                  <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-stone-600">
                    {s.status === "actief" ? "Actief" : s.status === "migratie" ? "In opbouw" : s.status}
                  </span>
                  {openConceptMap[s.id] && (
                    <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-amber-900">
                      Concept staat klaar
                    </span>
                  )}
                </div>
                <span className="mt-5 text-sm font-semibold text-violet-700">Website bijhouden →</span>
              </a>
            ))}
          </div>
        </>
      )}
      {mijnSites.length > 1 && !toonOverzicht && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <a
            href="/portal"
            className="rounded-full px-3 py-2 text-sm font-semibold text-stone-500 hover:text-violet-700"
          >
            ← Alle websites
          </a>
          {mijnSites.map((s) => (
            <a
              key={s.id}
              href={`/portal?site=${s.id}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                s.id === getoondeSite?.id
                  ? "bg-violet-700 text-white shadow"
                  : "border border-stone-300 text-stone-600 hover:border-violet-400 hover:text-violet-700"
              }`}
            >
              {s.isDemo && s.clerkUserId !== userId
                ? "🧪 Probeer-demo"
                : s.naam}
            </a>
          ))}
        </div>
      )}
      {toonOverzicht ? null : mijnSites.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <p className="text-stone-600 leading-relaxed">
            Je omgeving wordt nog voor je klaargezet. Zodra je website gekoppeld
            is, kun je hier wijzigingen doorgeven. Vragen? Mail ons gerust.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {getoondeSites.map((site) => (
            <div
              key={site.id}
              className="rounded-3xl border border-stone-200 bg-white p-2.5 sm:p-8 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-semibold">
                    {site.naam}
                  </h2>
                  <p className="mt-1 text-stone-500 text-sm">
                    {site.domein ?? "domein volgt"} · status: {site.status}
                  </p>
                </div>
                <span className="rounded-full bg-violet-50 border border-violet-200 px-3 py-1 text-sm font-medium text-violet-700">
                  {site.plan === "via_ons" ? "Via ons" : "Eigen AI-account"}
                </span>
              </div>
              <div className="mt-6">
                {herstelMap[site.id] && (
                  <HerstelMelding changeId={herstelMap[site.id]} />
                )}
                <Chat
                  siteId={site.id}
                  previewAccess={createPreviewAccess(site.id, userId)}
                  historie={historieMap[site.id] ?? []}
                  liveUrl={
                    site.isDemo && demoHeeftWijzigingen[site.id]
                      ? `${demoLiveWorker(site.githubRepo, userId)}.wordswap.workers.dev`
                      : site.domein
                  }
                  werkversieUrl={
                    site.isDemo
                      ? `${demoWorker(site.githubRepo, userId)}.wordswap.workers.dev`
                      : site.netlifySiteId
                        ? `wv-${site.netlifySiteId}.wordswap.workers.dev`
                        : null
                  }
                  openConcept={openConceptMap[site.id]}
                  suggesties={
                    site.isDemo
                      ? [
                          "Maak een blogpagina met een eerste blog over ons desembrood",
                          "Zet de croissants bovenaan de homepage",
                          "Verander de openingstijden: zaterdag tot 17:00",
                          "Voeg een kortingsactie toe: 10% op alle taarten",
                        ]
                      : undefined
                  }
                />
              </div>
              {site.isDemo ? (
                <p className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3 text-sm text-violet-900">
                  Dit is een <strong>gratis probeer-demo</strong>: vraag een
                  wijziging in de chat, bekijk het concept en publiceer hem
                  zelf. De demo-site wordt elk uur teruggezet. Zoiets voor je
                  eigen website? Neem contact op!
                </p>
              ) : (
                <SiteExtra
                  siteId={site.id}
                  siteRepo={site.githubRepo}
                  notificatieEmail={site.notificatieEmail}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
