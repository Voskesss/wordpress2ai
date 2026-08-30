import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Veiligheid: WordPress vs WordSwap",
  description:
    "Waarom een statische WordSwap-site vrijwel niet te hacken is, terwijl WordPress-sites dagelijks worden aangevallen. Vergelijking, uitleg en veelgestelde vragen.",
  alternates: { canonical: "/veiligheid" },
};

const vergelijk: [string, string, string][] = [
  ["Inlogpagina die aan te vallen is", "Ja (wp-admin, doelwit nr. 1)", "Nee — bestaat niet op je site"],
  ["Database die te kraken is", "Ja (alle inhoud + gebruikers)", "Nee — er is geen database"],
  ["Plugins met lekken", "Gemiddeld 20+ plugins om bij te houden", "Nul plugins"],
  ["Updates die je kunt missen", "Wekelijks (core, thema, plugins)", "Niets om te updaten"],
  ["Code die draait op de server", "PHP bij elk bezoek", "Geen — alleen kant-en-klare pagina's"],
  ["Malware-injectie mogelijk", "Bekendste WordPress-probleem", "Er valt niets te injecteren"],
  ["SSL-certificaat (https)", "Zelf regelen bij je hoster", "Automatisch, altijd"],
];

const faq = [
  {
    vraag: "Is een statische website echt niet te hacken?",
    antwoord:
      "Niets is 100%, maar het aanvalsoppervlak is drastisch kleiner. Bij WordPress draait er software op de server (PHP, database, plugins) die aangevallen kan worden; bij een statische site staat er alleen een stapel kant-en-klare pagina's. Er is geen inlogpagina, geen database en geen plugin om te misbruiken. De bekende WordPress-aanvallen — verouderde plugins, wp-admin brute force, SQL-injectie, malware-injectie — bestaan hier simpelweg niet.",
  },
  {
    vraag: "Hoe zijn wijzigingen aan mijn site beveiligd?",
    antwoord:
      "Wijzigen kan alleen via je persoonlijke, ingelogde WordSwap-omgeving, en elke wijziging zie je eerst als voorbeeld voordat jij hem publiceert. Elke publicatie wordt bovendien als versie bewaard: mocht er ooit iets misgaan, dan zetten we je site met één klik terug. Tweestapsverificatie (extra code via je telefoon) kun je zelf aanzetten bij je accountinstellingen.",
  },
  {
    vraag: "Heeft mijn site een SSL-certificaat (https)?",
    antwoord:
      "Ja, standaard en automatisch — inclusief verlenging. Je hoeft er nooit iets voor te doen of apart voor te betalen.",
  },
  {
    vraag: "Hebben jullie een SOC 2- of ISO 27001-certificaat?",
    antwoord:
      "Nee — dat zijn kostbare audit-keurmerken die grote ondernemingen van hun leveranciers eisen, en die voor websites van kleine bedrijven niets toevoegen. Onze veiligheid zit in de architectuur zelf: statische sites zonder aanvalsoppervlak, hosting bij gerenommeerde partijen (Cloudflare, Vercel), versleutelde verbindingen en versiebeheer van elke wijziging. Zie ook onze privacyverklaring voor hoe we met gegevens omgaan.",
  },
  {
    vraag: "Wat gebeurt er met de formulieren op mijn site?",
    antwoord:
      "Formulier-inzendingen gaan versleuteld naar onze server, worden opgeslagen en per e-mail aan jou doorgestuurd. Het formulier is beveiligd tegen spam-bots (honeypot) en tegen misbruik-golven (automatische begrenzing).",
  },
];

export default function Veiligheid() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.vraag,
      acceptedAnswer: { "@type": "Answer", text: f.antwoord },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="mx-auto max-w-3xl px-6 pt-20 pb-10">
        <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
          Hoe veilig is een WordSwap-site vergeleken met WordPress?
        </h1>
        <p className="mt-5 text-lg text-stone-600 leading-relaxed">
          Ruim 40% van alle gehackte websites draait op WordPress — niet omdat
          WordPress slecht is, maar omdat er zoveel draait dat áán te vallen
          valt: een inlogpagina, een database, tientallen plugins. Een
          WordSwap-site is statisch: er draait niets, dus er valt vrijwel niets
          te hacken. Hieronder de eerlijke vergelijking.
        </p>
      </div>

      <div className="mx-auto max-w-3xl px-6 pb-10">
        <div className="overflow-x-auto rounded-2xl border border-stone-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="p-4 font-semibold">Aanvalsmogelijkheid</th>
                <th className="p-4 font-semibold">WordPress</th>
                <th className="p-4 font-semibold text-violet-700">WordSwap</th>
              </tr>
            </thead>
            <tbody>
              {vergelijk.map(([wat, wp, ws]) => (
                <tr key={wat} className="border-t border-stone-100">
                  <td className="p-4 font-semibold text-stone-800">{wat}</td>
                  <td className="p-4 text-stone-600">{wp}</td>
                  <td className="p-4 font-medium text-violet-700">{ws}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-stone-500">
          En mocht er tóch ooit iets zijn: elke gepubliceerde wijziging staat in
          het versiebeheer, dus je site is altijd met één klik terug te zetten
          naar een eerdere versie.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascotte/saluut.webp" alt="" aria-hidden className="mx-auto mt-8 w-40 rounded-3xl" />
      </div>

      <div className="bg-[#f6f1e7] border-y border-stone-200">
        <div className="mx-auto max-w-3xl px-6 py-14">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Veelgestelde vragen over veiligheid
          </h2>
          <div className="mt-6 space-y-6">
            {faq.map((f) => (
              <div key={f.vraag}>
                <h3 className="font-semibold text-lg">{f.vraag}</h3>
                <p className="mt-1.5 text-stone-600 leading-relaxed">{f.antwoord}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-14 text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold">
          Klaar met updates, patches en beveiligingsstress?
        </h2>
        <div className="mt-6 flex justify-center flex-wrap gap-4">
          <Link
            href="/contact"
            className="lift rounded-full bg-violet-700 px-7 py-3.5 font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-600"
          >
            Vraag de gratis site-check aan →
          </Link>
          <Link
            href="/privacy"
            className="lift rounded-full border-2 border-stone-200 bg-white px-7 py-3.5 font-semibold"
          >
            Lees onze privacyverklaring
          </Link>
        </div>
      </div>
    </>
  );
}
