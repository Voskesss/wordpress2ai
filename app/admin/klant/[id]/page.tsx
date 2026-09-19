import HerstelMelding from "@/app/portal/HerstelMelding";
import { createPreviewAccess } from "@/lib/preview-access";
import { extraGeldt, huidigeMaand, maandbudgetVoor, vervaltOp, wijzigingenLimietVoor } from "@/lib/ai-budget";
import { datumInWoorden } from "@/lib/opzegging";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { changes, chatFeedback, whatsappKoppelingen, formulierInzendingen, migrations, sites, usage, wpBackups } from "@/db/schema";
import IncassoBlok from "./IncassoBlok";
import OntwerpBlok from "./OntwerpBlok";
import AfsprakenBlok from "./AfsprakenBlok";
import SnelMenu from "./SnelMenu";
import ReviewMailKnop from "./ReviewMailKnop";
import BackupUpload from "./BackupUpload";
import { klantEmailVoorSite } from "@/lib/klant-email";
import { requireAdmin } from "@/lib/auth";
import { toonNummer } from "@/lib/whatsapp/berichten";
import ActieKnop from "./ActieKnop";
import UitnodigingVoorbeeldKnop from "./UitnodigingVoorbeeldKnop";
import BevestigKnop from "./BevestigKnop";
import LivegangChecklist from "./LivegangChecklist";
import Chat from "@/app/portal/Chat";
import SiteExtra from "@/app/portal/SiteExtra";
import BevestigingsMails from "@/app/portal/BevestigingsMails";
import { messages } from "@/db/schema";
import {
  bewaarRichtlijnen,
  bewaarSite,
  bewaarSmtp,
  bewaarVideoLimiet,
  bewaarAiBudget,
  bewaarWhatsapp,
  voegWhatsappNummer,
  koppelAangevraagdNummer,
  verwijderWhatsappNummer,
  bewaarAiExtra,
  bewaarWijzigingenLimiet,
  bewaarWijzigingenExtra,
  resetWijzigingenTeller,
  siteResetten,
  sjabloonVastleggen,
  herstelVersie,
  koppelKlant,
  trekKoppelingIn,
  zetSiteOnline,
  verwijderKlant,
  wisChatGeschiedenis,
} from "../../acties";
import { lijstVersies } from "@/lib/github";
import { demoWorker } from "@/lib/demo";

export const metadata: Metadata = {
  title: "Klant",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const invoerStijl =
  "mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 font-normal text-sm focus:border-violet-600 focus:outline-none";

async function clerkGebruiker(userId: string) {
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    });
    if (!res.ok) return null;
    const u = (await res.json()) as {
      email_addresses?: { email_address: string }[];
      first_name?: string;
      last_name?: string;
    };
    return {
      email: u.email_addresses?.[0]?.email_address ?? "onbekend",
      naam: [u.first_name, u.last_name].filter(Boolean).join(" "),
    };
  } catch {
    return null;
  }
}

