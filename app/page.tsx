import VerhaalBeeld from "./VerhaalBeeld";
import Link from "next/link";
import ProductPreview from "./ProductPreview";
import { aankoopVragen } from "@/lib/aanbod";
import { josFoto } from "@/lib/persoonlijk";
import { vindHoek } from "@/lib/hoeken";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: {
    absolute: "Zet je WordPress-website om naar een website die het zelf regelt | WordSwap",
  },
  description:
    "Wij zetten je WordPress-website om: zelfde ontwerp, teksten en plek in Google. Daarna vraag je gewoon wat er anders moet. Vanaf €150, daarna vanaf €12 per maand, excl. btw.",
  alternates: { canonical: "/" },
  // Eigen deelvoorbeeld (WhatsApp, LinkedIn, Facebook) voor de homepage
  // (een eigen openGraph vervangt die van de layout helemaal, dus alles opnieuw)
  openGraph: {
    type: "website",
    locale: "nl_NL",
    url: "https://www.wordswap.nl",
    siteName: "WordSwap",
    title: "WordSwap — Zet je WordPress-website om naar een website die het zelf regelt",
    description:
      "Zelfde ontwerp, teksten en plek in Google. Daarna vraag je gewoon wat er anders moet. Geen updates, geen plugins, geen gedoe.",
  },
};
const faq = aankoopVragen;
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ hoek?: string | string[] }>;
}) {
  // Kop per advertentie (/?hoek=vakman); zonder hoek de vaste merkbelofte.
  // De hoek gaat mee naar de gratis check, zodat hij in de melding staat.
  const hoek = vindHoek((await searchParams).hoek);
  const checkLink = hoek ? `/contact?hoek=${hoek.sleutel}` : "/contact";
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
            <span className="status-dot" /> VOOR ONDERNEMERS MET EEN
            WORDPRESS-WEBSITE
          </p>
          {hoek && hoek.sleutel !== "regelt-zichzelf" ? (
            <h1 className="hero-hoek">
              {hoek.kop}
              <br />
              <em>Mijn website regelt het. Ik hoef het alleen maar te vragen.</em>
            </h1>
          ) : (
            <h1>
              Mijn website regelt het.
              <br />
              <em>Ik hoef het alleen maar te vragen.</em>
            </h1>
          )}
          {hoek && hoek.sleutel !== "regelt-zichzelf" ? (
            <p className="hero-intro">
              {hoek.tekst}
              <strong className="hero-hoek-slot">
                Behoud je website. Vervang het gedoe.
              </strong>
            </p>
          ) : (
          <p className="hero-intro">
            <strong>Behoud je website. Vervang het gedoe.</strong> Je houdt je
            huidige website: je ontwerp, je teksten en je plek in Google. Wij
            vervangen de WordPress-techniek erachter (of die van een ander CMS)
            door een razendsnelle versie zonder onderhoud. Daarna is één zin
            als “Zet onze nieuwe openingstijden erop.” alles wat je hoeft te
            doen.
          </p>
          )}
          <p className="hero-definition">
            Geen webbouwer meer mailen, geen updates, geen plugins. Je vraagt
            het gewoon aan je website, bekijkt het voorstel en beslist zelf wat
            live gaat.
          </p>
          <div className="button-row">
            <Link className="button-primary" href={checkLink}>
              Kan mijn website overgezet worden? <span>↗</span>
            </Link>
            <Link className="button-text" href="#zo-werkt-aanpassen">
              Probeer het voorbeeld <span>→</span>
            </Link>
          </div>
          <p className="hero-assurance">
            Gratis en vrijblijvend · Antwoord binnen één werkdag
          </p>
          <div className="hero-price">
            <span>
              Overstappen vanaf <strong>€150 eenmalig</strong>
            </span>
            <span>
              Daarna <strong>vanaf €12 / maand</strong>
            </span>
            <small>Excl. btw · Hosting en ingebouwde AI-chat inbegrepen</small>
          </div>
        </div>
        <div className="hero-example" id="zo-werkt-aanpassen">
          <p className="eyebrow">ZO HOUD JE HEM STRAKS BIJ · KLIK EN PROBEER</p>
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
      <section className="section-space shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow">HERKEN JE DIT?</p>
            <h2>
              Blij met je website.
              <br />
              Klaar met het beheer.
            </h2>
          </div>
          <p>
            Je site ziet er prima uit — daar ligt het niet aan. Het is alles
            eromheen: updates, plugins, en dat ene tekstje dat wéér ergens diep
            in een menu verstopt zit.
          </p>
        </div>
        <div className="benefit-grid">
          {[
            [
              "01",
              "Waar zat het ook alweer?",
              "Eén prijsje aanpassen betekent inloggen, zoeken door menu's en blokken, en hopen dat je niets anders verschuift. In WordSwap typ je gewoon wat er anders moet — zoeken doet de AI.",
            ],
            [
              "02",
              "Die update doe ik morgen wel.",
              "Elf plugins met een rood bolletje, en je weet niet of een update iets stukmaakt. Na de overstap heeft je publieke website helemaal geen plugins meer. Hosting en SSL regelen wij.",
            ],
            [
              "03",
              "Ik durf er zelf niet aan te komen.",
              "Dus blijft de site maanden hetzelfde, of wacht je op de webbouwer. Bij WordSwap verschijnt elke wijziging eerst als voorbeeld — en een eerdere versie terugzetten kan altijd.",
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
      <section className="shell verhaal-section">
        <VerhaalBeeld onderwerp="ondernemer" />
        <div className="verhaal-copy">
          <p className="eyebrow">HET KAN OOK ZO</p>
          <h2>
            Een nieuwe dienst.
            <br />
            Andere openingstijden.
            <br />
            Zo weer bijgewerkt.
          </h2>
          <p>
            Na de overstap hoef je WordPress nooit meer te openen. Geen CMS
            leren, geen pagina-builder. Je vraagt het gewoon:
          </p>
          <ul className="vraag-voorbeelden">
            <li>“Zet deze vacature online.”</li>
            <li>“Voeg dit project toe aan ons werk.”</li>
            <li>“Verander onze openingstijden.”</li>
          </ul>
          <p>
            Je bekijkt de wijziging en zet hem zelf live. Meer is het niet.
          </p>
          <Link href="#zo-werkt-aanpassen" className="button-text">
            Bekijk een voorbeeld →
          </Link>
        </div>
      </section>
      <section className="section-space shell speed-proof">
        <div className="section-heading">
          <div>
            <p className="eyebrow">GEEN BELOFTE, EEN METING</p>
            <h2>
              Dezelfde website.
              <br />
              De helft van de wachttijd.
            </h2>
          </div>
          <p>
            We hebben onlangs een WordPress-site overgezet en beide versies
            gemeten met Google&rsquo;s eigen meetlat (Lighthouse). Zelfde
            ontwerp, zelfde inhoud — alleen de techniek eronder is anders.
          </p>
        </div>
        <div className="speed-bars" role="img" aria-label="Laadtijdvergelijking: WordPress-versie 6,2 seconden, WordSwap-versie 3,2 seconden">
          <div className="speed-row">
            <span className="speed-label">Op WordPress</span>
            <div className="speed-track">
              <i className="speed-fill is-oud" style={{ width: "100%" }} />
            </div>
            <strong>6,2&nbsp;s</strong>
          </div>
          <div className="speed-row">
            <span className="speed-label">Als WordSwap-site</span>
            <div className="speed-track">
              <i className="speed-fill is-nieuw" style={{ width: "52%" }} />
            </div>
            <strong>3,2&nbsp;s</strong>
          </div>
          <p className="speed-note">
            Grootste inhoud in beeld (LCP), gemeten in september 2026 bij één
            overgezette site. Resultaten verschillen per website — daarom meten
            we bij elke overstap de oude en nieuwe site en krijg je beide
            uitslagen te zien.
          </p>
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
            Ben je tevreden met je uitstraling? Dan beginnen we daarmee. Je
            website wordt opnieuw opgebouwd zonder WordPress. Voor bezoekers
            blijft je bedrijf herkenbaar; jij krijgt een andere manier om de
            inhoud bij te houden.
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
              De omzetting, hosting, SSL en het contactformulier. We vergelijken
              oude en nieuwe URL’s, paginatitels en meta-informatie. Afwijkingen
              bespreken we vóór de overstap.
            </p>
          </div>
          <div>
            <strong>Dit doe jij voortaan</strong>
            <p>
              Een wijziging vragen → het voorbeeld bekijken → zelf publiceren.
              WordPress en de bijbehorende plugin-updates vervallen.
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
          <p className="process-assurance">
            Je huidige website blijft tijdens het overzetten online. Eerst
            controleren we de kopie, formulieren en SEO-inrichting. Pas na jouw
            akkoord veranderen we de domeinkoppeling.{" "}
            <Link href="/seo-behoud">Bekijk onze SEO-controle →</Link>
          </p>
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
            Daarna <strong>vanaf €12 per maand</strong>, afhankelijk van gebruik.
          </div>
          <ul className="check-list">
            <li>Je ontwerp en inhoud zorgvuldig overgenomen</li>
            <li>Domeinkoppeling en SEO-structuur gecontroleerd</li>
            <li>Wijzigingen eerst bekijken, dan publiceren</li>
          </ul>
          <Link className="button-primary" href={checkLink}>
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
          {josFoto() ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={josFoto()!}
              alt="Jos Klijnhout, oprichter van WordSwap"
              width={280}
              height={280}
              loading="lazy"
              decoding="async"
              className="founder-foto"
            />
          ) : (
            <span>
              Hulp bij
              <br />
              je overstap.
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
          <h2>Je stapt over met hulp van Jos.</h2>
          <p>
            Ik zet je WordPress-website zelf over en controleer samen met jou
            het resultaat. Daarna pas je je website aan met AI — en heb je een
            vraag, dan krijg je mij aan de lijn. Geen ticketsysteem, geen
            wachtrij.
          </p>
          <Link className="button-text" href={checkLink}>
            Neem contact op met Jos →
          </Link>
        </div>
      </section>
      <section className="section-space shell faq-layout">
        <div>
          <p className="eyebrow">GOED OM TE WETEN</p>
          <h2>Jouw website gaat mee. Wat gebeurt er met de rest?</h2>
          <p>
            Een overstap maak je niet elke dag.
            <br />
            Stel gerust je vragen.
          </p>
          <Link href={checkLink} className="button-text">
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
            Blij met je website?
            <br />
            Klaar met het WordPress-beheer?
          </h2>
          <p>
            Je krijgt antwoord op drie vragen: kan mijn site mee, wat vraagt
            aandacht en wat kost het? Binnen één werkdag, persoonlijk van Jos.
          </p>
          <Link className="button-primary" href={checkLink}>
            Laat mijn website gratis checken ↗
          </Link>
          <small>Geen verplichtingen. Wel duidelijkheid.</small>
        </div>
      </section>
      <div className="new-site-note shell">
        Nog geen website, of toe aan een nieuw ontwerp?{" "}
        <Link href="/nieuwe-website">Een nieuwe website vanaf €250 →</Link>
      </div>
    </div>
  );
}
