import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { changes, messages, sites } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import Chat from "./Chat";
import DemoWelkom from "./DemoWelkom";
import { demoWorker } from "@/lib/demo";
import SiteExtra from "./SiteExtra";

export const metadata: Metadata = {
  title: "Mijn website",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Portal() {
  const userId = await requireUser();
  const { and, or } = await import("drizzle-orm");
  const mijnSites = await db
    .select()
    .from(sites)
    .where(or(eq(sites.clerkUserId, userId), eq(sites.isDemo, true)));

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
          : eq(messages.siteId, site.id)
      )
      .orderBy(messages.id);
    historieMap[site.id] = rows
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
          : eq(changes.siteId, site.id)
      )
      .orderBy(changes.id);
    const laatsteConcept = rows
      .filter(
        (c) =>
          c.status === "concept" &&
          // Demo: concepten van vóór de sandbox-ombouw negeren
          (!site.isDemo || c.branch.startsWith("demo-"))
      )
      .at(-1);
    if (site.isDemo)
      demoHeeftWijzigingen[site.id] = rows.some((c) => c.branch.startsWith("demo-"));
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
    <div className="mx-auto max-w-[1500px] px-4 sm:px-6 py-10">
      {mijnSites.some((s) => s.isDemo && s.clerkUserId !== userId) && <DemoWelkom />}
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        Mijn website
      </h1>
      {mijnSites.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <p className="text-stone-600 leading-relaxed">
            Je omgeving wordt nog voor je klaargezet. Zodra je website
            gekoppeld is, kun je hier wijzigingen doorgeven. Vragen? Mail ons
            gerust.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {mijnSites.map((site) => (
            <div
              key={site.id}
              className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm"
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
                <Chat
                  siteId={site.id}
                  historie={historieMap[site.id] ?? []}
                  liveUrl={
                    site.isDemo && demoHeeftWijzigingen[site.id]
                      ? `${demoWorker(site.githubRepo, userId)}.wordswap.workers.dev`
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
