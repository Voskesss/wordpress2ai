import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import LeadForm from "./LeadForm";
import ContactVoorkeur from "./ContactVoorkeur";
import { josFoto, TELEFOON, TELEFOON_LINK } from "@/lib/persoonlijk";

export const metadata: Metadata = {
  title: "Gratis WordPress-websitecheck: geschiktheid en prijs",
  description:
    "Neem vrijblijvend contact op over het overzetten van je WordPress-site. We kijken gratis mee en je krijgt binnen één werkdag antwoord.",
};

const inputStijl =
  "mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 focus:border-[#31956B] focus:outline-none focus:ring-2 focus:ring-[#e3eedd]";

export default async function Contact({
  searchParams,
}: {
  searchParams: Promise<{ onderwerp?: string | string[] }>;
}) {
  const { onderwerp } = await searchParams;
  const samenwerken = onderwerp === "samenwerken";
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
          {samenwerken
            ? "Samen één klantsite bekijken?"
            : "Kan jouw website zonder WordPress?"}
        </h1>
        <p className="mt-5 text-lg text-stone-600 leading-relaxed">
          {samenwerken
            ? "Vertel over de klantsite die je wilt overzetten. Jos neemt binnen één werkdag contact op om de mogelijkheden en rolverdeling te bespreken."
            : "Stuur je websiteadres. Jos bekijkt gratis of we jouw site kunnen overzetten met je bestaande uitstraling en inhoud, zodat je hem daarna zelf bijhoudt met AI. Binnen één werkdag krijg je antwoord, ook als het niet past."}
        </p>
        {!samenwerken && (
          <p className="mt-4 rounded-xl border border-[#dde7d9] bg-[#eff3e8] px-4 py-3 text-stone-700 leading-relaxed">
            <strong>Daarna hoef je je nergens druk om te maken.</strong> Hosting,
            beveiliging, updates en je formulieren regelen wij. Jij houdt alleen
            je eigen teksten en foto&apos;s bij, door het gewoon te typen.
          </p>
        )}
        {!samenwerken && (
          <div className="mt-4 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm leading-relaxed text-stone-600">
            <p className="font-semibold text-stone-800">Past jouw website?</p>
            <p className="mt-1">
              Gewone bedrijfssites, ook met blog en formulieren: <strong>juist wél</strong>. Een bestaand
              boekings- of afsprakensysteem (agenda-widget) bekijken we per site, en maatwerk is bespreekbaar.
              Webshops en ledenportalen met inlog zetten we niet over, die hebben een draaiend systeem nodig.
              Twijfel je? De check is gratis.
            </p>
          </div>
        )}
        <ul className="mt-8 space-y-3 text-stone-600">
          {[
            "Geschiktheid: welke pagina’s en functies kunnen mee?",
            "Aandachtspunten: je domein, mail en SEO-structuur",
            "Een voorstel met overstapprijs, maandbedrag en eventuele extra’s",
            "Een terugbelmoment dat jou uitkomt, ook ’s avonds",
          ].map((punt) => (
            <li key={punt} className="flex gap-3">
              <span className="mt-1 text-[#31956B] shrink-0">✓</span>
              {punt}
            </li>
          ))}
        </ul>
        <div className="mt-8 rounded-xl border border-stone-200 bg-white px-4 py-3">
          <p className="text-sm font-semibold text-stone-800">Liever meteen bellen?</p>
          <p className="mt-1">
            <a
              href={`tel:${TELEFOON_LINK}`}
              className="text-xl font-semibold text-[#244b3d] underline-offset-4 hover:underline"
            >
              {TELEFOON}
            </a>
          </p>
          <p className="mt-1 text-sm text-stone-500">
            Je krijgt Jos zelf aan de lijn. Niet bereikbaar? Laat je nummer achter in het
            formulier, dan belt hij je terug op het moment dat jou uitkomt.
          </p>
        </div>
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
            {samenwerken
              ? "Bespreek een samenwerking."
              : "Begin met je websiteadres."}
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
        <ContactVoorkeur />
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
            defaultValue={
              samenwerken
                ? "Ik wil samenwerken met WordSwap rond een bestaande klantsite. "
                : ""
            }
            placeholder="Bijvoorbeeld: ik wil mijn site houden, maar zelf teksten en foto’s aanpassen."
            className={inputStijl}
          />
        </div>
        <button
          type="submit"
          className="lift rounded-lg bg-[#244b3d] px-7 py-3.5 font-semibold text-white shadow-sm hover:bg-[#2f5d4b]"
        >
          {samenwerken
            ? "Bespreek deze klantsite met Jos ↗"
            : "Vraag mijn gratis websitecheck aan ↗"}
        </button>
        <p className="text-xs leading-relaxed text-stone-500">
          Met je gegevens beantwoorden we je aanvraag. Lees ons{" "}
          <a href="/privacy" className="underline">
            privacybeleid
          </a>
          .
        </p>
      </LeadForm>
    </div>
  );
}
