import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { changes, formulierInzendingen, migrations, sites, usage } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import ActieKnop from "./ActieKnop";
import Chat from "@/app/portal/Chat";
import { messages } from "@/db/schema";
import {
  bewaarRichtlijnen,
  bewaarSite,
  koppelKlant,
  koppelNetlify,
  verwijderKlant,
} from "../../acties";

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
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const siteId = Number(id);
  if (!Number.isInteger(siteId)) notFound();

  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) notFound();

  const maand = new Date().toISOString().slice(0, 7);
  const [verbruik] = await db
    .select()
    .from(usage)
    .where(and(eq(usage.siteId, site.id), eq(usage.maand, maand)));
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
  const inzendingen = await db
    .select()
    .from(formulierInzendingen)
    .where(eq(formulierInzendingen.siteRepo, site.githubRepo))
    .orderBy(desc(formulierInzendingen.id))
    .then((r) => r.slice(0, 5));
  const chatHistorie = await db
    .select()
    .from(messages)
    .where(eq(messages.siteId, site.id))
    .orderBy(messages.id)
    .then((rows) =>
      rows.slice(-30).map((m) => ({ rol: m.rol, tekst: m.tekst }))
    );
  const openConcept = laatsteChanges.find((c) => c.status === "concept");

  const { aiKosten } = await import("@/db/schema");
  const kostenRijen = await db
    .select()
    .from(aiKosten)
    .where(eq(aiKosten.siteId, site.id));
  const maandNu = new Date().toISOString().slice(0, 7);
  const usd = (micro: number) => `$${(micro / 1_000_000).toFixed(2)}`;
  const kostenDezeMaand = kostenRijen
    .filter((r) => r.maand === maandNu)
    .reduce((s, r) => s + r.kostenMicroUsd, 0);
  const kostenTotaal = kostenRijen.reduce((s, r) => s + r.kostenMicroUsd, 0);
  const chatBeurtenMaand = kostenRijen
    .filter((r) => r.maand === maandNu && r.bron === "chat")
    .reduce((s, r) => s + r.beurten, 0);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/admin" className="text-sm text-stone-500 hover:text-violet-700">
        ← Alle klanten
      </Link>
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
            <span className="text-base font-normal text-stone-400"> / 30</span>
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

      {/* Netlify koppelen */}
      {!site.netlifySiteId && (
        <form
          action={koppelNetlify}
          className="mt-6 rounded-3xl border-2 border-violet-600 bg-violet-50/40 p-6"
        >
          <input type="hidden" name="siteId" value={site.id} />
          <h2 className="font-display text-xl font-semibold">
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

      {/* Beheer via chat (admin) */}
      <div className="mt-6">
        <h2 className="font-display text-xl font-semibold mb-3">
          Beheer via chat
        </h2>
        <Chat
          siteId={site.id}
          historie={chatHistorie}
          liveUrl={site.domein}
          werkversieUrl={site.netlifySiteId ? `wv-${site.netlifySiteId}.wordswap.workers.dev` : null}
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

      {/* Instellingen */}
      <form
        action={bewaarSite}
        className="mt-6 rounded-3xl border border-stone-200 bg-white p-6"
      >
        <input type="hidden" name="siteId" value={site.id} />
        <h2 className="font-display text-xl font-semibold">Instellingen</h2>
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
              placeholder="klant.nl of klant.netlify.app"
              className={invoerStijl}
            />
          </label>
          <label className="block text-sm font-semibold">
            Hosting-naam (Cloudflare)
            <input
              name="netlifySiteId"
              defaultValue={site.netlifySiteId ?? ""}
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
        <h2 className="font-display text-xl font-semibold">Klantaccount</h2>
        <p className="mt-2 text-sm text-stone-600">
          Gekoppeld:{" "}
          {gebruiker ? (
            <span className="font-medium text-stone-900">
              {gebruiker.naam ? `${gebruiker.naam} — ` : ""}
              {gebruiker.email}
            </span>
          ) : (
            <span className="text-stone-400">onbekend account</span>
          )}
        </p>
        <form action={koppelKlant} className="mt-4 flex gap-3 flex-wrap">
          <input type="hidden" name="siteId" value={site.id} />
          <input
            name="email"
            type="email"
            required
            placeholder="klant@bedrijf.nl"
            className="flex-1 min-w-[16rem] rounded-xl border border-stone-300 px-4 py-2.5 text-sm focus:border-violet-600 focus:outline-none"
          />
          <ActieKnop
            label="Koppel / nodig uit"
            bezigLabel="Bezig..."
            className="rounded-full bg-violet-700 px-5 py-2 text-white text-sm font-semibold hover:bg-violet-600 cursor-pointer"
          />
        </form>
        <p className="mt-2 text-xs text-stone-500">
          Bestaat het account al, dan wordt het direct gekoppeld. Anders krijgt
          de klant een uitnodigingsmail; koppel daarna opnieuw.
        </p>
      </div>

      {/* Richtlijnen */}
      <form
        action={bewaarRichtlijnen}
        className="mt-6 rounded-3xl border border-stone-200 bg-white p-6"
      >
        <input type="hidden" name="siteId" value={site.id} />
        <h2 className="font-display text-xl font-semibold">Richtlijnen</h2>
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
        <h2 className="font-display text-xl font-semibold p-6 pb-0">
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

      {/* Formulier-inzendingen */}
      <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-6">
        <h2 className="font-display text-xl font-semibold">
          Formulier-inzendingen
        </h2>
        {inzendingen.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">
            Nog geen inzendingen via het contactformulier.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {inzendingen.map((inz) => (
              <div
                key={inz.id}
                className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm"
              >
                <p className="flex items-center justify-between gap-2 text-xs text-stone-400">
                  {inz.aangemaakt.toLocaleString("nl-NL")}
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 font-medium capitalize text-violet-700">
                    {inz.formulier}
                  </span>
                </p>
                <dl className="mt-1 space-y-0.5">
                  {Object.entries(inz.velden as Record<string, string>).map(
                    ([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <dt className="font-semibold text-stone-700 shrink-0">
                          {k}:
                        </dt>
                        <dd className="text-stone-600 break-words min-w-0">
                          {v}
                        </dd>
                      </div>
                    )
                  )}
                </dl>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <form
        action={verwijderKlant}
        className="mt-6 rounded-3xl border-2 border-red-200 bg-red-50/50 p-6"
      >
        <input type="hidden" name="siteId" value={site.id} />
        <h2 className="font-display text-xl font-semibold text-red-900">
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
            <input type="checkbox" name="ookNetlify" className="h-4 w-4" />
            Ook de online site (hosting) verwijderen{site.netlifySiteId ? ` (${site.netlifySiteId})` : " (geen gekoppeld)"}
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
