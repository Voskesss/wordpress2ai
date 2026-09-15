import type { Metadata } from "next";
import Link from "next/link";
import LeadForm from "../contact/LeadForm";
import { josFoto } from "@/lib/persoonlijk";

export const metadata: Metadata = {
  title: "Een website is goedkoop geworden. Het gedoe erna niet.",
  description:
    "Iedereen belooft een goedkope AI-website. Klopt, bouwen is goedkoop geworden. Maar hosting, mail, domein, vindbaarheid en aanpassen dan? Wat WordSwap wél regelt.",
  alternates: { canonical: "/ai-website" },
};

const inputStijl =
  "mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 focus:border-[#31956B] focus:outline-none focus:ring-2 focus:ring-[#e3eedd]";

const valkuilen = [
  {
    kop: "Waar staat hij eigenlijk?",
    tekst:
      "Een gebouwde website is een stapel bestanden. Die moeten ergens draaien, met een beveiligde verbinding en een adres. Vaak zit dat bij de bouwer, in een tool die je niet kent, op een abonnement dat je niet ziet.",
  },
  {
    kop: "Je domein en je mail",
    tekst:
      "Je domeinnaam en je e-mail zijn losse dingen. Als die bij de verkeerde partij of op naam van de bouwer staan, ben je ze kwijt als de samenwerking stopt. Dat merk je pas als het te laat is.",
  },
  {
    kop: "Vindbaar in Google",
    tekst:
      "Een mooie site die niemand vindt, levert niets op. Paginatitels, structuur, laadtijd en een sitemap zijn geen extraatjes. Bij een snelle AI-bouw worden ze meestal overgeslagen.",
  },
  {
    kop: "Iets aanpassen na de oplevering",
    tekst:
      "Nieuwe openingstijden, een prijs erbij, een foto van je laatste klus. Bij veel goedkope sites moet je daarvoor terug naar de bouwer, of zelf in een editor die je niet begrijpt.",
  },
  {
    kop: "Als het stuk is",
    tekst:
      "Formulier werkt niet, foto laadt niet, site is traag. Wie bel je dan? Een aanbieder die tien euro per site verdient, kan geen mens aan de telefoon zetten.",
  },
  {
    kop: "Als de bouwer stopt",
    tekst:
      "Veel aanbieders van goedkope AI-websites bestaan een jaar. Dan is de tool weg, de hosting weg, en jouw site ook. Tenzij je zelf de bestanden hebt.",
  },
  {
    kop: "Van wie is de site?",
    tekst:
      "Lees de voorwaarden. Vaak huur je de site en is hij nooit van jou geweest. Je teksten, foto’s en klantgegevens staan in een systeem waar je niet zomaar uit kunt.",
  },
];

const wijRegelen = [
  {
    kop: "Eén pakket, geen losse eindjes",
    tekst:
      "Website, hosting, beveiligde verbinding, domeinkoppeling en versiegeschiedenis. Mail en domein regelen we op jouw naam. Je hebt één aanspreekpunt.",
  },
  {
    kop: "Wijzigen door het te typen",
    tekst:
      "“Zet onze nieuwe openingstijden erop.” Dat typ je in de chat. Je bekijkt het voorstel op je eigen site en publiceert zelf. Klopt het niet, dan zet je een eerdere versie terug.",
  },
  {
    kop: "De site en je gegevens zijn van jou",
    tekst:
      "Je websitebestanden staan in een eigen omgeving op jouw naam. Je kunt ze op elk moment meenemen. Formulierinzendingen staan in jouw portaal. Maandelijks opzegbaar, zonder dat je iets kwijtraakt.",
  },
  {
    kop: "Vindbaar vanaf dag één",
    tekst:
      "Paginatitels, meta-informatie, sitemap, laadtijd en een schone structuur horen bij de bouw. Bij een overstap nemen we je bestaande adressen en posities zorgvuldig mee.",
  },
  {
    kop: "Geen WordPress, geen updates",
    tekst:
      "Je site bestaat uit kant-en-klare pagina’s. Geen plugins, geen thema-updates, geen database die gehackt kan worden. Dat is waarom hij snel en rustig blijft.",
  },
  {
    kop: "Een mens erachter",
    tekst:
      "Je krijgt antwoord van Jos, niet van een ticketsysteem. Bij vragen, storingen of als je iets groters wilt, bespreek je het gewoon.",
  },
];

