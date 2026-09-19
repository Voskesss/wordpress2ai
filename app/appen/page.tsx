import type { Metadata } from "next";
import Link from "next/link";
import LeadForm from "../contact/LeadForm";
import ContactVoorkeur from "../contact/ContactVoorkeur";
import { josFoto } from "@/lib/persoonlijk";

export const metadata: Metadata = {
  title: "Je laatste klus op je website? Stuur een appje.",
  description:
    "Foto’s van je werk op je site zetten door ze te appen. In bèta bij WordSwap. Vandaag kan het al via de chat van je eigen website: je zegt wat erop moet, je site past het aan.",
  alternates: { canonical: "/appen" },
};

const inputStijl =
  "mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 focus:border-[#31956B] focus:outline-none focus:ring-2 focus:ring-[#e3eedd]";

const gesprek = [
  { van: "jij", tekst: "Klus in Velp klaar. Zet deze drie foto’s erbij." },
  { van: "site", tekst: "Staat klaar als voorstel. Bekijken?" },
  { van: "jij", tekst: "Ja, en zet er ‘dakkapel vervangen’ boven." },
  { van: "site", tekst: "Gedaan. Jij drukt op publiceren." },
];

const watJeKrijgt = [
  {
    kop: "Je zegt het, je website doet het",
    tekst:
      "Nieuwe prijzen, een vakantiemelding, foto’s van je laatste klus. Je typt het in de chat van je eigen site. Je krijgt een voorstel te zien en publiceert zelf.",
  },
  {
    kop: "Geen plugins en geen updates",
    tekst:
      "Je site bestaat uit gewone, snelle webpagina’s. Geen WordPress-onderhoud, geen plugin die stukgaat, geen database die gehackt kan worden.",
  },
  {
    kop: "Je ontwerp en je vindbaarheid blijven",
    tekst:
      "We zetten je huidige site om: hetzelfde ontwerp, dezelfde teksten en dezelfde adressen, zodat je opbouw in Google meegaat. Wel sneller en schoner.",
  },
  {
    kop: "Ook leesbaar voor AI",
    tekst:
      "Steeds meer mensen zoeken via ChatGPT of Google AI. Een snelle site met schone structuur is voor die systemen makkelijker te lezen dan een volgeladen WordPress-pagina.",
  },
];

const faq = [
  {
    vraag: "Werkt dat appen nu al?",
    antwoord:
      "Het appen zit in bèta: we testen het met een kleine groep. Wat vandaag al wel werkt, is de chat op je eigen website. Daarin typ je wat er anders moet, je ziet een voorstel en je publiceert zelf. Wie zich nu aanmeldt, hoort als eerste wanneer het appen opengaat.",
  },
  {
    vraag: "Wat moet ik doen om mee te kunnen doen?",
    antwoord:
      "Je website moet eerst omgezet zijn naar WordSwap. Dat is precies wat het snel en veilig maakt: er zit geen WordPress meer onder. Een overstap begint bij €150 eenmalig, daarna vanaf €19 per maand voor hosting en de chat. Alle bedragen exclusief btw en vooraf schriftelijk afgesproken.",
  },
  {
    vraag: "Ben ik mijn huidige site dan kwijt?",
    antwoord:
      "Nee. We maken er een kopie van: hetzelfde ontwerp, dezelfde teksten, dezelfde pagina-adressen. Je oude site blijft staan tot jij akkoord geeft op de nieuwe.",
  },
  {
    vraag: "Van wie is de website daarna?",
    antwoord:
      "Van jou. Je websitebestanden download je op elk moment zelf in je portaal, ook als je gewoon blijft. Je domein blijft van jou, waar het ook staat. Maandelijks opzegbaar.",
  },
];