export default async function KlantDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ abonnement?: string; koppel?: string; slot?: string; ontwerp?: string; whatsapp?: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const { abonnement: abonnementMelding, koppel: koppelMelding, slot: slotMelding, ontwerp: ontwerpMelding, whatsapp: whatsappMelding } = await searchParams;
  const siteId = Number(id);
  if (!Number.isInteger(siteId)) notFound();

  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) notFound();

  const klantInfo = await clerkGebruiker(site.clerkUserId);

  const maand = new Date().toISOString().slice(0, 7);
  const [verbruik] = await db
    .select()
    .from(usage)
    .where(and(eq(usage.siteId, site.id), eq(usage.maand, maand)));
  // Chatgeschiedenis per persoon (voor kwaliteitsbewaking + wissen)
  const alleBerichten = await db
    .select()
    .from(messages)
    .where(eq(messages.siteId, site.id))
    .orderBy(messages.id);
  const chatGroepen = new Map<string, typeof alleBerichten>();
  for (const m of alleBerichten) {
    const sleutel = m.clerkUserId ?? "onbekend";
    if (!chatGroepen.has(sleutel)) chatGroepen.set(sleutel, []);
    chatGroepen.get(sleutel)!.push(m);
  }
  const chatPerGebruiker = await Promise.all(
    [...chatGroepen.entries()].map(async ([sleutel, rijen]) => {
      let label = `Gebruiker ${sleutel.slice(-6)}`;
      if (sleutel === admin.id) label = "Jij (beheer)";
      else if (sleutel === site.clerkUserId) {
        const info = await clerkGebruiker(sleutel);
        label = `Klant${info ? ` — ${info.naam || info.email}` : ""}`;
      } else if (sleutel === "onbekend") label = "Onbekend (oudere berichten)";
      return { sleutel, label, rijen };
    }),
  );

  // Nummers die de klant zelf heeft doorgegeven en nog gekoppeld moeten worden
  const whatsappAanvragen = (
    await db
      .select({ id: formulierInzendingen.id, velden: formulierInzendingen.velden })
      .from(formulierInzendingen)
      .where(
        and(
          eq(formulierInzendingen.formulier, "whatsapp-nummer"),
          eq(formulierInzendingen.gearchiveerd, false),
        ),
      )
      .catch(() => [])
  ).filter((r) => (r.velden as Record<string, string>).siteId === String(site.id));

  // Telefoons die via WhatsApp met deze website mogen praten
  const whatsappNummers = await db
    .select()
    .from(whatsappKoppelingen)
    .where(eq(whatsappKoppelingen.siteId, site.id))
    .orderBy(desc(whatsappKoppelingen.id));

  // Feedback op de chatbeleving (duimpjes + algemene opmerkingen)
  const feedback = await db
    .select()
    .from(chatFeedback)
    .where(eq(chatFeedback.siteId, site.id))
    .orderBy(desc(chatFeedback.id))
    .then((r) => r.slice(0, 50))
    .catch(() => []);

  const laatsteChanges = await db
    .select()
    .from(changes)
    .where(eq(changes.siteId, site.id))
    .orderBy(desc(changes.id))
    .then((r) => r.slice(0, 10));
  const [migratie] = await db
    .select()
    .from(migrations)
    .where(eq(migrations.siteId, site.id));
  const gebruiker = await clerkGebruiker(site.clerkUserId);
  const { opleveringsAkkoord, standaardBekijkLink, vraagtOpleveringsAkkoord } = await import("@/lib/website-akkoord");
  const oplevering = await opleveringsAkkoord(site.id);
  const { heeftPortaalGebruikt } = await import("@/lib/website-akkoord");
  const klantGebruiktPortaal =
    site.clerkUserId && site.clerkUserId !== admin.id ? await heeftPortaalGebruikt(site.clerkUserId).catch(() => true) : false;
  const bekijkLink = standaardBekijkLink(site);
  const { heeftLivegang, livegangChecks } = await import("@/lib/livegang");
  const livegang = heeftLivegang(site)
    ? await livegangChecks(site, {
        adminId: admin.id,
        adminEmails: admin.emailAddresses.map((e) => e.emailAddress),
        online: true,
      })
    : null;
  const versies = await lijstVersies(site.githubRepo).catch(() => []);
  // Alleen jouw eigen gesprek: precies wat de AI in de chatroute als historie meekrijgt.
  // Gesprekken van de klant staan per persoon onder Chatgeschiedenis.
  const { vanafLaatsteNieuwGesprek } = await import("@/lib/gesprek");
  const chatHistorie = await db
    .select()
    .from(messages)
    .where(and(eq(messages.siteId, site.id), eq(messages.clerkUserId, admin.id)))
    .orderBy(messages.id)
    .then((rows) =>
      vanafLaatsteNieuwGesprek(rows).slice(-30).map((m) => ({ rol: m.rol, tekst: m.tekst }))
    );
  const herstel = laatsteChanges.find((c) => c.status === "herstel_mislukt");
  const openConcept = laatsteChanges.find((c) => c.status === "concept" || c.status === "publicatie_mislukt");

  const { aiKosten } = await import("@/db/schema");
  const kostenRijen = await db
    .select()
    .from(aiKosten)
    .where(eq(aiKosten.siteId, site.id));
  const maandNu = new Date().toISOString().slice(0, 7);
  const dezeMaand = huidigeMaand();
  const extraActief = extraGeldt(site, dezeMaand);
  const wijzigingenLimiet = wijzigingenLimietVoor(site, dezeMaand);
  const wijzigingenExtraActief = Boolean(
    site.wijzigingenExtra && site.wijzigingenExtra > 0 && site.wijzigingenExtraMaand === dezeMaand,
  );
  const usd = (micro: number) => `$${(micro / 1_000_000).toFixed(2)}`;
  const kostenDezeMaand = kostenRijen
    .filter((r) => r.maand === maandNu)
    .reduce((s, r) => s + r.kostenMicroUsd, 0);
  const kostenTotaal = kostenRijen.reduce((s, r) => s + r.kostenMicroUsd, 0);
  const chatBeurtenMaand = kostenRijen
    .filter((r) => r.maand === maandNu && r.bron === "chat")
    .reduce((s, r) => s + r.beurten, 0);

  const versieRij = (
    v: { sha: string; bericht: string; datum: string },
    isHuidig: boolean
  ) => (
    <tr key={v.sha} className="border-t border-stone-100">
      <td className="px-6 py-3 text-stone-800 max-w-[26rem]">
        <span className="line-clamp-1">{v.bericht}</span>
      </td>
      <td className="px-3 py-3 text-stone-500 whitespace-nowrap">
        {new Date(v.datum).toLocaleString("nl-NL", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </td>
      <td className="px-3 py-3 text-stone-400 font-mono text-xs">{v.sha.slice(0, 7)}</td>
      <td className="px-6 py-3 text-right">
        {isHuidig ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            huidig
          </span>
        ) : (
          <form action={herstelVersie}>
            <input type="hidden" name="siteId" value={site.id} />
            <input type="hidden" name="sha" value={v.sha} />
            <ActieKnop
              label="Zet terug"
              bezigLabel="Terugzetten..."
              className="rounded-full border border-violet-300 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50 cursor-pointer"
            />
          </form>
        )}
      </td>
    </tr>
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/admin" className="text-sm text-stone-500 hover:text-violet-700">
        ← Alle klanten
      </Link>
      {slotMelding === "bezet" && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm text-amber-900">
          Er wordt op dit moment aan deze site gewerkt (chat, foto of publicatie). Je actie is niet uitgevoerd,
          zodat er niets door elkaar gaat. Probeer het over een minuut opnieuw.
        </p>
      )}
      <div className="mt-3 flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
          {site.naam}
        </h1>
        <div className="flex gap-2 text-sm">
          {site.domein && (
            <a
              href={`https://${site.domein}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-stone-300 px-4 py-2 font-medium hover:border-violet-400"
            >
              Bekijk site
            </a>
          )}
          <a
            href={`https://github.com/wordpress2ai/${site.githubRepo}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-stone-300 px-4 py-2 font-medium hover:border-violet-400"
          >
            Bestanden
          </a>
        </div>
      </div>

      {/* Verbruik */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-stone-200 bg-white p-5">
          <p className="text-sm text-stone-500">AI-kosten deze maand</p>
          <p className="font-display mt-1 text-3xl font-semibold">
            {usd(kostenDezeMaand)}
          </p>
          <p className="mt-1 text-xs text-stone-400">
            {chatBeurtenMaand} chat-opdracht{chatBeurtenMaand === 1 ? "" : "en"} ·
            totaal ooit {usd(kostenTotaal)} (incl. bouw)
          </p>
        </div>
        <div className="rounded-3xl border border-stone-200 bg-white p-5">
          <p className="text-sm text-stone-500">Wijzigingen deze maand</p>
          <p className="font-display mt-1 text-3xl font-semibold">
            {verbruik?.wijzigingen ?? 0}
            <span className="text-base font-normal text-stone-400"> / {wijzigingenLimiet}</span>
          </p>
        </div>
        <div className="rounded-3xl border border-stone-200 bg-white p-5">
          <p className="text-sm text-stone-500">Open concepten</p>
          <p className="font-display mt-1 text-3xl font-semibold">
            {laatsteChanges.filter((c) => c.status === "concept").length}
          </p>
        </div>
        <div className="rounded-3xl border border-stone-200 bg-white p-5">
          <p className="text-sm text-stone-500">Migratie</p>
          <p className="font-display mt-1 text-3xl font-semibold capitalize">
            {migratie?.stap ?? "—"}
          </p>
        </div>
      </div>

      {/* Site online zetten (Cloudflare) */}
      <SnelMenu
        heeft={{
          livegang: Boolean(livegang),
          online: !site.siteSlug,
          whatsapp: true,
          verwijderen: true,
        }}
      />

      {!site.siteSlug && (
        <form
          action={zetSiteOnline}
          className="mt-6 rounded-3xl border-2 border-violet-600 bg-violet-50/40 p-6"
        >
          <input type="hidden" name="siteId" value={site.id} />
          <h2 id="online" className="scroll-mt-24 font-display text-xl font-semibold">
            Site nog niet online
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            Eén klik: maakt de hosting aan, koppelt de bestanden, zet previews
            open en vult domein en sitenaam automatisch in.
          </p>
          <ActieKnop
            label="Zet site online"
            bezigLabel="Bezig met online zetten... (kan een minuut duren)"
            className="mt-4 rounded-full bg-violet-700 px-6 py-2.5 text-white font-semibold hover:bg-violet-600 cursor-pointer"
          />
        </form>
      )}

      <OntwerpBlok site={site} melding={ontwerpMelding} />

      {/* Beheer via chat (admin) */}
      <div className="mt-6">
        <h2 id="chat" className="scroll-mt-24 font-display text-xl font-semibold mb-3">
          Beheer via chat
        </h2>
        {herstel && <HerstelMelding changeId={herstel.id} />}
        <Chat
          siteId={site.id}
          previewAccess={createPreviewAccess(site.id, admin.id)}
          historie={chatHistorie}
          liveUrl={site.domein}
          werkversieUrl={
            site.isDemo
              ? `${demoWorker(site.githubRepo, admin.id)}.wordswap.workers.dev`
              : site.siteSlug
                ? `wv-${site.siteSlug}.wordswap.workers.dev`
                : null
          }
          openConcept={
            openConcept
              ? {
                  changeId: openConcept.id,
                  previewUrl: openConcept.previewUrl,
                  prompt: openConcept.promptTekst,
                  paginas: Array.isArray(openConcept.bestanden)
                    ? (openConcept.bestanden as string[])
                    : [],
                }
              : undefined
          }
        />
      </div>

      {livegang && (
        <div id="livegang" className="scroll-mt-24">
          <LivegangChecklist checks={livegang} />
        </div>
      )}

      {/* Instellingen */}
      <form
        action={bewaarSite}
        className="mt-6 rounded-3xl border border-stone-200 bg-white p-6"
      >
        <input type="hidden" name="siteId" value={site.id} />
        <h2 id="instellingen" className="scroll-mt-24 font-display text-xl font-semibold">Instellingen</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            Naam
            <input name="naam" defaultValue={site.naam} className={invoerStijl} />
          </label>
          <label className="block text-sm font-semibold">
            Domein (live URL)
            <input
              name="domein"
              defaultValue={site.domein ?? ""}
              placeholder="klant.nl of naam.wordswap.workers.dev"
              className={invoerStijl}
            />
          </label>
          <label className="block text-sm font-semibold">
            Hosting-naam (Cloudflare)
            <input
              name="siteSlug"
              defaultValue={site.siteSlug ?? ""}
              placeholder="meestal gelijk aan de repo-naam"
              className={invoerStijl}
            />
          </label>
          <label className="block text-sm font-semibold">
            Repo
            <input
              defaultValue={site.githubRepo}
              disabled
              className={`${invoerStijl} bg-stone-50 text-stone-500`}
            />
          </label>
          <label className="block text-sm font-semibold">
            Plan
            <select name="plan" defaultValue={site.plan} className={invoerStijl}>
              <option value="via_ons">Via ons account</option>
              <option value="eigen_key">Eigen AI-account</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Status
            <select name="status" defaultValue={site.status} className={invoerStijl}>
              <option value="migratie">Migratie</option>
              <option value="actief">Actief</option>
              <option value="gepauzeerd">Gepauzeerd</option>
              <option value="opgezegd">Opgezegd</option>
            </select>
          </label>
        </div>
        <ActieKnop
          label="Opslaan"
          bezigLabel="Opslaan..."
          className="mt-4 rounded-full bg-violet-700 px-5 py-2 text-white text-sm font-semibold hover:bg-violet-600 cursor-pointer"
        />
      </form>

      {/* Klantaccount */}
      <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-6">
        <h2 id="account" className="scroll-mt-24 font-display text-xl font-semibold">Klantaccount</h2>
        <p className="mt-2 text-sm text-stone-600">
          Gekoppeld:{" "}
          {gebruiker ? (
            <span className="font-medium text-stone-900">
              {gebruiker.naam ? `${gebruiker.naam} — ` : ""}
              {gebruiker.email}
              {site.clerkUserId === admin.id && (
                <span className="font-normal text-stone-400"> (jijzelf, nog geen klant gekoppeld)</span>
              )}
            </span>
          ) : (
            <span className="text-stone-400">onbekend account</span>
          )}
        </p>
        {koppelMelding && (
          <p
            className={`mt-2 rounded-xl border px-3.5 py-2 text-sm ${
              koppelMelding === "verstuurd" || koppelMelding === "gekoppeld" || koppelMelding === "ingetrokken"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
          >
            {koppelMelding === "verstuurd"
              ? "✓ Gekoppeld en de mail met de link naar de website is verstuurd."
              : koppelMelding === "gekoppeld"
                ? "✓ Gekoppeld (zonder mail)."
                : koppelMelding === "ingetrokken"
                  ? "✓ Koppeling ingetrokken: de uitnodiging is vervallen, een ongebruikt account is verwijderd en de site hangt weer aan jou."
                  : koppelMelding === "intrekken-ingelogd"
                    ? "Intrekken kan niet meer: dit account heeft het portaal al gebruikt (of is een beheerder), dus het wordt niet verwijderd. Gebruik 'Site overdragen' als de site naar een ander account moet."
                    : koppelMelding === "mail-mislukt"
                  ? "Gekoppeld, maar de mail kon niet worden verstuurd. Probeer het opnieuw."
                  : "Het account kon niet worden aangemaakt bij Clerk. Probeer het opnieuw of kijk in de logs."}
          </p>
        )}
        {vraagtOpleveringsAkkoord(site) || oplevering ? (
          <p
            className={`mt-2 rounded-xl border px-3.5 py-2 text-sm ${
              oplevering ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-stone-200 bg-stone-50 text-stone-700"
            }`}
          >
            {oplevering ? (
              <>
                ✓ <strong>Akkoord op de website</strong> gegeven op{" "}
                {oplevering.aangemaakt.toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam", dateStyle: "long", timeStyle: "short" })}
                {oplevering.email ? ` door ${oplevering.email}` : ""}. Tijd voor de betaallink en het live zetten.
              </>
            ) : (
              <>⏳ Nog geen akkoord op de website. De klant krijgt het akkoordscherm bij het inloggen zolang de status <em>Migratie</em> is.</>
            )}
          </p>
        ) : null}
        {site.uitnodigingEmail && (
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm text-amber-900">
            ✉️ Uitnodiging verstuurd naar{" "}
            <strong>{site.uitnodigingEmail}</strong> — zodra dit adres voor het
            eerst inlogt, wordt de site automatisch gekoppeld.
          </p>
        )}
        {(site.uitnodigingEmail || (gebruiker && site.clerkUserId !== admin.id && !klantGebruiktPortaal)) && (
          <form action={trekKoppelingIn} className="mt-2">
            <input type="hidden" name="siteId" value={site.id} />
            <BevestigKnop
              label="↩ Koppeling intrekken (klant heeft het portaal nog niet gebruikt)"
              bezigLabel="Intrekken..."
              vraag="Koppeling intrekken? De uitnodiging vervalt, het nog niet gebruikte account wordt verwijderd, en de site hangt weer aan jou. Dit kan alleen zolang de klant het portaal nog niet echt heeft gebruikt."
              className="text-xs font-semibold text-red-700 hover:underline cursor-pointer"
            />
          </form>
        )}
        {gebruiker && site.clerkUserId !== admin.id ? (
          // Al netjes gekoppeld: koppel-formulier uit het zicht, alleen nog
          // bereikbaar voor het uitzonderingsgeval (overdracht naar ander account)
          <>
          {gebruiker.email !== "onbekend" && vraagtOpleveringsAkkoord(site) && !oplevering && (
            <form action={koppelKlant} className="mt-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="siteId" value={site.id} />
              <input type="hidden" name="email" value={gebruiker.email} />
              <label className="flex-1 min-w-[16rem] text-xs text-stone-500">
                Mail met de link naar de website (opnieuw) sturen naar {gebruiker.email}
                <input
                  name="bekijkLink"
                  type="url"
                  defaultValue={bekijkLink}
                  className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2 text-sm text-stone-800 focus:border-violet-600 focus:outline-none"
                />
              </label>
              <UitnodigingVoorbeeldKnop siteId={site.id} />
              <ActieKnop
                label="Verstuur mail"
                bezigLabel="Bezig..."
                klaarLabel="✓ Verstuurd"
                className="rounded-full border border-stone-300 px-5 py-2 text-sm font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700 cursor-pointer"
              />
            </form>
          )}
          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-stone-400 hover:text-stone-600">
              Site overdragen aan een ander account…
            </summary>
            <form action={koppelKlant} className="mt-3 flex gap-3 flex-wrap">
              <input type="hidden" name="siteId" value={site.id} />
              <input
                name="naam"
                required
                placeholder="Naam"
                className="flex-1 min-w-[10rem] rounded-xl border border-stone-300 px-4 py-2.5 text-sm focus:border-violet-600 focus:outline-none"
              />
              <input
                name="email"
                type="email"
                required
                placeholder="nieuw@bedrijf.nl"
                className="flex-1 min-w-[16rem] rounded-xl border border-stone-300 px-4 py-2.5 text-sm focus:border-violet-600 focus:outline-none"
              />
              <UitnodigingVoorbeeldKnop siteId={site.id} />
              <ActieKnop
                label="Draag over"
                bezigLabel="Bezig..."
                className="rounded-full border border-stone-300 px-5 py-2 text-sm font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700 cursor-pointer"
              />
            </form>
            <p className="mt-2 text-xs text-stone-500">
              Let op: de huidige koppeling wordt hiermee vervangen. Het nieuwe account krijgt een mail
              {vraagtOpleveringsAkkoord(site) ? " met de link naar de website en het akkoordverzoek" : " dat hij toegang heeft tot de website"}; klik op ⓘ om hem te bekijken.
            </p>
          </details>
          </>
        ) : (
          <>
            <form action={koppelKlant} className="mt-4 space-y-3">
              <input type="hidden" name="siteId" value={site.id} />
              <div className="flex gap-3 flex-wrap">
                <input
                  name="naam"
                  required
                  placeholder="Naam (bijv. Rogier Roding)"
                  className="flex-1 min-w-[12rem] rounded-xl border border-stone-300 px-4 py-2.5 text-sm focus:border-violet-600 focus:outline-none"
                />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="klant@bedrijf.nl"
                  className="flex-1 min-w-[16rem] rounded-xl border border-stone-300 px-4 py-2.5 text-sm focus:border-violet-600 focus:outline-none"
                />
                <UitnodigingVoorbeeldKnop siteId={site.id} />
                <ActieKnop
                  label="Koppel / nodig uit"
                  bezigLabel="Bezig..."
                  className="rounded-full bg-violet-700 px-5 py-2 text-white text-sm font-semibold hover:bg-violet-600 cursor-pointer"
                />
              </div>
              <label className="block text-xs text-stone-500">
                Eigen berichtje onderaan de mail (mag leeg)
                <textarea
                  name="bericht"
                  rows={2}
                  placeholder="Bijv.: leuk dat we dit gaan doen — bel me gerust als je ergens over twijfelt."
                  className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm focus:border-violet-600 focus:outline-none"
                />
              </label>
              <label className="block text-xs text-stone-500">
                Link naar de website in de mail
                <input
                  name="bekijkLink"
                  type="url"
                  defaultValue={bekijkLink}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2 text-sm text-stone-800 focus:border-violet-600 focus:outline-none"
                />
              </label>
            </form>
            <p className="mt-2 text-xs text-stone-500">
              Het account wordt meteen aangemaakt (als het nog niet bestaat) en gekoppeld. De klant krijgt één
              mail van jou met een link naar de website en een inlogknop; inloggen gaat met een code per mail,
              zonder wachtwoord. Klik op ⓘ om de mail eerst te bekijken.
            </p>
          </>
        )}
      </div>

      {/* Richtlijnen */}
      <form
        action={bewaarRichtlijnen}
        className="mt-6 rounded-3xl border border-stone-200 bg-white p-6"
      >
        <input type="hidden" name="siteId" value={site.id} />
        <h2 id="richtlijnen" className="scroll-mt-24 font-display text-xl font-semibold">Richtlijnen</h2>
        <p className="mt-2 text-sm text-stone-600">
          Extra regels die de AI bij deze site altijd naleeft, bovenop de
          algemene huisregels.
        </p>
        <textarea
          name="richtlijnen"
          rows={5}
          defaultValue={site.richtlijnen ?? ""}
          placeholder={"Bijv.:\n- Spreek bezoekers aan met 'u'\n- Prijzen altijd met € en twee decimalen"}
          className="mt-3 w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:border-violet-600 focus:outline-none"
        />
        <ActieKnop
          label="Opslaan"
          bezigLabel="Opslaan..."
          className="mt-3 rounded-full bg-violet-700 px-5 py-2 text-white text-sm font-semibold hover:bg-violet-600 cursor-pointer"
        />
      </form>

      {/* Laatste wijzigingen */}
      <div className="mt-6 rounded-3xl border border-stone-200 bg-white overflow-hidden">
        <h2 id="wijzigingen" className="scroll-mt-24 font-display text-xl font-semibold p-6 pb-0">
          Laatste wijzigingen
        </h2>
        <table className="mt-4 w-full text-left text-sm">
          <tbody>
            {laatsteChanges.length === 0 && (
              <tr>
                <td className="px-6 py-4 text-stone-500">Nog geen wijzigingen.</td>
              </tr>
            )}
            {laatsteChanges.map((c) => (
              <tr key={c.id} className="border-t border-stone-100">
                <td className="px-6 py-3 text-stone-800 max-w-[24rem]">
                  <span className="line-clamp-1">{c.promptTekst}</span>
                </td>
                <td className="px-3 py-3 text-stone-500 whitespace-nowrap">
                  {c.aangemaakt.toLocaleDateString("nl-NL")}
                </td>
                <td className="px-6 py-3">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      c.status === "gepubliceerd"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : c.status === "concept"
                          ? "bg-amber-50 border-amber-200 text-amber-700"
                          : "bg-stone-100 border-stone-200 text-stone-500"
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Versiegeschiedenis */}
      <div className="mt-6 rounded-3xl border border-stone-200 bg-white overflow-hidden">
        <h2 id="versies" className="scroll-mt-24 font-display text-xl font-semibold p-6 pb-0">Versies</h2>
        <p className="px-6 pt-1 text-sm text-stone-500">
          Elke gepubliceerde wijziging is een versie. Terugzetten maakt een
          nieuwe versie aan (er gaat dus nooit iets verloren) en zet de live
          site meteen bij.
        </p>
        <table className="mt-4 w-full text-left text-sm">
          <tbody>
            {versies.length === 0 && (
              <tr>
                <td className="px-6 py-4 text-stone-500">
                  Geen versies gevonden (bestaat de repo al?).
                </td>
              </tr>
            )}
            {versies.slice(0, 8).map((v, i) => versieRij(v, i === 0))}
          </tbody>
        </table>
        {versies.length > 8 && (
          <details className="border-t border-stone-100 px-6 py-3">
            <summary className="cursor-pointer text-sm text-stone-400 hover:text-stone-600">
              Oudere versies tonen ({versies.length - 8})
            </summary>
            <table className="mt-2 w-full text-left text-sm">
              <tbody>{versies.slice(8).map((v) => versieRij(v, false))}</tbody>
            </table>
          </details>
        )}
      </div>

      {/* Sjabloon & reset (voor demo-/webinarsites) */}
      <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50/40 p-6">
        <h2 id="sjabloon" className="scroll-mt-24 font-display text-xl font-semibold">↺ Sjabloon &amp; reset</h2>
        <p className="mt-2 text-sm text-stone-600">
          Voor demo- en webinarsites: leg de huidige live-versie vast als sjabloon,
          en zet de site na een demo met één klik terug naar precies die staat
          (concepten en chatgeschiedenis worden gewist, live en werkversie opnieuw
          neergezet). Gebruik dit niet bij echte klantsites.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <form action={sjabloonVastleggen}>
            <input type="hidden" name="siteId" value={site.id} />
            <ActieKnop label="📌 Huidige versie vastleggen als sjabloon" bezigLabel="Vastleggen..." className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700 cursor-pointer" />
          </form>
          <form action={siteResetten}>
            <input type="hidden" name="siteId" value={site.id} />
            <ActieKnop label="↺ Reset naar sjabloon" bezigLabel="Resetten... (±1 min)" className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-400 cursor-pointer" />
          </form>
        </div>
      </div>

      {/* Feedback op de chatbeleving: duimpjes en opmerkingen uit het portaal */}
      <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-6">
        <h2 id="feedback" className="scroll-mt-24 font-display text-xl font-semibold">
          👍👎 Chat-feedback
          {feedback.length > 0 && (
            <span className="ml-2 text-sm font-normal text-stone-500">
              {feedback.filter((f) => f.oordeel === "goed").length}× omhoog ·{" "}
              {feedback.filter((f) => f.oordeel === "slecht").length}× omlaag ·{" "}
              {feedback.filter((f) => f.oordeel === "algemeen").length}× algemeen
            </span>
          )}
        </h2>
        {feedback.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">Nog geen feedback ontvangen op deze site.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {feedback.map((f) => (
              <details key={f.id} className="rounded-2xl border border-stone-200 px-4 py-2.5 text-sm">
                <summary className="cursor-pointer">
                  <span className="mr-1.5">
                    {f.oordeel === "goed" ? "👍" : f.oordeel === "slecht" ? "👎" : "💬"}
                  </span>
                  <span className={f.oordeel === "slecht" ? "font-semibold text-red-700" : "font-medium"}>
                    {f.reden ? f.reden.slice(0, 90) : f.oordeel === "goed" ? "Goed antwoord" : "(geen reden opgegeven)"}
                  </span>
                  <span className="ml-2 text-xs text-stone-400">
                    {f.aangemaakt.toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </summary>
                <div className="mt-2 space-y-2 border-t border-stone-100 pt-2 text-xs text-stone-600">
                  {f.reden && <p className="whitespace-pre-wrap">{f.reden}</p>}
                  {f.antwoord && (
                    <p className="whitespace-pre-wrap rounded-xl bg-stone-50 p-2.5 text-stone-500">
                      🤖 {f.antwoord}
                    </p>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>

      {/* Chatgeschiedenis: alle gesprekken op deze site, per persoon. Klanten
          zien in het portaal alleen hun eigen gesprek; hier kijkt de admin mee
          voor kwaliteitsbewaking en kan hij gesprekken wissen. */}
      <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-6">
        <h2 id="chatgeschiedenis" className="scroll-mt-24 font-display text-xl font-semibold">💬 Chatgeschiedenis</h2>
        <p className="mt-2 text-sm text-stone-600">
          Alle gesprekken met de site-AI, per persoon. De klant ziet in het
          portaal alléén zijn eigen gesprek — jouw beheer-chats blijven voor de
          klant onzichtbaar. Wissen verwijdert de berichten definitief.
        </p>
        {site.meelezenUit && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm text-amber-900">
            Deze klant heeft <strong>meelezen uitgezet</strong>. Open de gesprekken hieronder alleen bij een storing
            of supportvraag — niet om routineus mee te kijken.
          </p>
        )}
        {chatPerGebruiker.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">Nog geen chatberichten op deze site.</p>
        ) : (
          <details className="mt-3" open={!site.meelezenUit}>
            <summary className="cursor-pointer text-sm font-semibold text-stone-600">
              {site.meelezenUit
                ? "Toch openen (alleen bij een storing of supportvraag)"
                : `Gesprekken per persoon (${chatPerGebruiker.length})`}
            </summary>
          <div className="mt-4 space-y-3">
            {chatPerGebruiker.map((g) => (
              <details key={g.sleutel} className="rounded-2xl border border-stone-200 px-4 py-3">
                <summary className="cursor-pointer text-sm">
                  <span className="font-semibold">{g.label}</span>
                  <span className="ml-2 text-stone-500">
                    {g.rijen.length} bericht{g.rijen.length === 1 ? "" : "en"} · laatste{" "}
                    {g.rijen[g.rijen.length - 1].aangemaakt.toLocaleString("nl-NL", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </summary>
                <div className="mt-3 max-h-96 space-y-2 overflow-y-auto border-t border-stone-100 pt-3">
                  {g.rijen.map((m) => (
                    <p
                      key={m.id}
                      className={`whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${
                        m.rol === "klant"
                          ? "bg-emerald-50 text-stone-800"
                          : "bg-stone-50 text-stone-600"
                      }`}
                    >
                      <span className="mr-1 text-xs font-semibold text-stone-400">
                        {m.rol === "klant" ? "👤" : "🤖"}
                      </span>
                      {m.tekst}
                    </p>
                  ))}
                </div>
                <form action={wisChatGeschiedenis} className="mt-3">
                  <input type="hidden" name="siteId" value={site.id} />
                  <input type="hidden" name="clerkUserId" value={g.sleutel} />
                  <ActieKnop
                    label="🗑 Dit gesprek wissen"
                    bezigLabel="Wissen..."
                    className="rounded-full border border-red-200 px-4 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                  />
                </form>
              </details>
            ))}
          </div>
          </details>
        )}
      </div>

      <div id="incasso" className="scroll-mt-24">
        <IncassoBlok
          site={site}
          melding={abonnementMelding}
          klantNaam={klantInfo?.naam ?? ""}
          klantEmail={klantInfo && klantInfo.email !== "onbekend" ? klantInfo.email : (site.uitnodigingEmail ?? "")}
        />
      </div>

      {/* WordPress-kopie (terugweg-garantie) */}
      <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-6">
        <h2 id="wordpress-kopie" className="scroll-mt-24 font-display text-xl font-semibold">🛟 WordPress-kopie (terugweg-garantie)</h2>
        <p className="mt-2 text-sm text-stone-600">
          Zet hier de complete WordPress-backup van vóór de overstap klaar (zip). Hij staat in de beveiligde
          EU-opslag; alleen deze klant kan hem downloaden, in zijn portaal.
        </p>
        <BackupUpload
          siteId={site.id}
          klantEmail={(await klantEmailVoorSite(site.id))?.email ?? null}
          rijen={(
            await db
              .select()
              .from(wpBackups)
              .where(eq(wpBackups.siteId, site.id))
              .orderBy(desc(wpBackups.id))
              .catch(() => [])
          ).map((b) => ({
            id: b.id,
            bestandsnaam: b.bestandsnaam,
            grootteBytes: b.grootteBytes,
            omschrijving: b.omschrijving,
            datum: b.aangemaakt.toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" }),
          }))}
        />
      </div>

      {/* Video-tegoed */}
      <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-6">
        <h2 id="video" className="scroll-mt-24 font-display text-xl font-semibold">🎬 Video-tegoed</h2>
        <p className="mt-2 text-sm text-stone-600">
          Gebruikt: <strong>{site.videoUploads}</strong> van <strong>{site.videoLimiet}</strong> video-uploads.
          Wil de klant meer, verhoog dan hier de limiet (de chat verwijst hem naar info@wordswap.nl).
        </p>
        <form action={bewaarVideoLimiet} className="mt-3 flex flex-wrap items-end gap-3">
          <input type="hidden" name="siteId" value={site.id} />
          <label className="block text-sm font-semibold">
            Limiet
            <input name="limiet" type="number" min={0} defaultValue={site.videoLimiet} className={`${invoerStijl} w-28`} />
          </label>
          <ActieKnop label="Opslaan" bezigLabel="Opslaan..." className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700 cursor-pointer" />
        </form>
      </div>

      <div id="afspraken-blok" className="scroll-mt-24">
        <AfsprakenBlok siteId={site.id} />
      </div>

      {/* Review- en referentieverzoek */}
      <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-6">
        <h2 id="review" className="scroll-mt-24 font-display text-xl font-semibold">⭐ Review &amp; referentie</h2>
        <p className="mt-2 text-sm text-stone-600">
          Vraagt de klant met één klik om een Google-review én of je zijn website als referentieproject mag noemen
          (hij antwoordt gewoon &quot;ja&quot; op de mail). Jij krijgt de kopie, dus je ziet het antwoord vanzelf.
        </p>
        <div className="mt-3">
          <ReviewMailKnop
            siteId={site.id}
            verstuurdOp={
              site.reviewMailOp
                ? site.reviewMailOp.toLocaleString("nl-NL", {
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
        </div>
      </div>

      {/* AI-maandbudget */}
      <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-6">
        <h2 id="ai-budget" className="scroll-mt-24 font-display text-xl font-semibold">🤖 AI-budget en wijzigingen per maand</h2>
        <p className="mt-2 text-sm text-stone-600">
          Deze maand verbruikt: <strong>{usd(kostenDezeMaand)}</strong> van maximaal{" "}
          <strong>${maandbudgetVoor(site, dezeMaand)}</strong>
          {extraActief && (
            <> (${site.aiMaandbudgetUsd} vast + ${site.aiExtraUsd} eenmalig deze maand)</>
          )}
          . Loopt de klant hier tegenaan, dan zegt de chat dat de AI-gebruiksruimte op is en verwijst hij naar jou.
          Verhoog het budget hier (hele dollars).
        </p>
        <form action={bewaarAiBudget} className="mt-3 flex flex-wrap items-end gap-3">
          <input type="hidden" name="siteId" value={site.id} />
          <label className="block text-sm font-semibold">
            Budget ($/maand)
            <input name="budget" type="number" min={1} max={1000} defaultValue={site.aiMaandbudgetUsd} className={`${invoerStijl} w-28`} />
          </label>
          <ActieKnop label="Opslaan" bezigLabel="Opslaan..." className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700 cursor-pointer" />
        </form>
        <form action={bewaarAiExtra} className="mt-4 flex flex-wrap items-end gap-3 border-t border-stone-100 pt-4">
          <input type="hidden" name="siteId" value={site.id} />
          <label className="block text-sm font-semibold">
            Eenmalig extra deze maand ($)
            <input name="extra" type="number" min={0} max={1000} defaultValue={extraActief ? site.aiExtraUsd : 0} className={`${invoerStijl} w-28`} />
          </label>
          <ActieKnop label="Opslaan" bezigLabel="Opslaan..." className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700 cursor-pointer" />
          <p className="w-full text-xs text-stone-500">
            {extraActief
              ? `Er staat nu $${site.aiExtraUsd} extra klaar voor deze maand. Dat vervalt vanzelf op ${datumInWoorden(vervaltOp(dezeMaand))} — je hoeft niets terug te zetten. Op 0 zetten haalt het meteen weg.`
              : "Voor een drukke maand: dit komt bovenop het vaste budget en geldt alleen deze maand. Op de 1e van de volgende maand vervalt het vanzelf."}
          </p>
        </form>

        <div className="mt-5 border-t border-stone-200 pt-4">
          <p className="text-sm text-stone-600">
            Wijzigingen deze maand: <strong>{verbruik?.wijzigingen ?? 0}</strong> van{" "}
            <strong>{wijzigingenLimiet}</strong>
            {wijzigingenExtraActief && (
              <> ({site.wijzigingenLimiet} vast + {site.wijzigingenExtra} eenmalig deze maand)</>
            )}
            . Dit is de fair-use-belofte uit het pakket; bij de grens stopt alleen de chat — zelf tekst, kleur of een
            foto aanpassen blijft werken. Het dollarbudget hierboven is een aparte rem: wat het eerst op is, geldt.
          </p>
          {(verbruik?.wijzigingen ?? 0) > 0 && (
            <form action={resetWijzigingenTeller} className="mt-2">
              <input type="hidden" name="siteId" value={site.id} />
              <ActieKnop
                label="Teller op nul (zelf zitten testen)"
                bezigLabel="Bezig..."
                klaarLabel="✓ Op nul"
                className="text-xs font-semibold text-stone-500 underline cursor-pointer"
              />
            </form>
          )}
          <div className="mt-3 flex flex-wrap items-end gap-6">
            <form action={bewaarWijzigingenLimiet} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="siteId" value={site.id} />
              <label className="block text-sm font-semibold">
                Wijzigingen per maand
                <input name="limiet" type="number" min={1} max={1000} defaultValue={site.wijzigingenLimiet} className={`${invoerStijl} w-28`} />
              </label>
              <ActieKnop label="Opslaan" bezigLabel="Opslaan..." className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700 cursor-pointer" />
            </form>
            <form action={bewaarWijzigingenExtra} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="siteId" value={site.id} />
              <label className="block text-sm font-semibold">
                Eenmalig extra deze maand
                <input name="extra" type="number" min={0} max={1000} defaultValue={wijzigingenExtraActief ? site.wijzigingenExtra : 0} className={`${invoerStijl} w-28`} />
              </label>
              <ActieKnop label="Opslaan" bezigLabel="Opslaan..." className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700 cursor-pointer" />
            </form>
          </div>
          <p className="mt-2 text-xs text-stone-500">
            {wijzigingenExtraActief
              ? `De eenmalige ${site.wijzigingenExtra} extra vervallen vanzelf op ${datumInWoorden(vervaltOp(dezeMaand))}. Op 0 zetten haalt ze meteen weg.`
              : "De eenmalige extra komt bovenop het vaste aantal, geldt alleen deze maand en vervalt vanzelf op de 1e."}
          </p>
        </div>
      </div>

      {/* WhatsApp-kanaal */}
      <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-6">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 id="whatsapp" className="scroll-mt-24 font-display text-xl font-semibold">💬 WhatsApp</h2>
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${site.whatsappActief ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-stone-50 text-stone-500"}`}>
            {site.whatsappActief ? "aan" : "uit"}
          </span>
        </div>
        <p className="mt-2 text-sm text-stone-600">
          Betaalde extra: de klant stuurt zijn website wijzigingen via WhatsApp (tekst, foto&apos;s,
          spraak). Publiceren blijft een bewuste knop. <strong>Alleen de nummers hieronder komen
          binnen</strong>; appt een ander nummer, dan gebeurt er niets en krijg jij een mail.
        </p>
        <form action={bewaarWhatsapp} className="mt-3">
          <input type="hidden" name="siteId" value={site.id} />
          <input type="hidden" name="aan" value={site.whatsappActief ? "0" : "1"} />
          <ActieKnop label={site.whatsappActief ? "Zet uit" : "Zet aan"} bezigLabel="Opslaan..." className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700 cursor-pointer" />
        </form>

        {whatsappAanvragen.map((aanvraag) => {
          const v = aanvraag.velden as Record<string, string>;
          return (
            <div key={aanvraag.id} className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
              <p className="text-amber-900">
                <strong>{v.naam}</strong> gaf {toonNummer(v.nummer)} door om te koppelen.
              </p>
              <form action={koppelAangevraagdNummer} className="mt-2 flex flex-wrap items-center gap-3">
                <input type="hidden" name="siteId" value={site.id} />
                <input type="hidden" name="inzendingId" value={aanvraag.id} />
                <input type="hidden" name="nummer" value={`+${v.nummer}`} />
                <input type="hidden" name="omschrijving" value={v.naam ?? ""} />
                <ActieKnop label="Koppelen" bezigLabel="Koppelen..." className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 cursor-pointer" />
                <span className="text-xs text-amber-800">Volledig nummer: +{v.nummer}</span>
              </form>
            </div>
          );
        })}

        {whatsappNummers.length > 0 && (
          <ul className="mt-4 space-y-2">
            {whatsappNummers.map((n) => (
              <li key={n.id} className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm">
                <span>
                  <strong>{toonNummer(n.telefoon)}</strong>
                  {n.omschrijving ? ` — ${n.omschrijving}` : ""}
                </span>
                <form action={verwijderWhatsappNummer}>
                  <input type="hidden" name="siteId" value={site.id} />
                  <input type="hidden" name="koppelingId" value={n.id} />
                  <ActieKnop label="Verwijderen" bezigLabel="Bezig..." className="text-xs font-medium text-stone-500 hover:text-red-600 cursor-pointer" />
                </form>
              </li>
            ))}
          </ul>
        )}

        {whatsappMelding && (
          <p
            className={`mt-4 rounded-xl border px-3.5 py-2 text-sm ${
              whatsappMelding.startsWith("gekoppeld") || whatsappMelding === "bestond"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
          >
            {whatsappMelding === "gekoppeld"
              ? "✓ Nummer gekoppeld."
              : whatsappMelding === "gekoppeld-meerdere"
                ? "✓ Nummer gekoppeld. Deze telefoon hangt nu aan meerdere websites: bij een appje vraagt het kanaal eerst om welke het gaat, en die keuze blijft twee uur staan."
                : whatsappMelding === "bestond"
                  ? "Dit nummer stond al bij deze website."
                  : whatsappMelding === "geen-landcode"
                    ? "Niet opgeslagen: het nummer moet met de landcode beginnen, bijvoorbeeld +31612345678. Een nummer dat met 06 begint bestaat in tientallen landen."
                    : "Niet opgeslagen: onbekende website."}
          </p>
        )}

        {whatsappNummers.length > 0 && !site.whatsappActief && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm text-amber-900">
            Er staan nummers klaar, maar WhatsApp staat voor deze website <strong>uit</strong>. Zolang
            dat zo is komt er niets binnen en ziet de klant het blok in zijn portaal niet. Koppelen
            mag alvast; zet het daarna aan.
          </p>
        )}

        <form action={voegWhatsappNummer} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="siteId" value={site.id} />
          <label className="block text-sm font-semibold">
            Telefoonnummer <span className="font-normal text-stone-500">(met landcode)</span>
            <input name="nummer" placeholder="+31612345678" className={`${invoerStijl} w-56`} />
          </label>
          <label className="block text-sm font-semibold">
            Van wie <span className="font-normal text-stone-500">(optioneel)</span>
            <input name="omschrijving" placeholder="Jan, eigenaar" className={`${invoerStijl} w-48`} />
          </label>
          <ActieKnop label="Nummer koppelen" bezigLabel="Koppelen..." className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700 cursor-pointer" />
        </form>
        <p className="mt-2 text-xs text-stone-500">
          Zonder landcode wordt het nummer niet opgeslagen: 06… bestaat in tientallen landen.
          Meerdere telefoons per site mag, en dezelfde telefoon mag aan meerdere
          websites hangen — dan vraagt het kanaal bij een appje eerst om welke website het gaat.
        </p>
      </div>

      {/* Witlabel-mail (SMTP van de klant) */}
      <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-6">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 id="eigen-mail" className="scroll-mt-24 font-display text-xl font-semibold">E-mail uit eigen naam</h2>
          {site.smtpHost ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              actief via {site.smtpHost}
            </span>
          ) : (
            <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-xs font-medium text-stone-500">
              standaard (Resend, uit naam van het bedrijf)
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-stone-600">
          Witlabel-optie (eenmalig €49): formulier-mails versturen via de eigen
          mailserver van de klant, écht vanaf zijn domein. Vul de
          SMTP-gegevens van zijn mailbox in (bij Soverin: host smtp.soverin.net,
          poort 465, gebruiker = volledige e-mailadres, app-wachtwoord).
          Host leegmaken + opslaan = terug naar de standaard.
        </p>
        <form action={bewaarSmtp} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="siteId" value={site.id} />
          <label className="block text-sm font-semibold">
            SMTP-host
            <input name="host" defaultValue={site.smtpHost ?? ""} placeholder="smtp.soverin.net" className={invoerStijl} />
          </label>
          <label className="block text-sm font-semibold">
            Poort
            <input name="poort" type="number" defaultValue={site.smtpPoort ?? 465} className={invoerStijl} />
          </label>
          <label className="block text-sm font-semibold">
            Gebruiker (e-mailadres)
            <input name="gebruiker" defaultValue={site.smtpGebruiker ?? ""} placeholder="info@klantdomein.nl" className={invoerStijl} />
          </label>
          <label className="block text-sm font-semibold">
            Wachtwoord {site.smtpWachtwoord && <span className="font-normal text-stone-400">(ingesteld — alleen invullen om te wijzigen)</span>}
            <input name="wachtwoord" type="password" autoComplete="new-password" className={invoerStijl} />
          </label>
          <label className="block text-sm font-semibold sm:col-span-2">
            Afzenderadres (optioneel, anders = gebruiker)
            <input name="afzender" defaultValue={site.smtpAfzender ?? ""} placeholder="noreply@klantdomein.nl" className={invoerStijl} />
          </label>
          <div className="sm:col-span-2">
            <ActieKnop
              label="Opslaan"
              bezigLabel="Opslaan..."
              className="rounded-full bg-violet-700 px-5 py-2 text-white text-sm font-semibold hover:bg-violet-600 cursor-pointer"
            />
          </div>
        </form>
      </div>

      {/* Alles wat de klant ook ziet: inzendingen, notificatie-e-mail, documenten */}
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
      <BevestigingsMails siteId={site.id} />

      {/* Danger zone */}
      <form
        action={verwijderKlant}
        className="mt-6 rounded-3xl border-2 border-red-200 bg-red-50/50 p-6"
      >
        <input type="hidden" name="siteId" value={site.id} />
        <h2 id="verwijderen" className="scroll-mt-24 font-display text-xl font-semibold text-red-900">
          Klant verwijderen
        </h2>
        <p className="mt-2 text-sm text-red-800">
          Verwijdert deze klant met alle chatgeschiedenis, wijzigingen en
          verbruiksgegevens uit het systeem. Dit kan niet ongedaan worden
          gemaakt.
        </p>
        <div className="mt-4 space-y-2 text-sm text-red-900">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="ookRepo" className="h-4 w-4" />
            Ook de bestanden (repo <span className="font-mono">{site.githubRepo}</span>) permanent verwijderen
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="ookHosting" className="h-4 w-4" />
            Ook de online site (hosting) verwijderen{site.siteSlug ? ` (${site.siteSlug})` : " (geen gekoppeld)"}
          </label>
          <label className="block font-semibold">
            Typ de naam van de site om te bevestigen:{" "}
            <span className="font-mono font-normal">{site.naam}</span>
            <input
              name="bevestigNaam"
              required
              autoComplete="off"
              placeholder={site.naam}
              className="mt-2 w-full max-w-md rounded-xl border border-red-300 bg-white px-4 py-2.5 font-normal text-sm focus:border-red-500 focus:outline-none"
            />
          </label>
        </div>
        <ActieKnop
          label="Definitief verwijderen"
          bezigLabel="Verwijderen... (repo en hosting opruimen)"
          className="mt-4 rounded-full bg-red-600 px-5 py-2 text-white text-sm font-semibold hover:bg-red-500 cursor-pointer"
        />
      </form>
    </div>
  );
}