const faq = [
  {
    vraag: "Is een AI-website dan slecht?",
    antwoord:
      "Nee. Wij bouwen ook met AI, dat is precies waarom een nieuwe site bij ons vanaf €250 kan. Het verschil zit in alles eromheen: hosting, mail, domein, vindbaarheid, aanpassen en beheer. Dat is het deel dat je later tijd en geld kost als het niet geregeld is.",
  },
  {
    vraag: "Ik heb al een goedkope AI-website. Kan die mee?",
    antwoord:
      "Meestal wel. Stuur het adres via de websitecheck. We kijken wat er aan de site zit, wat we kunnen overnemen en wat beter opnieuw kan. Je hoort binnen één werkdag wat het zou kosten.",
  },
  {
    vraag: "Wat kost het bij WordSwap?",
    antwoord:
      "Een nieuwe site vanaf €250 eenmalig, een overstap vanaf €150. Daarna €5 tot €20 per maand voor hosting en de AI-koppeling. Domein en mail apart, op jouw naam. Alle bedragen exclusief btw en vooraf schriftelijk afgesproken.",
  },
  {
    vraag: "Wat als ik weg wil?",
    antwoord:
      "Dan neem je je websitebestanden, je domein en je mail gewoon mee. De koppeling is maandelijks opzegbaar. Er zit niets vast aan ons.",
  },
];

