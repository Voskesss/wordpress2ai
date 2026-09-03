import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { webinars } from "@/db/schema";
import { josFoto } from "@/lib/persoonlijk";

export const metadata: Metadata = {
  title: "Gratis webinar: weg uit WordPress",
  description:
    "In 30 minuten laten we live zien hoe je van je WordPress-site af komt: een snellere website zonder onderhoud, die je aanpast door het gewoon te typen. Schrijf je gratis in.",
  alternates: { canonical: "/webinar" },
};

export const dynamic = "force-dynamic";

const inputStijl =
  "mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-100";

export default async function Webinar() {
  const komende = await db
    .select()
    .from(webinars)
    .where(and(eq(webinars.actief, true), gte(webinars.wanneer, new Date())))
    .orderBy(asc(webinars.wanneer));

  const foto = josFoto();
  const eerstvolgende = komende[0] ?? null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-display text-center text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
        Doe kennis op met ons
        <br />
        <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
          gratis webinar
        </span>
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-center text-lg text-stone-600 leading-relaxed">
        In een half uur zie je live hoe je van plugin-updates, hosting-gedoe en
        trage laadtijden af komt — en hoe je daarna je website aanpast door het
        gewoon te typen. Vragen stellen mag de hele sessie door.
      </p>

      {/* Uitgelicht webinar in Brandfirm-stijl: collage links, inhoud rechts */}
      <div className="mt-12 grid overflow-hidden rounded-[2rem] bg-violet-50/60 border border-violet-100 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Collage met speelse vormen */}
        <div className="relative hidden min-h-[26rem] lg:block">
          <div className="absolute left-8 top-8 h-24 w-24 rounded-[2rem] bg-gradient-to-br from-violet-600 to-fuchsia-500 opacity-90" />
          <div className="absolute right-10 top-14 h-14 w-14 rounded-full bg-amber-300" />
          <div className="absolute bottom-24 left-6 h-16 w-28 rounded-2xl bg-white shadow-lg p-3">
            <p className="text-[10px] font-semibold text-stone-500">Jij typt:</p>
            <p className="mt-0.5 truncate text-[11px] text-stone-800">&ldquo;zet zaterdag open tot 17:00&rdquo;</p>
          </div>
          <div className="absolute bottom-10 right-8 h-12 w-32 rounded-2xl bg-violet-700 p-3 shadow-lg">
            <p className="text-[11px] font-semibold text-white">✓ Staat live</p>
          </div>
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={foto}
              alt="Jos Klijnhout"
              className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-[2.5rem] border-4 border-white object-cover shadow-2xl"
            />
          ) : (
            <div className="font-display absolute left-1/2 top-1/2 flex h-44 w-44 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2.5rem] border-4 border-white bg-gradient-to-br from-violet-600 to-fuchsia-500 text-5xl font-semibold text-white shadow-2xl">
              JK
            </div>
          )}
        </div>

        {/* Inhoud */}
        <div className="p-8 sm:p-12">
          <span className="rounded-full bg-fuchsia-100 px-3.5 py-1.5 text-sm font-semibold text-fuchsia-700">
            Webinar
          </span>
          <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight">
            Weg uit WordPress — zonder gedoe
          </h2>
          <p className="mt-4 text-stone-600 leading-relaxed">
            Jos Klijnhout, eigenaar van AI Backoffice en WordSwap, laat live
            zien hoe hij een website aanpast door het gewoon te typen — en wat
            er komt kijken bij de overstap van WordPress naar een site zonder
            onderhoud. Eerlijk over wat het kost én over wanneer het níét past.
          </p>
          <div className="mt-6 space-y-2 text-stone-700">
            <p>📅 {eerstvolgende
              ? eerstvolgende.wanneer.toLocaleString("nl-NL", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) + " uur"
              : "Nieuwe datum volgt — schrijf je hieronder in voor bericht"}</p>
            <p>⏱ 30 minuten, inclusief je vragen</p>
            <p>💻 Online — link krijg je na inschrijving</p>
          </div>
          <a
            href="#inschrijven"
            className="lift mt-8 inline-block rounded-full bg-violet-700 px-7 py-3.5 font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-600"
          >
            Meld je gratis aan
          </a>
        </div>
      </div>

      <ul className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
        {[
          "Waarom WordPress je vooral tijd en geld kost",
          "Live demo: een wijziging typen en publiceren",
          "Wat de overstap kost (no cure, no pay)",
        ].map((punt) => (
          <li key={punt} className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
            <span className="text-violet-600">✓</span> {punt}
          </li>
        ))}
      </ul>

      <div id="inschrijven" className="mx-auto mt-10 max-w-3xl scroll-mt-24 rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
        {komende.length === 0 ? (
          <div className="text-center">
            <h2 className="font-display text-2xl font-semibold">
              Nog geen datum gepland
            </h2>
            <p className="mt-2 text-stone-600">
              Er staat op dit moment geen webinar op de agenda. Laat je
              websiteadres achter via de{" "}
              <Link href="/contact" className="text-violet-700 underline underline-offset-2">
                gratis site-check
              </Link>{" "}
              — dan kijken we sowieso vrijblijvend met je mee.
            </p>
          </div>
        ) : (
          <>
            <h2 className="font-display text-2xl font-semibold">Schrijf je gratis in</h2>
            <form action="/api/formulier" method="POST" className="mt-5 space-y-5">
              <input type="hidden" name="_site" value="wordswap" />
              <input type="hidden" name="_formulier" value="webinar" />
              <input type="hidden" name="_bedankt" value="/bedankt" />
              <input type="text" name="_extra" defaultValue="" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

              <div>
                <label htmlFor="webinar" className="block text-sm font-semibold">
                  Kies een datum
                </label>
                <select id="webinar" name="webinar" required className={inputStijl}>
                  {komende.map((w) => (
                    <option key={w.id} value={w.titel}>
                      {w.wanneer.toLocaleString("nl-NL", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="naam" className="block text-sm font-semibold">Naam</label>
                  <input id="naam" name="naam" type="text" required className={inputStijl} />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold">E-mailadres</label>
                  <input id="email" name="email" type="email" required className={inputStijl} />
                </div>
              </div>
              <div>
                <label htmlFor="website" className="block text-sm font-semibold">
                  Je huidige website (optioneel)
                </label>
                <input id="website" name="website" type="text" inputMode="url" placeholder="bijv. www.mijnbedrijf.nl" className={inputStijl} />
              </div>

              <button
                type="submit"
                className="lift w-full rounded-full bg-violet-700 px-7 py-3.5 font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-600"
              >
                Ja, ik doe mee — reserveer mijn plek
              </button>
              <p className="text-center text-xs text-stone-400">
                Je krijgt meteen een bevestiging met de deelnamelink en een
                agenda-herinnering. Gratis en vrijblijvend.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
