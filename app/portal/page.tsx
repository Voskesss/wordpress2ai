import HerstelMelding from "./HerstelMelding";
import { createPreviewAccess } from "@/lib/preview-access";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { changes, messages, sites } from "@/db/schema";
import { vanafLaatsteNieuwGesprek } from "@/lib/gesprek";
import { isBeheerder, requireUser } from "@/lib/auth";
import VerwerkersAkkoord from "./VerwerkersAkkoord";
import WebsiteAkkoord from "./WebsiteAkkoord";
import { geefWebsiteAkkoord } from "./acties";
import Chat from "./Chat";
import DemoWelkom from "./DemoWelkom";
import Aankondigingen from "./Aankondigingen";
import { demoWorker } from "@/lib/demo";
import SiteExtra from "./SiteExtra";
import EigenMailserver from "./EigenMailserver";
import KlantFacturen from "./KlantFacturen";
import BevestigingsMails from "./BevestigingsMails";
import MeenemenBlok from "./MeenemenBlok";
import AfspraakBlok from "./AfspraakBlok";
import MeelezenRegel from "./MeelezenRegel";

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

  // Klant met een eigen site? Dan eerst één keer akkoord op de verwerkersovereenkomst (AVG).
  if (heeftEigenSite && !(await isBeheerder())) {
    const { akkoorden } = await import("@/db/schema");
    const { VERWERKERS_VERSIE } = await import("@/lib/verwerkersovereenkomst");
    const akkoord = await db
      .select({ id: akkoorden.id })
      .from(akkoorden)
      .where(
        and(
          eq(akkoorden.clerkUserId, userId),
          eq(akkoorden.soort, "verwerkersovereenkomst"),
          eq(akkoorden.versie, VERWERKERS_VERSIE),
        ),
      )
      .catch(() => null); // tabel ontbreekt nog? dan niet blokkeren
    if (akkoord && akkoord.length === 0) return <VerwerkersAkkoord />;
  }

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

  // Site in opbouw en nog geen akkoord op de oplevering? Eerst het akkoordscherm,
  // tenzij de klant koos om eerst uit te proberen (dan een balkje bovenaan).
  let akkoordBalk: { siteId: number; opmerkingVerstuurd: boolean } | null = null;
  if (getoondeSite && getoondeSite.clerkUserId === userId && !(await isBeheerder())) {
    const { opleveringsAkkoord, standaardBekijkLink, vraagtOpleveringsAkkoord } = await import("@/lib/website-akkoord");
    if (vraagtOpleveringsAkkoord(getoondeSite) && !(await opleveringsAkkoord(getoondeSite.id))) {
      const { cookies } = await import("next/headers");
      const pot = await cookies();
      if (!pot.get(`akkoord-later-${getoondeSite.id}`)) {
        return (
          <WebsiteAkkoord
            siteId={getoondeSite.id}
            siteNaam={getoondeSite.naam}
            bekijkUrl={standaardBekijkLink(getoondeSite)}
            voorbeeldSrc={`/site-weergave/${createPreviewAccess(getoondeSite.id, userId)}/`}
          />
        );
      }
      akkoordBalk = {
        siteId: getoondeSite.id,
        opmerkingVerstuurd: Boolean(pot.get(`akkoord-opmerking-${getoondeSite.id}`)),
      };
    }
  }

  const historieMap: Record<
    number,
    { rol: "klant" | "assistent"; tekst: string }[]
  > = {};
  for (const site of mijnSites) {
    const rows = await db
      .select()
      .from(messages)
      // Iedereen ziet alleen zijn eigen gesprek — ook op echte klantsites, zodat
      // beheer-chats van Jos niet bij de klant in beeld komen (en andersom).
      .where(and(eq(messages.siteId, site.id), eq(messages.clerkUserId, userId)))
      .orderBy(messages.id);
    historieMap[site.id] = vanafLaatsteNieuwGesprek(rows)
      .slice(-30)
      .map((m) => ({ rol: m.rol, tekst: m.tekst }));
  }

  // Verbruiksbalk bij de chat: het aandeel van de maandruimte dat op is.
  // Zelfde maandsleutel als de handhaving in de chatroute, zodat balk en rem
  // altijd gelijklopen.
  const maandNu = new Date().toISOString().slice(0, 7);
  const { verbruikVan } = await import("@/lib/verbruik");
  const verbruikMap: Record<number, { procent: number }> = {};
  for (const site of mijnSites) {
    const v = await verbruikVan(site, maandNu);
    if (v) verbruikMap[site.id] = { procent: v.procent };
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

  const aankondigingenLijst = await (async () => {
    const { aankondigingen, aankondigingenGezien } = await import("@/db/schema");
    const { desc, and, isNull } = await import("drizzle-orm");
    // Per account al weggeklikt? Dan niet meer tonen — anders kreeg je op
    // elk nieuw apparaat de hele stapel opnieuw (20-09).
    return db
      .select({ id: aankondigingen.id, titel: aankondigingen.titel, tekst: aankondigingen.tekst, link: aankondigingen.link })
      .from(aankondigingen)
      .leftJoin(
        aankondigingenGezien,
        and(
          eq(aankondigingenGezien.aankondigingId, aankondigingen.id),
          eq(aankondigingenGezien.clerkUserId, userId),
        ),
      )
      .where(and(eq(aankondigingen.actief, true), isNull(aankondigingenGezien.aankondigingId)))
      .orderBy(desc(aankondigingen.id))
      .limit(5)
      .catch(() => []);
  })();

  return (
    <div data-demo-step={mijnSites.some((s) => s.isDemo) ? "portal" : undefined} className="mx-auto max-w-[1500px] px-2 sm:px-6 py-4 sm:py-10">
      {mijnSites.some((s) => s.isDemo && s.clerkUserId !== userId) && (
        <DemoWelkom />
      )}
      <Aankondigingen lijst={aankondigingenLijst} />
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
          {akkoordBalk && (
            <form
              action={geefWebsiteAkkoord}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3"
            >
              <input type="hidden" name="siteId" value={akkoordBalk.siteId} />
              <p className="text-sm text-amber-950">
                {akkoordBalk.opmerkingVerstuurd ? (
                  <>✉️ Je opmerking is naar Jos gestuurd. </>
                ) : null}
                <strong>Je hebt nog geen akkoord gegeven op je nieuwe website.</strong> Probeer gerust eerst alles uit.
              </p>
              <button type="submit" className="rounded-full bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer">
                ✓ Akkoord geven
              </button>
            </form>
          )}
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
                {!site.isDemo && site.ontwerpZichtbaar && site.ontwerpSlug && (
                  <div className="mb-4 rounded-3xl border border-violet-200 bg-violet-50 p-5">
                    <h3 className="font-display text-lg font-semibold text-violet-900">
                      Er staat een ontwerpvoorstel voor je klaar
                    </h3>
                    <p className="mt-1 text-sm text-violet-900/80">
                      We hebben een voorstel gemaakt voor een nieuwe uitstraling van je
                      website. Kijk gerust rond — je echte website verandert hier niets
                      door. Wil je er iets in anders, of zullen we hem doorvoeren? Laat
                      het ons weten.
                    </p>
                    <a
                      href={`https://${site.ontwerpSlug}.wordswap.workers.dev`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block rounded-full bg-violet-700 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-600"
                    >
                      Bekijk het ontwerpvoorstel
                    </a>
                  </div>
                )}
                {herstelMap[site.id] && (
                  <HerstelMelding changeId={herstelMap[site.id]} />
                )}
                <Chat
                  terugLink={mijnSites.length > 1 ? "/portal" : null}
                  isDemo={site.isDemo}
                  meelezenUit={site.meelezenUit}
                  siteId={site.id}
                  previewAccess={createPreviewAccess(site.id, userId)}
                  historie={historieMap[site.id] ?? []}
                  verbruik={verbruikMap[site.id] ?? null}
                  liveUrl={
                    site.isDemo && demoHeeftWijzigingen[site.id]
                      ? // Zijn eigen omgeving is in de demo ook zijn live site;
                        // er wordt geen tweede worker meer uitgerold.
                        `${demoWorker(site.githubRepo, userId)}.wordswap.workers.dev`
                      : site.domein
                  }
                  werkversieUrl={
                    site.isDemo
                      ? `${demoWorker(site.githubRepo, userId)}.wordswap.workers.dev`
                      : site.siteSlug
                        ? `wv-${site.siteSlug}.wordswap.workers.dev`
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
                <>
                  <SiteExtra
                    siteId={site.id}
                    siteRepo={site.githubRepo}
                    siteNaam={site.naam}
                    domein={site.domein}
                    mailHandtekening={site.mailHandtekening}
                    mailLogoUrl={site.mailLogoUrl}
                    mailKleur={site.mailKleur}
                    online={Boolean(site.siteSlug)}
                    notificatieEmail={site.notificatieEmail}
                  />
                  <AfspraakBlok siteId={site.id} />
                  <BevestigingsMails siteId={site.id} />
                  <EigenMailserver
                    siteId={site.id}
                    smtpHost={site.smtpHost}
                    smtpPoort={site.smtpPoort}
                    smtpGebruiker={site.smtpGebruiker}
                    smtpAfzender={site.smtpAfzender}
                    smtpIngesteld={Boolean(site.smtpWachtwoord)}
                    smtpFoutOp={site.smtpFoutOp}
                    smtpFoutTekst={site.smtpFoutTekst}
                    eigenAdres={site.notificatieEmail ?? emails[0] ?? null}
                  />
                  <KlantFacturen siteId={site.id} />
                  <MeenemenBlok siteId={site.id} />
                  <MeelezenRegel siteId={site.id} meelezenUit={site.meelezenUit} />
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
