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
    "Wat betekent €5 tot €20 per maand?",
    "Het maandbedrag hangt af van het afgesproken gebruik. We bespreken dat vooraf, tegelijk met de overstapprijs. Er geldt fair use van 30 wijzigingen per maand. Heb je meer nodig, dan bespreken we wat past.",
  ],
  ["Welke kosten staan los van de koppeling?", aanbod.aanvullingen],
  [
    "Welke hulp krijg ik?",
    "Jos is je aanspreekpunt voor de overstap en vragen over WordSwap. Het maandbedrag is voor hosting en de AI-koppeling. Een nieuw ontwerp of extra functies vallen onder een aparte afspraak. Ondersteuning voor je e-mail loopt via je e-mailprovider.",
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
          Eenmalig overstappen.
          <br />
          <em>Daarna eenvoudig beheren.</em>
        </h1>
        <p className="section-intro">
          Je totaal bestaat uit twee delen: de omzetting van je huidige website
          en een maandbedrag voor hosting en de AI-chat. Alle bedragen zijn
          exclusief btw.
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
          <p className="eyebrow">2. HOSTING EN INGEBOUWDE AI-CHAT</p>
          <h2>
            €5–€20 <small>per maand</small>
          </h2>
          <p>
            Afhankelijk van het gebruik dat we vooraf met je afspreken. Je hoeft
            voor deze chat geen eigen AI-abonnement af te sluiten.
          </p>
          <ul className="check-list">
            {[
              "Hosting, SSL en domeinkoppeling inbegrepen",
              "Wijzigingen aanvragen in gewone taal",
              "Eerst een voorbeeld, dan zelf publiceren",
              "Versiegeschiedenis om een eerdere versie terug te zetten",
              "Fair use: 30 wijzigingen per maand",
              "Maandelijks opzegbaar; je bestanden blijven van jou",
            ].map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </article>
      </section>
      <div className="shell pricing-next">
        <Link href="/contact" className="button-primary">
          Wat kost het voor mijn website? ↗
        </Link>
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
            Stel: jouw overstap kost €150 en je spreekt €10 per maand af. Dan
            betaal je €150 + 12 × €10 ={" "}
            <strong>€270 excl. btw in het eerste jaar</strong>. Daarna €120 per
            jaar bij hetzelfde maandbedrag.
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
