import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { formulierInzendingen, webinars } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import ActieKnop from "../klant/[id]/ActieKnop";
import { webinarBijwerken, webinarToevoegen } from "../acties";

export const metadata: Metadata = {
  title: "Webinars",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const invoerStijl =
  "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 font-normal text-sm focus:border-violet-600 focus:outline-none";

export default async function Webinars() {
  await requireAdmin();
  const lijst = await db.select().from(webinars).orderBy(desc(webinars.wanneer));
  // Inschrijvingen tellen (formulier "webinar" op de eigen site)
  const inschrijvingen = await db
    .select()
    .from(formulierInzendingen)
    .where(eq(formulierInzendingen.formulier, "webinar"))
    .orderBy(desc(formulierInzendingen.id));

  const perWebinar = (titel: string) =>
    inschrijvingen.filter(
      (i) => (i.velden as Record<string, string>).webinar === titel
    );

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/admin" className="text-sm text-stone-500 hover:text-violet-700">
        ← Alle klanten
      </Link>
      <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">Webinars</h1>
      <p className="mt-3 text-stone-600 leading-relaxed max-w-2xl">
        Plan een webinar in — hij verschijnt automatisch op{" "}
        <Link href="/webinar" className="text-violet-700 hover:underline">wordswap.nl/webinar</Link>{" "}
        met een inschrijfformulier. Inschrijvers krijgen een bevestigingsmail met
        de deelnamelink en een agenda-bestand.
      </p>

      {/* Inplannen */}
      <form
        action={webinarToevoegen}
        className="mt-8 rounded-3xl border-2 border-violet-200 bg-violet-50/40 p-6 grid gap-3 sm:grid-cols-2"
      >
        <h2 className="font-display text-xl font-semibold sm:col-span-2">Webinar inplannen</h2>
        <label className="block text-sm font-semibold sm:col-span-2">
          Titel
          <input name="titel" required defaultValue="Weg uit WordPress: een snellere website zonder onderhoud" className={invoerStijl} />
        </label>
        <label className="block text-sm font-semibold">
          Datum
          <input name="datum" type="date" required className={invoerStijl} />
        </label>
        <label className="block text-sm font-semibold">
          Tijd
          <input name="tijd" type="time" required defaultValue="20:00" className={invoerStijl} />
        </label>
        <label className="block text-sm font-semibold sm:col-span-2">
          Deelnamelink (Google Meet / Zoom) — mag je later toevoegen
          <input name="meetLink" placeholder="https://meet.google.com/xxx-xxxx-xxx" className={invoerStijl} />
        </label>
        <div className="sm:col-span-2">
          <ActieKnop
            label="Inplannen"
            bezigLabel="Inplannen..."
            className="rounded-full bg-violet-700 px-6 py-2.5 text-white text-sm font-semibold hover:bg-violet-600 cursor-pointer"
          />
        </div>
      </form>

      {/* Lijst */}
      <div className="mt-8 space-y-4">
        {lijst.length === 0 && <p className="text-stone-500">Nog geen webinars ingepland.</p>}
        {lijst.map((w) => {
          const isVerleden = w.wanneer.getTime() < Date.now();
          const inschr = perWebinar(w.titel);
          return (
            <div key={w.id} className="rounded-3xl border border-stone-200 bg-white p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{w.titel}</p>
                  <p className="text-sm text-stone-500">
                    {w.wanneer.toLocaleString("nl-NL", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" · "}
                    <strong className="text-violet-700">{inschr.length}</strong> inschrijving
                    {inschr.length === 1 ? "" : "en"}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    isVerleden
                      ? "bg-stone-100 border-stone-200 text-stone-500"
                      : w.actief
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-amber-50 border-amber-200 text-amber-700"
                  }`}
                >
                  {isVerleden ? "geweest" : w.actief ? "open voor inschrijving" : "verborgen"}
                </span>
              </div>

              {inschr.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-stone-400 hover:text-stone-600">
                    Inschrijvers bekijken ({inschr.length})
                  </summary>
                  <ul className="mt-2 space-y-1 text-sm text-stone-600">
                    {inschr.map((i) => {
                      const v = i.velden as Record<string, string>;
                      return (
                        <li key={i.id} className="flex flex-wrap gap-x-2">
                          <span className="font-medium">{v.naam ?? "—"}</span>
                          <span className="text-stone-400">{v.email ?? ""}</span>
                          {v.website && <span className="text-stone-400">· {v.website}</span>}
                        </li>
                      );
                    })}
                  </ul>
                </details>
              )}

              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-stone-400 hover:text-stone-600">
                  Bewerken (opnamelink, verbergen, verwijderen)
                </summary>
                <form action={webinarBijwerken} className="mt-3 grid gap-3">
                  <input type="hidden" name="id" value={w.id} />
                  <label className="block text-sm font-semibold">
                    Opnamelink (voor de follow-up na afloop)
                    <input name="opnameLink" defaultValue={w.opnameLink ?? ""} placeholder="https://..." className={invoerStijl} />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="actief" defaultChecked={w.actief} />
                    Open voor inschrijving (uitvinken = verbergen op de site)
                  </label>
                  <div className="flex gap-2">
                    <ActieKnop
                      label="Opslaan"
                      bezigLabel="Opslaan..."
                      className="rounded-full border border-stone-300 px-4 py-1.5 text-sm font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700 cursor-pointer"
                    />
                  </div>
                </form>
                <form action={webinarBijwerken} className="mt-2">
                  <input type="hidden" name="id" value={w.id} />
                  <input type="hidden" name="verwijder" value="1" />
                  <ActieKnop
                    label="Verwijderen"
                    bezigLabel="Verwijderen..."
                    className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                  />
                </form>
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}