export default function Appen() {
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
      <div className="mx-auto max-w-5xl px-6 pt-20 grid gap-12 lg:grid-cols-5 items-start">
        <div className="lg:col-span-3">
          <p className="eyebrow">IN BÈTA — MELD JE AAN VOOR DE EERSTE GROEP</p>
          <h1 className="font-display mt-3 text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.08]">
            Je laatste klus op je website?
            <br />
            <em className="not-italic text-[#31956B]">Stuur een appje.</em>
          </h1>
          <p className="mt-6 text-lg text-stone-600 leading-relaxed">
            Een paar foto’s van het werk van vandaag, een zin erbij, versturen.
            Je website maakt er een bericht van en jij drukt op publiceren. Geen
            inloggen, geen editor, geen avond eraan kwijt.
          </p>
          <p className="mt-4 text-lg text-stone-600 leading-relaxed">
            Het appen testen we nu met een kleine groep. Wat vandaag al werkt:
            hetzelfde doen in de chat van je eigen site.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a href="#aanmelden" className="button-primary">
              Ik wil bij de eerste groep <span>↗</span>
            </a>
            <Link href="/demo" className="button-text">
              Bekijk hoe de chat werkt <span>→</span>
            </Link>
          </div>
        </div>

        {/* Gesprek */}
        <div className="lg:col-span-2 rounded-2xl border border-stone-200 bg-[#f4f1ec] p-5 sm:p-6">
          <p className="eyebrow">ZO GAAT DAT STRAKS</p>
          <div className="mt-4 space-y-3">
            {gesprek.map((b, i) => (
              <div
                key={i}
                className={
                  b.van === "jij"
                    ? "ml-auto max-w-[88%] rounded-2xl rounded-br-sm bg-[#dcf8c6] px-4 py-3 text-[0.95rem] leading-snug text-stone-800"
                    : "mr-auto max-w-[88%] rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-[0.95rem] leading-snug text-stone-800 shadow-sm"
                }
              >
                {b.tekst}
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-stone-500">
            Voorbeeld van een gesprek. Jij blijft aan zet: niets gaat online
            zonder dat jij op publiceren drukt.
          </p>
        </div>
      </div>

      {/* Wat je krijgt */}
      <section className="mx-auto max-w-4xl px-6 pt-20">
        <p className="eyebrow">WAT ER VERANDERT</p>
        <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight">
          Bijwerken hoort geen klus te zijn
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {watJeKrijgt.map((w) => (
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
      </section>

      {/* Voorwaarde */}
      <section className="mx-auto max-w-4xl px-6 pt-20">
        <div className="rounded-xl border border-stone-200 bg-white p-6 sm:p-8">
          <p className="eyebrow">ÉÉN VOORWAARDE, EERLIJK GEZEGD</p>
          <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight">
            Je site moet eerst omgezet zijn
          </h2>
          <p className="mt-4 text-stone-600 leading-relaxed">
            Appen en chatten kan doordat je website geen WordPress meer is, maar
            gewone snelle pagina’s die wij beheren. Daarom hoort er een overstap
            bij: wij maken een kopie van je huidige site, met hetzelfde ontwerp,
            dezelfde teksten en dezelfde adressen.
          </p>
          <p className="mt-4 text-stone-600 leading-relaxed">
            Een overstap begint bij <strong>€150 eenmalig</strong>, daarna{" "}
            <strong>vanaf €19 per maand</strong> voor hosting en de chat. Daarmee
            ben je af van plugins, updates en ingewikkelde wijzigingen. Domein en
            mail blijven van jou.{" "}
            <Link href="/prijzen" className="underline">
              Alle prijzen
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Aanmelden */}
      <div
        id="aanmelden"
        className="mx-auto max-w-5xl px-6 pt-20 pb-20 grid gap-14 lg:grid-cols-5 scroll-mt-24"
      >
        <div className="lg:col-span-2">
          <p className="eyebrow">GRATIS & VRIJBLIJVEND</p>
          <h2 className="font-display mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
            Meld je aan voor de eerste groep
          </h2>
          <p className="mt-5 text-stone-600 leading-relaxed">
            Stuur je websiteadres. Jos kijkt wat er van je huidige site mee kan,
            wat een overstap zou kosten en wanneer het appen voor jou opengaat.
            Je hebt nog niets besteld.
          </p>
          <ul className="mt-8 space-y-3 text-stone-600">
            {[
              "Wat er van je huidige site meegaat, inclusief je adressen",
              "Wat de overstap kost en wat je maandelijks kwijt bent",
              "Wanneer je het appen kunt proberen",
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
          <input type="hidden" name="_formulier" value="appen" />
          <input type="hidden" name="_bedankt" value="/bedankt" />
          <input type="hidden" name="bron" value="appen" />
          <input
            type="text"
            name="_extra"
            defaultValue=""
            style={{ display: "none" }}
            tabIndex={-1}
            autoComplete="off"
          />
          <div>
            <p className="eyebrow">AANMELDEN</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Begin met je websiteadres.
            </h2>
            <p className="mt-2 text-sm text-stone-500">
              Je naam, e-mailadres en websiteadres zijn genoeg. Een
              telefoonnummer mag, dan bel ik je liever even.
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
          <ContactVoorkeur />
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
              Wat zou je als eerste willen appen? (optioneel)
            </label>
            <textarea
              id="bericht"
              name="bericht"
              rows={3}
              placeholder="Bijvoorbeeld: foto’s van mijn laatste klus, of nieuwe prijzen."
              className={inputStijl}
            />
          </div>
          <button
            type="submit"
            className="lift rounded-lg bg-[#244b3d] px-7 py-3.5 font-semibold text-white shadow-sm hover:bg-[#2f5d4b]"
          >
            Meld mij aan voor de eerste groep ↗
          </button>
          <p className="text-xs leading-relaxed text-stone-500">
            Met je gegevens beantwoorden we je aanmelding. Lees ons{" "}
            <a href="/privacy" className="underline">
              privacybeleid
            </a>
            . Voor bedrijfssites met pagina’s, foto’s en formulieren. Webshops en
            ledenportalen doen we niet.
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
