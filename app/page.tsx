import Link from "next/link";
import ProductPreview from "./ProductPreview";
import { josFoto } from "@/lib/persoonlijk";
import Image from "next/image";
import { aankoopVragen } from "@/lib/aanbod";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Je bestaande WordPress-site behouden. Verder met AI.",
  description:
    "Wij zetten je WordPress-bedrijfswebsite over. Daarna wijzig je teksten, foto’s en pagina’s via AI-chat. Vanaf €150 + €5–€20 per maand, excl. btw. Gratis websitecheck.",
  alternates: { canonical: "/" },
};
const faq = aankoopVragen;
export default function Home() {
  const foto = josFoto();
  return (
    <div className="marketing-home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map(([name, text]) => ({
              "@type": "Question",
              name,
              acceptedAnswer: { "@type": "Answer", text },
            })),
          }),
        }}
      />
      <section className="home-hero shell">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="status-dot" /> JE BESTAANDE WEBSITE. EEN
            MAKKELIJKER VERVOLG.
          </p>
          <h1>
            Je website blijft
            <br />
            herkenbaar.
            <br />
            <em>Bijhouden doe je met AI.</em>
          </h1>
          <p className="hero-intro">
            Wij zetten je bestaande WordPress-website over, met je ontwerp,
            pagina-adressen, structuur, titels en meta-informatie als
            uitgangspunt. Daarna wijzig je teksten, foto’s en pagina’s gewoon
            via de AI-chat.
          </p>
          <p className="hero-definition">
            Eerst nemen we zorgvuldig over wat je hebt opgebouwd. Daarna houd je
            zelf je website actueel: voorstel bekijken, akkoord geven,
            publiceren.
          </p>
          <div className="button-row">
            <Link className="button-primary" href="/contact">
              Laat mijn website checken <span>↗</span>
            </Link>
            <Link className="button-text" href="#zo-werkt-aanpassen">
              Bekijk hoe het werkt <span>→</span>
            </Link>
          </div>
          <p className="hero-assurance">
            Gratis en vrijblijvend · Antwoord binnen één werkdag
          </p>
          <Link href="/over-wordswap" className="hero-person">
            {foto && (
              <Image src={foto} alt="Jos Klijnhout" width={52} height={52} />
            )}
            <span>
              <strong>Hoi, ik ben Jos.</strong> Ik kijk persoonlijk met je mee.
            </span>
            <span aria-hidden="true">↗</span>
          </Link>
          <div className="hero-price">
            <span>
              Overstappen vanaf <strong>€150 eenmalig</strong>
            </span>
            <span>
              Daarna <strong>€5–€20 / maand</strong>
            </span>
            <small>Excl. btw · Hosting en ingebouwde AI-chat inbegrepen</small>
          </div>
        </div>
        <div className="hero-product" id="zo-werkt-aanpassen">
          <p className="hand-note">
            Ja, zo makkelijk mag het zijn. <span aria-hidden="true">↘</span>
          </p>
          <ProductPreview />
        </div>
      </section>
      <div className="trust-strip">
        <div className="shell">
          <span>✓ Eerst bekijken, dan beslissen</span>
          <span>✓ Je eigen domein · ontwerp zorgvuldig overgenomen</span>
          <span>✓ Maandelijks opzegbaar</span>
          <span>✓ Persoonlijk contact met Jos</span>
        </div>
      </div>
      <section className="section-space shell" aria-labelledby="behoud-titel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">OVERZETTEN ÉN BLIJVEN BIJHOUDEN</p>
            <h2 id="behoud-titel">Verder met wat je al hebt opgebouwd.</h2>
          </div>
          <p>
            Je huidige website is het vertrekpunt. De overstap en het dagelijkse
            beheer zijn twee afzonderlijke stappen.
          </p>
        </div>
        <div className="benefit-grid">
          <article className="benefit">
            <span className="number-tag">1</span>
            <h3>Je bestaande website meenemen</h3>
            <p>
              We behouden bestaande URL’s en structuur waar mogelijk exact,
              nemen titels en meta-informatie over en bespreken afwijkende
              functies vooraf.
            </p>
          </article>
          <article className="benefit">
            <span className="number-tag">✓</span>
            <h3>Controleren vóór de overstap</h3>
            <p>
              Oude en nieuwe pagina’s vergelijken, links en formulieren testen,
              afwijkingen bespreken. Een gewijzigd adres krijgt een passende
              doorverwijzing. Zoekposities blijven afhankelijk van meer
              factoren.
            </p>
            <Link href="/seo-behoud" className="button-text">
              Zo controleren we de overstap →
            </Link>
          </article>
          <article className="benefit">
            <span className="number-tag">2</span>
            <h3>Zelf actueel houden met AI</h3>
            <p>
              Een nieuwe foto, andere openingstijden of een extra dienst? Je
              vraagt het in gewone taal. Bekijk de wijziging op je eigen website
              en publiceer als die klopt.
            </p>
            <Link href="/demo" className="button-text">
              Bekijk het aanpassen →
            </Link>
          </article>
        </div>
      </section>
      <section className="section-space shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow">JE WEBSITE KAN SIMPELER</p>
            <h2>
              Je hebt al een vak.
              <br />
              Websitebeheer hoeft daar niet bij.
            </h2>
          </div>
          <p>
            Of je nu tuinen aanlegt, mensen adviseert of elke ochtend de oven
            aanzet: je website moet meewerken. En niet je avond opslokken.
          </p>
        </div>
        <div className="benefit-grid">
          {[
            [
              "01",
              "Een tekstje wijzigen. Weer wachten.",
              "Je openingstijden zijn veranderd, maar je website nog niet. In WordSwap geef je de wijziging zelf door in de chat. Je bekijkt het voorstel en publiceert wanneer het klopt.",
            ],
            [
              "02",
              "Die update doe ik morgen wel.",
              "Je weet niet of een plugin-update iets stukmaakt. Na de overstap heeft je publieke website geen WordPress-plugins meer. Hosting en SSL regelen wij.",
            ],
            [
              "03",
              "Ik durf er zelf niet aan te komen.",
              "Je hoeft geen blokken te verplaatsen of code te begrijpen. Iedere AI-wijziging verschijnt eerst als voorbeeld. Een eerdere versie terugzetten kan ook.",
            ],
          ].map(([n, t, d]) => (
            <article className="benefit" key={n}>
              <span className="number-tag">
                {n === "01" ? "↗" : n === "02" ? "☀" : "✓"}
              </span>
              <h3>{t}</h3>
              <p>{d}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="shell fit-section">
        <div>
          <p className="eyebrow">WAT VERANDERT ER NU EIGENLIJK?</p>
          <h2>
            Je bedrijf blijft herkenbaar.
            <br />
            Het beheer wordt anders.
          </h2>
          <p>
            We verkopen je geen nieuw ontwerp als je huidige website nog goed
            is. We bouwen je bestaande site opnieuw op, zodat je die via de
            WordSwap-chat kunt beheren.
          </p>
          <Link href="/wordswap-vs-wordpress" className="button-text">
            Vergelijk WordSwap met WordPress →
          </Link>
        </div>
        <div className="change-ledger">
          <div>
            <strong>Dit neem je mee</strong>
            <p>
              Je domeinnaam, pagina-adressen, structuur, teksten, foto’s, titels
              en meta-informatie. Je ontwerp nemen we zo nauwkeurig mogelijk
              over.
            </p>
          </div>
          <div>
            <strong>Dit regelen wij</strong>
            <p>
              De omzetting, hosting, SSL, contactformulier en controle van de
              SEO-structuur.
            </p>
          </div>
          <div>
            <strong>Dit doe jij voortaan</strong>
            <p>
              Een wijziging vragen → het voorbeeld bekijken → zelf publiceren.
            </p>
          </div>
        </div>
      </section>
      <section className="shell decision-section">
        <div className="fit-yes">
          <p className="eyebrow">DIT PAST GOED</p>
          <h3>Een website die je bedrijf laat zien.</h3>
          <p>
            Diensten, een over-ons-pagina, projecten, nieuws en een
            contactformulier. Bijvoorbeeld voor een adviseur, schilder, praktijk
            of bakker.
          </p>
        </div>
        <div className="fit-check">
          <p className="eyebrow">DIT BEKIJKEN WE EERST</p>
          <h3>Je site doet meer dan informeren.</h3>
          <p>
            Webshops en ledenportalen zetten we niet over. Externe
            boekingswidgets bekijken we per site. Werkt je huidige oplossing
            goed en heb je weinig beheerwerk? Dan hoeft overstappen niet de
            beste keuze te zijn.
          </p>
        </div>
      </section>
      <section className="process-section">
        <div className="shell section-space">
          <div className="section-heading">
            <div>
              <p className="eyebrow">DE OVERSTAP, ZONDER OMWEGEN</p>
              <h2>
                Wij regelen de verhuizing.
                <br />
                Jij kijkt of het klopt.
              </h2>
            </div>
            <Link href="/hoe-het-werkt" className="button-text">
              Zo pakken we het aan →
            </Link>
          </div>
          <div className="steps-grid">
            {[
              [
                "1",
                "Stuur je website",
                "Jos bekijkt of je site geschikt is. Je krijgt een duidelijke prijs en weet vooraf wat er meegaat.",
              ],
              [
                "2",
                "Bekijk je nieuwe versie",
                "We zetten je website over en laten je het resultaat zien. Niet tevreden met de kopie? Dan betaal je niets.",
              ],
              [
                "3",
                "Akkoord? We zetten hem live",
                "We koppelen je domein, controleren de overstap en helpen je op weg met aanpassen via chat.",
              ],
            ].map(([n, t, d]) => (
              <article key={n}>
                <span className="step-number">{n}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section-space shell price-story">
        <div>
          <p className="eyebrow">KLEINE KOSTEN. GROOT VERSCHIL.</p>
          <h2>
            Meer grip op je website.
            <br />
            Ook op de kosten.
          </h2>
          <p className="section-intro">
            Eenmalig overzetten. Daarna een maandbedrag voor hosting en de
            AI-koppeling. Je weet vooraf waar je aan toe bent.
          </p>
          <Link className="button-text" href="/prijzen">
            Bekijk wat inbegrepen is →
          </Link>
        </div>
        <div className="price-card">
          <span className="eyebrow">JE BESTAANDE WEBSITE OVERZETTEN</span>
          <div className="price-amount">
            <span>vanaf</span> €150<small>eenmalig</small>
          </div>
          <div className="price-month">
            Daarna <strong>€5–€20 per maand</strong>, afhankelijk van gebruik.
          </div>
          <ul className="check-list">
            <li>Je ontwerp en inhoud zorgvuldig overgenomen</li>
            <li>Domeinkoppeling en SEO-structuur gecontroleerd</li>
            <li>Wijzigingen eerst bekijken, dan publiceren</li>
          </ul>
          <Link className="button-primary" href="/contact">
            Ontvang een prijs voor mijn site ↗
          </Link>
          <p className="fine-print">
            Grotere of complexe sites: tot circa €650. Alle bedragen excl. btw.
            Fair use: maximaal 30 nieuwe concepten per maand, binnen je
            AI-gebruiksruimte. Domeinregistratie, e-mail en extra maatwerk staan
            los van de koppeling.
          </p>
        </div>
      </section>
      <section className="shell founder-section">
        <div className="founder-mark">
          {foto ? (
            <Image
              src={foto}
              alt="Jos Klijnhout, oprichter van WordSwap"
              width={160}
              height={160}
              className="founder-photo"
            />
          ) : (
            <span>
              Hallo,
              <br />
              ik ben Jos.
            </span>
          )}
          <p>
            JOS KLIJNHOUT
            <br />
            <span>Oprichter van WordSwap</span>
          </p>
        </div>
        <div>
          <p className="eyebrow">TECHNIEK MAG PERSOONLIJK ZIJN</p>
          <h2>
            Je praat met slimme techniek.
            <br />
            En gewoon met mij.
          </h2>
          <p>
            Ik heb te veel ondernemers gezien die ’s avonds nog met hun website
            zaten te worstelen. Of hun webbouwer moesten bellen voor twee zinnen
            tekst. Dat kan eenvoudiger. Ik help je met de overstap en kijk met
            je mee. Je hoeft het niet allemaal zelf te weten.
          </p>
          <Link className="button-text" href="/over-wordswap">
            Maak kennis met WordSwap →
          </Link>
        </div>
      </section>
      <section className="section-space shell faq-layout">
        <div>
          <p className="eyebrow">GOED OM TE WETEN</p>
          <h2>Nog even dit.</h2>
          <p>
            Een overstap maak je niet elke dag.
            <br />
            Stel gerust je vragen.
          </p>
          <Link href="/contact" className="button-text">
            Neem contact op →
          </Link>
        </div>
        <div className="faq-list">
          {faq.map(([q, a]) => (
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
      <section className="shell">
        <div className="closing-cta">
          <p className="eyebrow">DE EERSTE STAP IS ZO GEZET</p>
          <h2>
            Benieuwd of jouw website
            <br />
            ook eenvoudiger kan?
          </h2>
          <p>
            Je krijgt antwoord op drie vragen: kan mijn site mee, wat vraagt
            aandacht en wat kost het? Binnen één werkdag, persoonlijk van Jos.
          </p>
          <Link className="button-primary" href="/contact">
            Laat mijn website gratis checken ↗
          </Link>
          <small>Geen verplichtingen. Wel duidelijkheid.</small>
          <Image
            src="/mascotte/zwaaiend.webp"
            alt=""
            width={170}
            height={288}
            className="closing-mascot"
          />
        </div>
      </section>
      <div className="new-site-note shell">
        Nog geen website, of toe aan een nieuw ontwerp?{" "}
        <Link href="/nieuwe-website">Een nieuwe website vanaf €250 →</Link>
      </div>
    </div>
  );
}
