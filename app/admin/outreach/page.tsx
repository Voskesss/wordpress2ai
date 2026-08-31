import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import ActieKnop from "../klant/[id]/ActieKnop";
import { prospectBijwerken, prospectToevoegen, verstuurOutreach } from "../acties";
import ObservatieVeld from "./ObservatieVeld";
import ScanVak from "./ScanVak";

export const metadata: Metadata = {
  title: "Outreach",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const invoerStijl =
  "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 font-normal text-sm focus:border-violet-600 focus:outline-none";

const statusLabel: Record<string, [string, string]> = {
  nieuw: ["nieuw", "bg-stone-100 border-stone-200 text-stone-600"],
  mail1: ["mail 1 verstuurd", "bg-violet-50 border-violet-200 text-violet-700"],
  mail2: ["mail 2 verstuurd", "bg-violet-50 border-violet-200 text-violet-700"],
  mail3: ["mail 3 verstuurd (laatste)", "bg-stone-100 border-stone-200 text-stone-500"],
  gereageerd: ["gereageerd 🎉", "bg-emerald-50 border-emerald-200 text-emerald-700"],
  klant: ["klant ✓", "bg-emerald-100 border-emerald-300 text-emerald-800"],
  niet_mailen: ["niet mailen", "bg-red-50 border-red-200 text-red-700"],
};

const dagen = (d: Date | null) =>
  d ? Math.floor((Date.now() - d.getTime()) / 86_400_000) : null;

export default async function Outreach() {
  await requireAdmin();
  const lijst = await db.select().from(prospects).orderBy(desc(prospects.id));

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/admin" className="text-sm text-stone-500 hover:text-violet-700">
        ← Alle klanten
      </Link>
      <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">Outreach</h1>
      <p className="mt-3 text-stone-600 leading-relaxed max-w-2xl">
        Zet hier bedrijven in waarvan je denkt: die willen dit. Maximaal drie
        mails, niet opdringerig, met jouw persoonlijke observatie over hun site
        verweven in mail&nbsp;1. Aanbevolen ritme: mail&nbsp;2 na ±5 dagen
        stilte, mail&nbsp;3 na nog ±7 dagen. Elke mail heeft een afmeldlink die
        de prospect automatisch op &ldquo;niet mailen&rdquo; zet.
      </p>

      <ScanVak />

      {/* Toevoegen */}
      <form
        id="prospect-formulier"
        action={prospectToevoegen}
        className="mt-8 rounded-3xl border-2 border-violet-200 bg-violet-50/40 p-6 grid gap-3 sm:grid-cols-2"
      >
        <h2 className="font-display text-xl font-semibold sm:col-span-2">
          Prospect toevoegen
        </h2>
        <label className="block text-sm font-semibold">
          Bedrijfsnaam
          <input name="bedrijf" required placeholder="Bakkerij De Korenbloem" className={invoerStijl} />
        </label>
        <label className="block text-sm font-semibold">
          Website
          <input name="website" required placeholder="www.bedrijf.nl" className={invoerStijl} />
        </label>
        <label className="block text-sm font-semibold sm:col-span-2">
          E-mailadres
          <input name="email" type="email" required placeholder="info@bedrijf.nl" className={invoerStijl} />
        </label>
        <label className="block text-sm font-semibold sm:col-span-2">
          Wat zie je aan hun site? (komt letterlijk in mail 1)
          <ObservatieVeld naam="observatie" className={invoerStijl} />
        </label>
        <div className="sm:col-span-2">
          <ActieKnop
            label="Toevoegen"
            bezigLabel="Toevoegen..."
            className="rounded-full bg-violet-700 px-6 py-2.5 text-white text-sm font-semibold hover:bg-violet-600 cursor-pointer"
          />
        </div>
      </form>

      {/* Lijst */}
      <div className="mt-8 space-y-4">
        {lijst.length === 0 && (
          <p className="text-stone-500">Nog geen prospects — voeg de eerste toe.</p>
        )}
        {lijst.map((p) => {
          const [label, kleur] = statusLabel[p.status] ?? statusLabel.nieuw;
          const laatste = p.mail3Op ?? p.mail2Op ?? p.mail1Op;
          const dagenStil = dagen(laatste);
          const volgende =
            p.status === "nieuw" ? 1 : p.status === "mail1" ? 2 : p.status === "mail2" ? 3 : null;
          const aanbevolenNa = volgende === 2 ? 5 : volgende === 3 ? 7 : 0;
          const teVroeg =
            volgende !== null && volgende > 1 && dagenStil !== null && dagenStil < aanbevolenNa;
          const mailBaar = volgende !== null && !["niet_mailen", "gereageerd", "klant"].includes(p.status);
          return (
            <div key={p.id} className="rounded-3xl border border-stone-200 bg-white p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {p.bedrijf}{" "}
                    <a
                      href={`https://${p.website.replace(/^https?:\/\//, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-1 text-sm font-normal text-violet-700 hover:underline"
                    >
                      {p.website} ↗
                    </a>
                  </p>
                  <p className="text-sm text-stone-500 break-all">{p.email}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${kleur}`}>
                  {label}
                  {dagenStil !== null && p.status.startsWith("mail") && (
                    <> · {dagenStil === 0 ? "vandaag" : `${dagenStil} dg geleden`}</>
                  )}
                </span>
                {mailBaar && (
                  <form action={verstuurOutreach}>
                    <input type="hidden" name="id" value={p.id} />
                    <ActieKnop
                      label={`Verstuur mail ${volgende}${teVroeg ? ` (liever na ${aanbevolenNa} dg)` : ""}`}
                      bezigLabel="Versturen..."
                      className={`rounded-full px-4 py-1.5 text-sm font-semibold cursor-pointer ${
                        teVroeg
                          ? "border border-amber-300 text-amber-700 hover:bg-amber-50"
                          : "bg-violet-700 text-white hover:bg-violet-600"
                      }`}
                    />
                  </form>
                )}
              </div>
              {p.observatie && (
                <p className="mt-2 rounded-xl bg-stone-50 border border-stone-200 px-3.5 py-2 text-sm text-stone-600">
                  💬 {p.observatie}
                </p>
              )}
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-stone-400 hover:text-stone-600">
                  Bewerken / status wijzigen
                </summary>
                <form action={prospectBijwerken} className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="id" value={p.id} />
                  <label className="block text-sm font-semibold">
                    E-mailadres
                    <input name="email" defaultValue={p.email} className={invoerStijl} />
                  </label>
                  <label className="block text-sm font-semibold">
                    Status
                    <select name="status" defaultValue={p.status} className={invoerStijl}>
                      <option value="nieuw">nieuw</option>
                      <option value="mail1">mail 1 verstuurd</option>
                      <option value="mail2">mail 2 verstuurd</option>
                      <option value="mail3">mail 3 verstuurd</option>
                      <option value="gereageerd">gereageerd</option>
                      <option value="klant">klant geworden</option>
                      <option value="niet_mailen">niet mailen</option>
                    </select>
                  </label>
                  <label className="block text-sm font-semibold sm:col-span-2">
                    Observatie (voor mail 1)
                    <ObservatieVeld naam="observatie" beginwaarde={p.observatie ?? ""} className={invoerStijl} />
                  </label>
                  <div className="sm:col-span-2">
                    <ActieKnop
                      label="Opslaan"
                      bezigLabel="Opslaan..."
                      className="rounded-full border border-stone-300 px-4 py-1.5 text-sm font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700 cursor-pointer"
                    />
                  </div>
                </form>
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}
