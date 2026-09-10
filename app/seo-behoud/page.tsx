import VerhaalBeeld from "../VerhaalBeeld";
import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = {
  title: "WordPress overzetten met behoud van URL’s en SEO-inrichting",
  description:
    "Je bestaande URL’s, structuur, titels en meta-informatie meenemen. Lees wat we voor en na de WordSwap-overstap controleren.",
  alternates: { canonical: "/seo-behoud" },
};
const controles = [
  [
    "Pagina-adressen en structuur",
    "Bestaande URL’s zijn het uitgangspunt, inclusief het pad van iedere pagina. Als een adres moet veranderen, bespreken we dat en richten we een passende permanente doorverwijzing in.",
  ],
  [
    "Titels en meta-informatie",
    "We vergelijken paginatitels, metabeschrijvingen, canonical-verwijzingen en indexeringsinstellingen. Bestaande gestructureerde gegevens beoordelen we op toepasbaarheid in de overgezette site.",
  ],
  [
    "Inhoud en interne links",
    "Teksten, afbeeldingen en interne verwijzingen gaan mee. We controleren op ontbrekende pagina’s, afbeeldingen en links. Een andere technische opbouw mag geen ongemerkt verdwenen inhoud opleveren.",
  ],
  [
    "Werking en oplevering",
    "We testen navigatie en contactformulieren en bespreken afwijkende functies. Je bekijkt de overgezette website voordat je toestemming geeft voor de overstap.",
  ],
];
export default function SeoBehoud() {
  return (
    <div className="marketing-home">
      <section className="shell section-space pricing-heading">
        <p className="eyebrow">ZORGVULDIG VERDER MET JE BESTAANDE WEBSITE</p>
        <h1>
          Je SEO-inrichting
          <br />
          <em>verhuist mee.</em>
        </h1>
        <p className="section-intro">
          Je hebt al pagina’s, inhoud en vindbaarheid opgebouwd. Daarom beginnen
          we bij je huidige WordPress-website: dezelfde pagina-adressen en
          structuur waar mogelijk, met je bestaande titels en meta-informatie.
        </p>
        <Link href="/contact" className="button-primary">
          Laat mijn website beoordelen →
        </Link>
      </section>
      <div className="shell verhaal-wide">
        <VerhaalBeeld onderwerp="websitebeheer" />
      </div>
      <section className="shell section-space">
        <div className="section-heading">
          <h2>Dit controleren we bij de overstap.</h2>
          <p>
            We leggen afwijkingen vast, zodat je weet wat behouden blijft en
            waar een andere oplossing nodig is.
          </p>
        </div>
        <div className="benefit-grid">
          {controles.map(([titel, tekst]) => (
            <article className="benefit" key={titel}>
              <h3>{titel}</h3>
              <p>{tekst}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="shell fit-section">
        <div>
          <p className="eyebrow">EEN EERLIJKE AFSPRAAK</p>
          <h2>Technische SEO behouden is zorgvuldig werk.</h2>
          <p>
            Dezelfde URL’s en metadata zijn belangrijk, maar vormen geen
            garantie op dezelfde zoekposities. Zoekmachines beoordelen ook
            inhoud, prestaties, externe verwijzingen en andere signalen. Ook een
            vermelding in een AI-antwoord is niet te garanderen.
          </p>
        </div>
        <div className="change-ledger">
          <div>
            <strong>Vóór livegang</strong>
            <p>
              We vergelijken de oorspronkelijke site met de overgezette versie.
              Bij fouten of onduidelijke verschillen lossen we die eerst op of
              bespreken we ze met je.
            </p>
          </div>
          <div>
            <strong>Na de overstap</strong>
            <p>
              We controleren of de afgesproken pagina’s en formulieren op je
              domein werken. Met toegang tot je Search Console kunnen we samen
              volgen of er indexeringsproblemen ontstaan.
            </p>
          </div>
          <div>
            <strong>Meekijken en verbeteren</strong>
            <p>
              Vindbaarheid is waar Jos zelf graag induikt. Zien we na de
              overstap verbetering mogelijk — in Google óf in AI-chatbots zoals
              ChatGPT, Copilot en Claude — dan stellen we die concreet voor.
              Behouden is de basis, beter worden is het doel.
            </p>
          </div>
          <div>
            <strong>Daarna: bijhouden met AI</strong>
            <p>
              De website blijft herkenbaar. Jij vraagt om een tekst, foto of
              pagina aan te passen en beoordeelt het voorstel vóór publicatie.
            </p>
          </div>
        </div>
      </section>
      <section className="shell section-space">
        <h2>Wil je weten wat er bij jouw site meegaat?</h2>
        <p className="section-intro">
          Stuur je websiteadres. Jos kijkt naar je pagina’s, functies en de
          aandachtspunten bij de overstap.
        </p>
        <Link href="/contact" className="button-primary">
          Vraag de gratis websitecheck aan →
        </Link>
      </section>
    </div>
  );
}
