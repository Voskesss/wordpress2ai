import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { webinars } from "@/db/schema";

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

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="sm:flex sm:items-center sm:gap-8">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-700">
            Gratis online webinar
          </p>
          <h1 className="font-display mt-2 text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
            Weg uit WordPress — zonder gedoe
          </h1>
          <p className="mt-5 text-lg text-stone-600 leading-relaxed">
            In een half uur laten we je live zien hoe je van plugin-updates,
            hosting-gedoe en trage laadtijden af komt. Je stelt gerust je
            vragen — en je ziet met eigen ogen hoe je een website aanpast door
            het gewoon te typen.
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascotte/uitleggend.webp" alt="" aria-hidden className="mt-6 sm:mt-0 w-36 sm:w-44 shrink-0" />
      </div>

      <ul className="mt-8 grid gap-3 sm:grid-cols-3">
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

      <div className="mt-10 rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
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
