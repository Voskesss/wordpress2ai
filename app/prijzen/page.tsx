import type { Metadata } from "next";
import Link from "next/link";
import { aanbod } from "@/lib/aanbod";
export const metadata: Metadata = {
  title: "Wat kost WordSwap? Overstap, AI-chat en hosting",
  description: aanbod.prijs,
  alternates: { canonical: "/prijzen" },
};
const extra = [
  [
    "Heb ik nog een AI-abonnement nodig?",
    "Nee. Voor de ingebouwde WordSwap-chat heb je geen eigen ChatGPT- of Claude-abonnement nodig. Je eigen assistent kan wel teksten voorbereiden. Een rechtstreekse koppeling vanuit die assistent is nog gepland.",
  ],
  [
    "Wat betekent vanaf €19 per maand?",
    "Het basispakket begint bij €19 per maand. Daarin zitten hosting, beveiliging, de AI-chat en hulp per e-mail, met fair use van maximaal 30 nieuwe concepten per maand en een aanvullende AI-gebruiksgrens. Een groot deel daarvan verdien je vaak terug, omdat je je oude hosting (meestal zo’n €8 tot €15 per maand) na de overstap kunt opzeggen. Heeft je site meer nodig, dan spreken we dat vooraf af, tegelijk met de overstapprijs.",
  ],
  [
    "Zit hulp bij het maandbedrag in?",
    "Meestal heb je geen hulp nodig: je vraagt het aan je website en die regelt het. Vragen stel je in het basispakket per e-mail. Wil je dat wij iets voor je doen, dan rekenen we €15 per kwartier, altijd eerst in overleg. Bij Optimaal ontzorgd zit elke maand 30 minuten ondersteuning inbegrepen; niet gebruikte minuten vervallen aan het eind van de maand. Storingen die bij ons liggen lossen we altijd kosteloos op.",
  ],
  ["Welke kosten staan los van de koppeling?", aanbod.aanvullingen],
  [
    "Welke hulp krijg ik?",
    "Jos is je aanspreekpunt voor de overstap en voor vragen over WordSwap. In het basispakket stel je vragen per e-mail; bij Optimaal ontzorgd krijg je voorrang en 30 minuten ondersteuning per maand, ook voor advies en meedenken. Een nieuw ontwerp of extra functies vallen onder een aparte afspraak. Ondersteuning voor je e-mailbox loopt via je e-mailprovider.",
  ],
  [
    "Wanneer betaal ik voor de overstap?",
    "Je ziet eerst de kopie van je website. Pas na jouw akkoord is het afgesproken bedrag voor de omzetting verschuldigd. Zonder akkoord betaal je niet voor de omzetting. Extra diensten spreken we apart af.",
  ],
  [
    "Zijn de bedragen inclusief btw?",
    "Alle genoemde bedragen zijn exclusief btw, zoals vastgelegd in onze voorwaarden. De exacte prijs en btw staan in je offerte.",
  ],
];
export default function Prijzen() {
  return (
    <div className="marketing-home">
      <section className="shell section-space pricing-heading">
        <p className="eyebrow">DE PRIJS, ZONDER ZOEKWERK</p>
        <h1>
          Je website regelt het.
          <br />
          <em>Wil je nóg minder doen? Dat kan ook.</em>
        </h1>
        <p className="section-intro">
          Je betaalt één keer voor de overstap. Daarna gaat alles vanzelf:
          hosting, beveiliging en updates regelen wij, en aanpassen doe je door
          het gewoon te vragen. Wil je er helemaal niet meer naar omkijken, kies
          dan Optimaal ontzorgd. Alle bedragen zijn exclusief btw.
        </p>
      </section>
      <section
        className="shell pricing-pair"
        aria-label="De twee delen van je prijs"
      >
        <article className="price-card">
          <p className="eyebrow">1. JE WORDPRESS-WEBSITE OVERZETTEN</p>
          <h2>
            €150–€650 <small>eenmalig</small>
          </h2>
          <p>
            Van een kleine bedrijfssite tot een grotere website met meer
            pagina’s of bijzondere onderdelen. Je ontvangt vooraf een prijs voor
            jouw site.
          </p>
          <ul className="check-list">
            {[
              "Inhoud en ontwerp zo nauwkeurig mogelijk overgenomen",
              "Domeinkoppeling en contactformulier",
              "URL’s, paginatitels, beschrijvingen en sitemap gecontroleerd",
              "Een complete kopie bekijken vóór je akkoord geeft",
            ].map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className="price-reassurance">
            Niet tevreden met de kopie? Zonder akkoord betaal je niet voor de
            omzetting.
          </p>
        </article>
        <article className="price-card recurring-card">
          <p className="eyebrow">2. BASISPAKKET · ALLES GAAT VANZELF</p>
          <h2>
            vanaf €19 <small>per maand</small>
          </h2>
          <p>
            Je hebt ons niet nodig om je website bij te houden: je vraagt het
            gewoon, en je website regelt het. Geen eigen AI-abonnement nodig.
          </p>
          <p className="price-reassurance">
            <strong>Een groot deel verdien je vaak terug:</strong> je oude
            hosting, meestal zo&rsquo;n €8 tot €15 per maand, kun je na de
            overstap opzeggen. Draait je e-mail daar nog, dan kijken we eerst
            samen waar die heen kan.
          </p>
          <ul className="check-list">
            {[
              "Hosting, beveiliging en SSL: geregeld",
              "Geen updates of plugins meer",
              "Aanpassen door het gewoon te vragen, eerst een voorbeeld",
              "Een eerdere versie terugzetten kan altijd",
              "Hulp en vragen per e-mail",
              "Fair use: maximaal 30 nieuwe concepten per maand",
              "Maandelijks opzegbaar; je bestanden blijven van jou",
            ].map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </article>
      </section>
      <section className="shell pricing-pair mt-6" aria-label="Optimaal ontzorgd">
        <article className="price-card ontzorgd-card md:col-span-2">
          <p className="eyebrow">3. OPTIMAAL ONTZORGD · AANRADER</p>
          <h2>
            €39 <small>per maand</small>
          </h2>
          <p>
            Je hoeft er zelfs niet meer naar te kijken. Stuur een mailtje, app
            of bel, en wij regelen het voor je.
          </p>
          <ul className="check-list ontzorgd-lijst">
            {[
              "Alles uit het basispakket",
              "Voorrang: wij reageren als eerste op jouw vraag",
              "Elke maand 30 minuten ondersteuning: advies, meedenken of een wijziging die wij voor je doen",
              "Niet gebruikte minuten vervallen aan het eind van de maand",
            ].map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className="ontzorgd-noot">
            Meer nodig in een maand? Daarboven €15 per kwartier, altijd eerst in
            overleg.
          </p>
        </article>
      </section>
      <div className="shell pricing-next">
        <Link href="/contact" className="button-primary">
          Wat kost het voor mijn website? ↗
        </Link>
        <p>
          Wil je in het basispakket een keer iets laten doen door ons? Dat kan
          altijd, voor €15 per kwartier. Storingen die bij ons liggen lossen we
          altijd kosteloos op.
        </p>
        <p>Gratis websitecheck · Vooraf een schriftelijke prijs · Excl. btw</p>
      </div>
      <section className="shell section-space faq-layout">
        <div>
          <p className="eyebrow">DIT WIL JE OOK WETEN</p>
          <h2>
            Wat zit erin?
            <br />
            Wat staat er los van?
          </h2>
          <p>
            Een laag bedrag is pas duidelijk als je ook weet wat je ervoor
            krijgt.
          </p>
        </div>
        <div className="faq-list">
          {extra.map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span>+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="shell cost-example">
        <div>
          <p className="eyebrow">EEN REKENVOORBEELD</p>
          <h2>Wat kost het eerste jaar?</h2>
          <p>
            Stel: jouw overstap kost €150. Met het basispakket van €19 per
            maand betaal je €150 + 12 × €19 ={" "}
            <strong>€378 excl. btw in het eerste jaar</strong>, daarna €228 per
            jaar. Met Optimaal ontzorgd is dat €150 + 12 × €39 ={" "}
            <strong>€618</strong>, met elke maand 30 minuten ondersteuning.
            Ter vergelijking: alleen de hosting van een WordPress-site kost vaak
            al €8 tot €15 per maand, en dan doe je alles nog zelf. Die hosting
            kun je na de overstap meestal opzeggen.
          </p>
          <p className="fine-print">
            Dit is een voorbeeld, geen apart pakket of klantresultaat.
            Domeinregistratie, e-mail en eventueel maatwerk komen er apart bij.
            Vergelijk met je eigen facturen; een besparing verschilt per
            situatie.
          </p>
        </div>
        <div>
          <h3>Liever een nieuwe website?</h3>
          <p>
            AI-ontwerp vanaf €250 (tot 8 pagina’s), €400 tot 20 pagina’s en €650
            voor grotere sites. Een ontwerp door een designer vanaf €1.750.
            Daarna dezelfde maandelijkse koppeling.
          </p>
          <Link className="button-text" href="/nieuwe-website">
            Bekijk de mogelijkheden →
          </Link>
        </div>
      </section>
      <div className="shell new-site-note">
        <Link href="/voorwaarden">Lees de voorwaarden</Link> ·{" "}
        <Link href="/contact">Stel je vraag aan Jos</Link>
      </div>
    </div>
  );
}