export default function AiWebsite() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.vraag,
      acceptedAnswer: { "@type": "Answer", text: f.antwoord },
    })),
  };
  const foto = josFoto();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Hero */}
      <div className="mx-auto max-w-4xl px-6 pt-20">
        <p className="eyebrow">VOOR ONDERNEMERS DIE EEN AI-WEBSITE OVERWEGEN</p>
        <h1 className="font-display mt-3 text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.08]">
          Een website is goedkoop geworden.
          <br />
          <em className="not-italic text-[#31956B]">Het gedoe erna niet.</em>
        </h1>
        <p className="mt-6 text-lg text-stone-600 leading-relaxed max-w-2xl">
          Iedereen belooft nu een website voor bijna niets. Dat klopt: bouwen
          is met AI goedkoop geworden, wij doen het ook. Maar dan begint het
          pas. Waar staat hij, wie regelt je mail en domein, hoe pas je iets
          aan, wie bel je als het stuk is?
        </p>
        <p className="mt-4 text-lg text-stone-600 leading-relaxed max-w-2xl">
          Bij WordSwap koop je geen website. Je krijgt hem, mét alles eromheen.
          En iets wijzigen? Dat typ je in de chat van je eigen website, en hij
          past het zelf aan.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <a href="#check" className="button-primary">
            Laat mijn site gratis checken <span>↗</span>
          </a>
          <Link href="/demo" className="button-text">
            Bekijk hoe aanpassen werkt <span>→</span>
          </Link>
        </div>
      </div>

      {/* Valkuilen */}
      <section className="mx-auto max-w-4xl px-6 pt-20">
        <p className="eyebrow">WAT DE GOEDKOPE AANBIEDER NIET VERTELT</p>
        <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight">
          Zeven dingen die pas na de oplevering opvallen
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {valkuilen.map((v, i) => (
            <div
              key={v.kop}
              className="reveal rounded-xl border border-stone-200 bg-white p-6"
            >
              <p className="text-sm font-semibold text-stone-400">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-1 font-display text-lg font-semibold">
                {v.kop}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {v.tekst}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Wat wij regelen */}
      <section className="mx-auto max-w-4xl px-6 pt-20">
        <p className="eyebrow">ZO DOEN WIJ HET</p>
        <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight">
          Goedkoop bouwen, goed regelen
        </h2>
        <p className="mt-4 text-stone-600 leading-relaxed max-w-2xl">
          Wij gebruiken dezelfde AI om te bouwen. Het verschil zit in wat er
          daarna geregeld is, en in wie er antwoord geeft.
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {wijRegelen.map((w) => (
            <div
              key={w.kop}
              className="reveal rounded-xl border border-[#dde7d9] bg-[#eff3e8] p-6"
            >
              <h3 className="font-display text-lg font-semibold flex gap-2.5">
                <span className="text-[#31956B] shrink-0">✓</span>
                {w.kop}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">
                {w.tekst}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-stone-500">
          Nieuwe site vanaf €250 eenmalig, overstap vanaf €150. Daarna €5 tot
          €20 per maand. Domein en mail apart, op jouw naam. Excl. btw.{" "}
          <Link href="/prijzen" className="underline">
            Alle prijzen
          </Link>
          .
        </p>
      </section>

      {/* Check */}
      <div
        id="check"
        className="mx-auto max-w-5xl px-6 pt-20 pb-20 grid gap-14 lg:grid-cols-5 scroll-mt-24"
      >
        <div className="lg:col-span-2">
          <p className="eyebrow">GRATIS & VRIJBLIJVEND</p>
          <h2 className="font-display mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
            Heb je al een site? Laat hem checken.
          </h2>
          <p className="mt-5 text-stone-600 leading-relaxed">
            Stuur je websiteadres. Jos bekijkt wat er goed geregeld is en wat
            niet: hosting, mail, domein, vindbaarheid en of je hem zelf kunt
            bijhouden. Binnen één werkdag krijg je antwoord, ook als alles al
            prima staat.
          </p>
          <ul className="mt-8 space-y-3 text-stone-600">
            {[
              "Waar je site nu draait en wie de baas is over domein en mail",
              "Of Google hem kan vinden en wat er mist",
              "Een voorstel met prijs, als overstappen zin heeft",
            ].map((punt) => (
              <li key={punt} className="flex gap-3">
                <span className="mt-1 text-[#31956B] shrink-0">✓</span>
                {punt}
              </li>
            ))}
          </ul>
          {foto && (
            <div className="mt-10 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={foto}
                alt="Jos Klijnhout"
                width={72}
                height={72}
                className="h-[4.5rem] w-[4.5rem] rounded-full border-4 border-white object-cover shadow-md"
              />
              <p className="text-sm text-stone-600 leading-snug">
                Je krijgt antwoord van <strong>Jos Klijnhout</strong> zelf, geen
                ticketsysteem.
              </p>
            </div>
          )}
        </div>

        <LeadForm>
          <input type="hidden" name="_site" value="wordswap" />
          <input type="hidden" name="_formulier" value="kennismaken" />
          <input type="hidden" name="_bedankt" value="/bedankt" />
          <input type="hidden" name="bron" value="ai-website" />
          <input
            type="text"
            name="_extra"
            defaultValue=""
            style={{ display: "none" }}
            tabIndex={-1}
            autoComplete="off"
          />
          <div>
            <p className="eyebrow">WEBSITECHECK</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Begin met je websiteadres.
            </h2>
            <p className="mt-2 text-sm text-stone-500">
              Alleen je naam, e-mail en websiteadres zijn nodig. Nog geen site?
              Zet dan “nog geen” in het veld.
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
                className={inputStijl}
              />
            </div>
          </div>
          <div>
            <label htmlFor="telefoon" className="block text-sm font-semibold">
              Telefoonnummer (optioneel)
            </label>
            <input
              id="telefoon"
              name="telefoon"
              type="tel"
              autoComplete="tel"
              placeholder="voor als bellen makkelijker praat"
              className={inputStijl}
            />
          </div>
          <div>
            <label htmlFor="website" className="block text-sm font-semibold">
              Je website
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
              Wat doe je, en waar loop je tegenaan? (optioneel)
            </label>
            <textarea
              id="bericht"
              name="bericht"
              rows={3}
              placeholder="Bijvoorbeeld: schoonmaakbedrijf, site gemaakt met een AI-bouwer, ik weet niet waar hij draait."
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
            . Voor bedrijfssites met pagina’s, foto’s en formulieren. Webshops
            en ledenportalen doen we niet.
          </p>
        </LeadForm>
      </div>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        <p className="eyebrow">VEELGESTELDE VRAGEN</p>
        <div className="mt-6 divide-y divide-stone-200 border-y border-stone-200">
          {faq.map((f) => (
            <details key={f.vraag} className="group py-5">
              <summary className="cursor-pointer list-none font-display text-lg font-semibold flex justify-between gap-4">
                {f.vraag}
                <span className="text-stone-400 group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>
              <p className="mt-3 text-stone-600 leading-relaxed">
                {f.antwoord}
              </p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
