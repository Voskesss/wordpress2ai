import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import LeadForm from "./LeadForm";
import { josFoto } from "@/lib/persoonlijk";

export const metadata: Metadata = {
  title: "Gratis WordPress-websitecheck: geschiktheid en prijs",
  description:
    "Neem vrijblijvend contact op over het overzetten van je WordPress-site. We kijken gratis mee en je krijgt binnen één werkdag antwoord.",
};

const inputStijl =
  "mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 focus:border-[#31956B] focus:outline-none focus:ring-2 focus:ring-[#e3eedd]";

export default async function Contact() {
  // Ingelogde bezoekers (bv. vanuit de demo): naam en e-mail alvast invullen
  const gebruiker = await currentUser().catch(() => null);
  const vulNaam = [gebruiker?.firstName, gebruiker?.lastName]
    .filter(Boolean)
    .join(" ");
  const vulEmail = gebruiker?.emailAddresses?.[0]?.emailAddress ?? "";
  return (
    <div className="mx-auto max-w-5xl px-6 py-20 grid gap-14 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
          Kan jouw WordPress-site mee?
        </h1>
        <p className="mt-5 text-lg text-stone-600 leading-relaxed">
          Stuur je websiteadres mee en we kijken gratis en vrijblijvend of je
          site geschikt is voor de overstap. Je krijgt binnen één werkdag een
          eerlijk antwoord — óók als het (nog) niet past.
        </p>
        <ul className="mt-8 space-y-3 text-stone-600">
          {[
            "Geschiktheid: welke pagina’s en functies kunnen mee?",
            "Aandachtspunten: je domein, mail en SEO-structuur",
            "Een voorstel met overstapprijs, maandbedrag en eventuele extra’s",
          ].map((punt) => (
            <li key={punt} className="flex gap-3">
              <span className="mt-1 text-[#31956B] shrink-0">✓</span>
              {punt}
            </li>
          ))}
        </ul>
        {josFoto() && (
          <div className="mt-10 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={josFoto()!}
              alt="Jos Klijnhout"
              width={72}
              height={72}
              className="h-[4.5rem] w-[4.5rem] rounded-full border-4 border-white object-cover shadow-md"
            />
            <p className="text-sm text-stone-600 leading-snug">
              Je krijgt antwoord van <strong>Jos Klijnhout</strong> zelf — geen
              ticketsysteem, geen supportafdeling.
            </p>
          </div>
        )}
      </div>

      <LeadForm>
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
        <div>
          <p className="eyebrow">GRATIS & VRIJBLIJVEND</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Begin met je website.
          </h2>
          <p className="mt-2 text-sm text-stone-500">
            Alleen je naam, e-mail en websiteadres zijn nodig. Je hoeft nog geen
            toegang of wachtwoord te delen.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="naam" className="block text-sm font-semibold">
              Naam
            </label>
            <input
              id="naam"
              name="naam"
              type="text"
              autoComplete="name"
              required
              defaultValue={vulNaam}
              className={inputStijl}
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-semibold">
              E-mailadres
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={vulEmail}
              className={inputStijl}
            />
          </div>
        </div>
        <div>
          <label htmlFor="website" className="block text-sm font-semibold">
            Je huidige website
          </label>
          <input
            id="website"
            name="website"
            required
            autoComplete="url"
            type="text"
            inputMode="url"
            placeholder="bijv. www.mijnbedrijf.nl"
            className={inputStijl}
          />
        </div>
        <div>
          <label htmlFor="bericht" className="block text-sm font-semibold">
            Nog iets dat we moeten weten? (optioneel)
          </label>
          <textarea
            id="bericht"
            name="bericht"
            rows={3}
            placeholder="Vertel kort over je site en waar je vanaf wilt..."
            className={inputStijl}
          />
        </div>
        <button
          type="submit"
          className="lift rounded-lg bg-[#244b3d] px-7 py-3.5 font-semibold text-white shadow-sm hover:bg-[#2f5d4b]"
        >
          Vraag mijn gratis websitecheck aan ↗
        </button>
        <p className="text-xs leading-relaxed text-stone-500">
          Met je gegevens beantwoorden we je aanvraag. Lees ons{" "}
          <a href="/privacy" className="underline">
            privacybeleid
          </a>
          . Geschikt voor bedrijfssites, blogs en formulieren. Webshops en
          ledenportalen zetten we niet over.
        </p>
      </LeadForm>
    </div>
  );
}
