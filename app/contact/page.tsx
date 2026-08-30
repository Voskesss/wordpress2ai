import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Neem vrijblijvend contact op over het overzetten van je WordPress-site. We kijken gratis mee en je krijgt binnen één werkdag antwoord.",
};

const inputStijl =
  "mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-100";

export default async function Contact() {
  // Ingelogde bezoekers (bv. vanuit de demo): naam en e-mail alvast invullen
  const gebruiker = await currentUser().catch(() => null);
  const vulNaam = [gebruiker?.firstName, gebruiker?.lastName].filter(Boolean).join(" ");
  const vulEmail = gebruiker?.emailAddresses?.[0]?.emailAddress ?? "";
  return (
    <div className="mx-auto max-w-5xl px-6 py-20 grid gap-14 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
          Zullen we even kijken?
        </h1>
        <p className="mt-5 text-lg text-stone-600 leading-relaxed">
          Stuur je websiteadres mee en we kijken gratis en vrijblijvend of je
          site geschikt is voor de overstap. Je krijgt binnen één werkdag een
          eerlijk antwoord — óók als het (nog) niet past.
        </p>
        <ul className="mt-8 space-y-3 text-stone-600">
          {[
            "Gratis check van je huidige site",
            "Duidelijke prijs vooraf, geen verrassingen",
            "No cure, no pay: niet tevreden met de kopie, dan betaal je niets",
          ].map((punt) => (
            <li key={punt} className="flex gap-3">
              <span className="mt-1 text-violet-600 shrink-0">✓</span>
              {punt}
            </li>
          ))}
        </ul>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascotte/zwaaiend.webp" alt="" aria-hidden className="mt-8 hidden w-44 rounded-3xl lg:block" />
      </div>

      <form
        className="lg:col-span-3 reveal rounded-3xl border border-stone-200 bg-white p-8 shadow-sm space-y-5"
        action="/api/formulier"
        method="POST"
      >
        <input type="hidden" name="_site" value="wordswap" />
        <input type="hidden" name="_formulier" value="kennismaken" />
        <input type="hidden" name="_bedankt" value="/bedankt" />
        <input
          type="text"
          name="_extra"
          defaultValue=""
          style={{ display: "none" }}
          tabIndex={-1}
          autoComplete="off"
        />
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          Goed om te weten: webshops en ledenportalen met inlog kunnen we niet
          overzetten. Gewone bedrijfssites — ook met blog en formulieren —
          juist wél. Gebruik je een boekings- of afsprakensysteem (zoals een
          agenda-widget)? Dat nemen we gewoon mee. En maatwerk is altijd
          bespreekbaar. Twijfel je? Stuur je site gewoon in, dan kijken we
          gratis mee.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="naam" className="block text-sm font-semibold">
              Naam
            </label>
            <input id="naam" name="naam" type="text" required defaultValue={vulNaam} className={inputStijl} />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-semibold">
              E-mailadres
            </label>
            <input id="email" name="email" type="email" required defaultValue={vulEmail} className={inputStijl} />
          </div>
        </div>
        <div>
          <label htmlFor="website" className="block text-sm font-semibold">
            Je huidige website
          </label>
          <input
            id="website"
            name="website"
            type="text"
            inputMode="url"
            placeholder="bijv. www.mijnbedrijf.nl"
            className={inputStijl}
          />
        </div>
        <div>
          <label htmlFor="bericht" className="block text-sm font-semibold">
            Waar kunnen we je mee helpen?
          </label>
          <textarea
            id="bericht"
            name="bericht"
            rows={5}
            required
            placeholder="Vertel kort over je site en waar je vanaf wilt..."
            className={inputStijl}
          />
        </div>
        <button
          type="submit"
          className="lift rounded-full bg-violet-700 px-7 py-3.5 font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-600"
        >
          Verstuur — je hoort binnen één werkdag van ons
        </button>
      </form>
    </div>
  );
}
