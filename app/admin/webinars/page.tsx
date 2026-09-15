import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { formulierInzendingen, webinarMailInstellingen, webinarMails, webinars } from "@/db/schema";
import { REEKS } from "@/lib/webinar-reeks";
import { reeksMailZetten, reeksTestNaarMij } from "../acties-webinar-reeks";
import { requireAdmin } from "@/lib/auth";
import { formatWanneer, hoortBij } from "@/lib/webinar";
import ActieKnop from "../klant/[id]/ActieKnop";
import {
  webinarBijwerken,
  webinarInschrijvingVerplaatsen,
  webinarMailen,
  webinarToevoegen,
} from "../acties";

export const metadata: Metadata = {
  title: "Webinars",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const invoerStijl =
  "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 font-normal text-sm focus:border-violet-600 focus:outline-none";
const keuzeStijl =
  "rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700 focus:border-violet-600 focus:outline-none";

export default async function Webinars() {
  await requireAdmin();
  const lijst = await db.select().from(webinars).orderBy(desc(webinars.wanneer));
  // Inschrijvingen (formulier "webinar" op de eigen site), gekoppeld op webinar-id;
  // oude inschrijvingen zonder id koppelen op titel
  const inschrijvingen = await db
    .select()
    .from(formulierInzendingen)
    .where(eq(formulierInzendingen.formulier, "webinar"))
    .orderBy(desc(formulierInzendingen.id));

  // Mailreeks: welke mails aanstaan, en wat er per inschrijving al verstuurd is
  const instellingen = await db.select().from(webinarMailInstellingen).catch(() => []);
  const aanSet = new Set(instellingen.filter((i) => i.aan).map((i) => i.soort));
  const verzonden = await db.select().from(webinarMails).catch(() => []);
  const mailsPerInschrijving = new Map<number, string[]>();
  for (const m of verzonden) {
    if (!mailsPerInschrijving.has(m.inschrijvingId)) mailsPerInschrijving.set(m.inschrijvingId, []);
    mailsPerInschrijving.get(m.inschrijvingId)!.push(m.soort);
  }
  const korteNaam = (soort: string) =>
    soort === "afgemeld" ? "afgemeld" : (REEKS.find((r) => r.soort === soort)?.naam.split(" (")[0] ?? soort);

  const perWebinar = (w: (typeof lijst)[number]) =>
    inschrijvingen.filter((i) => hoortBij(i.velden as Record<string, unknown>, w));
  const gekoppeld = new Set(lijst.flatMap((w) => perWebinar(w).map((i) => i.id)));
  const zwevend = inschrijvingen.filter((i) => !gekoppeld.has(i.id));
  const komende = lijst.filter((w) => w.wanneer.getTime() >= Date.now());

  /** Keuzelijst "verplaats naar": alle andere komende webinars. */
  const verplaatsOpties = (huidigId: number | null) =>
    komende.filter((w) => w.id !== huidigId);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/admin" className="text-sm text-stone-500 hover:text-violet-700">
        ← Alle klanten
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Webinars</h1>
        <Link
          href="/admin/webinars/script"
          className="lift rounded-full bg-amber-100 px-5 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-200"
        >
          📜 Webinar-script (spiekbrief)
        </Link>
      </div>
      <p className="mt-3 text-stone-600 leading-relaxed max-w-2xl">
        Plan een webinar in — hij verschijnt automatisch op{" "}
        <Link href="/webinar" className="text-violet-700 hover:underline">wordswap.nl/webinar</Link>{" "}
        met een inschrijfformulier. Inschrijvers krijgen een bevestigingsmail met
        de deelnamelink en een agenda-bestand. Elke inschrijving hoort bij één
        datum; je kunt mensen hieronder verplaatsen naar een andere datum.
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

      {/* Automatische mailreeks */}
      <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-6">
        <h2 className="font-display text-xl font-semibold">✉️ Automatische mailreeks</h2>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          Elke mail staat los aan of uit, en alles staat standaard <strong>uit</strong>. Staat een mail aan, dan verstuurt de
          controle (elk uur) hem vanzelf op het juiste moment naar de inschrijvers van een komend webinar. Wie zich laat
          aanmeldt, krijgt eerdere mails niet alsnog; niemand krijgt er twee tegelijk; onderaan staat een afmeldlink.
          Bekijk en test een mail altijd eerst.
        </p>
        <ul className="mt-4 divide-y divide-stone-100">
          {REEKS.map((r) => {
            const aan = aanSet.has(r.soort);
            return (
              <li key={r.soort} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-stone-800">{r.naam}</p>
                  <p className="text-xs text-stone-500">{r.moment}</p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    aan ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-stone-50 text-stone-500"
                  }`}
                >
                  {aan ? "aan" : "uit"}
                </span>
                <Link href={`/admin/webinars/reeks/${r.soort}`} className="text-xs font-semibold text-violet-700 hover:underline">
                  👁 Bekijk
                </Link>
                <form action={reeksTestNaarMij}>
                  <input type="hidden" name="soort" value={r.soort} />
                  <ActieKnop
                    label="Test naar mij"
                    bezigLabel="…"
                    klaarLabel="✓ Verstuurd"
                    className="text-xs font-semibold text-violet-700 hover:underline cursor-pointer"
                  />
                </form>
                <form action={reeksMailZetten}>
                  <input type="hidden" name="soort" value={r.soort} />
                  <input type="hidden" name="aan" value={aan ? "0" : "1"} />
                  <ActieKnop
                    label={aan ? "Zet uit" : "Zet aan"}
                    bezigLabel="…"
                    klaarLabel="✓"
                    className={`rounded-full px-3 py-1 text-xs font-semibold cursor-pointer ${
                      aan ? "border border-stone-300 text-stone-700 hover:border-red-300 hover:text-red-700" : "bg-emerald-700 text-white hover:bg-emerald-600"
                    }`}
                  />
                </form>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Lijst */}
      <div className="mt-8 space-y-4">
        {lijst.length === 0 && <p className="text-stone-500">Nog geen webinars ingepland.</p>}
        {lijst.map((w) => {
          const isVerleden = w.wanneer.getTime() < Date.now();
          const inschr = perWebinar(w);
          const anderen = verplaatsOpties(w.id);
          return (
            <div key={w.id} className="rounded-3xl border border-stone-200 bg-white p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{w.titel}</p>
                  <p className="text-sm text-stone-500">
                    {formatWanneer(w.wanneer)}
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
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={webinarMailen}>
                    <input type="hidden" name="id" value={w.id} />
                    <input type="hidden" name="soort" value="link" />
                    <ActieKnop
                      label={`📧 Stuur deelnamelink (${inschr.length})`}
                      bezigLabel="Versturen..."
                      className={`rounded-full px-4 py-1.5 text-sm font-semibold cursor-pointer ${
                        w.meetLink
                          ? "bg-violet-700 text-white hover:bg-violet-600"
                          : "border border-amber-300 text-amber-700 hover:bg-amber-50"
                      }`}
                    />
                  </form>
                  <form action={webinarMailen}>
                    <input type="hidden" name="id" value={w.id} />
                    <input type="hidden" name="soort" value="herinnering" />
                    <ActieKnop
                      label="⏰ Herinnering (vandaag)"
                      bezigLabel="Versturen..."
                      className="rounded-full border border-stone-300 px-4 py-1.5 text-sm font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700 cursor-pointer"
                    />
                  </form>
                  <form action={webinarMailen}>
                    <input type="hidden" name="id" value={w.id} />
                    <input type="hidden" name="soort" value="followup" />
                    <ActieKnop
                      label="🎬 Follow-up na afloop"
                      bezigLabel="Versturen..."
                      className="rounded-full border border-stone-300 px-4 py-1.5 text-sm font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700 cursor-pointer"
                    />
                  </form>
                  {!w.meetLink && (
                    <p className="w-full text-xs text-amber-700">
                      ⚠️ Er staat nog geen deelnamelink bij dit webinar — vul hem eerst in
                      (bewerken hieronder), anders gaat de mail zonder link de deur uit.
                    </p>
                  )}
                </div>
              )}

              {inschr.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-stone-400 hover:text-stone-600">
                    Inschrijvers bekijken en verplaatsen ({inschr.length})
                  </summary>
                  <ul className="mt-2 space-y-1.5 text-sm text-stone-600">
                    {inschr.map((i) => {
                      const v = i.velden as Record<string, string>;
                      return (
                        <li key={i.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium">{v.naam ?? "—"}</span>
                          <span className="text-stone-400">{v.email ?? ""}</span>
                          {v.website && <span className="text-stone-400">· {v.website}</span>}
                          {(mailsPerInschrijving.get(i.id) ?? []).length > 0 && (
                            <span className="text-xs text-emerald-700">
                              ✉ {(mailsPerInschrijving.get(i.id) ?? []).map(korteNaam).join(", ")}
                            </span>
                          )}
                          <form action={webinarInschrijvingVerplaatsen} className="ml-auto flex items-center gap-1.5">
                            <input type="hidden" name="inzendingId" value={i.id} />
                            <select name="naar" required defaultValue="" className={keuzeStijl} aria-label="Verplaats naar">
                              <option value="" disabled>
                                Verplaats naar…
                              </option>
                              {anderen.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {formatWanneer(a.wanneer)}
                                </option>
                              ))}
                              <option value="weg">Inschrijving verwijderen</option>
                            </select>
                            <ActieKnop
                              label="Ok"
                              bezigLabel="…"
                              className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700 cursor-pointer"
                            />
                          </form>
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
                  <label className="block text-sm font-semibold">
                    Voorbeeldvideo (optioneel, komt in de mail van de dag vóór het webinar)
                    <input name="demoVideoLink" defaultValue={w.demoVideoLink ?? ""} placeholder="https://..." className={invoerStijl} />
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
                <form action={webinarBijwerken} className="mt-4 rounded-2xl border border-red-100 bg-red-50/40 p-3">
                  <input type="hidden" name="id" value={w.id} />
                  <input type="hidden" name="verwijder" value="1" />
                  {inschr.length > 0 ? (
                    <label className="block text-xs text-stone-600">
                      Dit webinar heeft {inschr.length} inschrijving{inschr.length === 1 ? "" : "en"}. Wat moet daarmee gebeuren?
                      <select name="inschrijvingen" required defaultValue="" className={`${keuzeStijl} mt-1 block w-full`}>
                        <option value="" disabled>
                          Kies…
                        </option>
                        {anderen.map((a) => (
                          <option key={a.id} value={`naar:${a.id}`}>
                            Verplaatsen naar {formatWanneer(a.wanneer)}
                          </option>
                        ))}
                        <option value="weg">Inschrijvingen verwijderen</option>
                      </select>
                    </label>
                  ) : (
                    <p className="text-xs text-stone-500">Geen inschrijvingen; dit webinar kan zo weg.</p>
                  )}
                  <div className="mt-2">
                    <ActieKnop
                      label="Webinar verwijderen"
                      bezigLabel="Verwijderen..."
                      className="rounded-full border border-red-300 px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                    />
                  </div>
                </form>
              </details>
            </div>
          );
        })}
      </div>

      {zwevend.length > 0 && (
        <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50/50 p-5">
          <h2 className="font-semibold text-amber-900">
            Inschrijvingen zonder webinar ({zwevend.length})
          </h2>
          <p className="mt-1 text-sm text-amber-800">
            Deze horen bij een webinar dat niet meer bestaat of een titel die niet meer klopt. Zet ze bij een datum, of verwijder ze.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-stone-700">
            {zwevend.map((i) => {
              const v = i.velden as Record<string, string>;
              return (
                <li key={i.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium">{v.naam ?? "—"}</span>
                  <span className="text-stone-400">{v.email ?? ""}</span>
                  {v.webinar && <span className="text-stone-400">· {v.webinar}</span>}
                  <form action={webinarInschrijvingVerplaatsen} className="ml-auto flex items-center gap-1.5">
                    <input type="hidden" name="inzendingId" value={i.id} />
                    <select name="naar" required defaultValue="" className={keuzeStijl} aria-label="Verplaats naar">
                      <option value="" disabled>
                        Zet bij…
                      </option>
                      {komende.map((a) => (
                        <option key={a.id} value={a.id}>
                          {formatWanneer(a.wanneer)}
                        </option>
                      ))}
                      <option value="weg">Inschrijving verwijderen</option>
                    </select>
                    <ActieKnop
                      label="Ok"
                      bezigLabel="…"
                      className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700 cursor-pointer"
                    />
                  </form>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
