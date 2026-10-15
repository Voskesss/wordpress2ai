import Link from "next/link";
import Image from "next/image";
import { FOTO_ALT } from "@/lib/pagina-fotos";
import DemoVideo, { WhatsAppVideo } from "./DemoVideo";
import HeroDias from "./HeroDias";
import { aanbod, aankoopVragen } from "@/lib/aanbod";
import { josFoto } from "@/lib/persoonlijk";
import { vindHoek } from "@/lib/hoeken";
import type { Metadata } from "next";
import { deelAfbeelding } from "./deel-afbeelding";
export const metadata: Metadata = {
  title: "WordPress overzetten en bijhouden met AI",
  description:
    "Wij zetten je WordPress-bedrijfswebsite over. Daarna wijzig je teksten, foto’s en pagina’s via AI-chat. Vanaf €150 en vanaf €19 per maand.",
  alternates: { canonical: "/" },
  // Deelvoorbeeld (LinkedIn, WhatsApp, Facebook), los van de paginatitel hierboven.
  // Een eigen openGraph vervangt die van de layout helemaal, dus alles opnieuw.
  openGraph: {
    type: "website",
    locale: "nl_NL",
    url: "https://www.wordswap.nl",
    siteName: "WordSwap",
    title: "WordSwap: je WordPress-website overzetten en bijhouden met AI",
    description:
      "Zelfde ontwerp, teksten en plek in Google. Daarna vraag je gewoon wat er anders moet. Geen updates, geen plugins, geen gedoe.",
    images: [deelAfbeelding],
  },
};
// Het FAQPage-schema staat alleen op /veelgestelde-vragen: dezelfde twaalf
// vragen op twee pagina's als gestructureerde data is dubbele inhoud.
const faq = aankoopVragen.slice(0, 5);

// "Voor wie we werken": acht gezichten op de homepage, elk naar zijn eigen pagina
const VOOR_WIE: [string, string][] = [
  ["website-kapsalon", "Kappers"],
  ["website-schildersbedrijf", "Schilders"],
  ["website-hoveniersbedrijf", "Hoveniers"],
  ["website-installatiebedrijf", "Installateurs"],
  ["website-coach", "Coaches"],
  ["website-adviesbureau", "Adviesbureaus"],
  ["website-accountant", "Accountants"],
  ["website-stichting", "Stichtingen"],
];
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
      {/* Hero over de volle breedte (wens Jos 14-10-2026): vrolijke foto,
          de belofte in wit, en het filmpje er meteen naast. */}
      <section className="home-hero-blok">
      <HeroDias
        alt={FOTO_ALT["home"]}
        dias={[
          {
            foto: "/images/paginas/home.webp",
            label: "WordPress-website overzetten naar een statische website met AI-beheer",
            kopKlasse: hoek && hoek.sleutel !== "regelt-zichzelf" ? "hero-hoek" : undefined,
            kop:
              hoek && hoek.sleutel !== "regelt-zichzelf" ? (
                <>
                  {hoek.kop}
                  <em>Mijn website regelt het. Ik hoef het alleen maar te vragen.</em>
                </>
              ) : (
                <>
                  Mijn website regelt het.
                  <em>Ik hoef het alleen maar te vragen.</em>
                </>
              ),
          },
          {
            foto: "/images/paginas/website-kapsalon.webp",
            label: "Geen onderhoud meer",
            kop: <>Geen updates. <em>Geen plug-ins.</em></>,
            tekst: "Hosting, beveiliging en het bijhouden van de techniek regelen wij. Jij hoeft nergens meer op te letten.",
          },
          {
            foto: "/images/paginas/website-koppelen-aan-ai.webp",
            label: "Aanpassen met AI",
            kop: <>Typ wat er anders moet. <em>Jij keurt het goed.</em></>,
            tekst: "Je ziet eerst een voorbeeld op je eigen site. Pas als jij het goed vindt, zet je het live.",
          },
          {
            foto: "/images/paginas/website-hoveniersbedrijf.webp",
            label: "Je site blijft van jou",
            kop: <>Zelfde ontwerp. <em>Zelfde adressen.</em></>,
            tekst: "We nemen je teksten, foto's en pagina-adressen over, zodat bezoekers en Google je gewoon terugvinden.",
          },
          {
            foto: "/images/paginas/website-schildersbedrijf.webp",
            label: "Eerst zien, dan beslissen",
            kop: <>Je bekijkt eerst de kopie. <em>Dan pas overstappen.</em></>,
            tekst: "Je legt de nieuwe versie rustig naast je huidige site. Zonder jouw akkoord betaal je niets voor de omzetting.",
          },
          {
            foto: "/images/paginas/website-abonnement.webp",
            label: "Vaste prijs",
            kop: <>Vanaf €19 per maand. <em>Maandelijks opzegbaar.</em></>,
            tekst: "Hosting, beveiliging en de AI-chat in één bedrag, exclusief btw. Geen losse rekeningen meer voor plug-ins.",
          },
        ]}
        onder={
          <>
            <div className="landing-breed-knoppen">
              <Link className="lift landing-breed-hoofdknop" href={checkLink}>
                Kan mijn website overgezet worden? ↗
              </Link>
            </div>
            <p className="home-hero-zeker">Gratis en vrijblijvend · Antwoord binnen twee werkdagen</p>
          </>
        }
      />
      <div className="home-intro">
        <div className="shell home-intro-grid">
          <div>
            <h2>Behoud je website. Vervang het gedoe.</h2>
            <p>
              {hoek && hoek.sleutel !== "regelt-zichzelf"
                ? hoek.tekst
                : `${aanbod.kernzin} Je ontwerp, je teksten en je pagina-adressen gaan mee.`}
            </p>
            <div className="hero-price">
              <span>
                Overstappen vanaf <strong>€150 eenmalig</strong>
              </span>
              <span>
                Daarna <strong>vanaf €19 / maand</strong>
              </span>
              <small>
                Excl. btw · Hosting en AI-chat inbegrepen · Je oude hosting (vaak
                €8–€15 per maand) kun je daarna meestal opzeggen
              </small>
            </div>
          </div>
          <div className="home-hero-video" id="bekijk-de-video">
            <p className="home-video-label">Zo houd je hem straks bij · ingekorte video</p>
            <DemoVideo />
          </div>
        </div>
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
            Je site ziet er prima uit. Daar ligt het niet aan. Het is alles
            eromheen: updates, plugins, en dat ene tekstje dat wéér ergens diep
            in een menu verstopt zit.
          </p>
        </div>
        <div className="benefit-grid">
          {[
            [
              "01",
              "Waar zat het ook alweer?",
              "Eén prijsje aanpassen betekent inloggen, zoeken door menu's en blokken, en hopen dat je niets anders verschuift. In WordSwap typ je gewoon wat er anders moet; zoeken doet de AI.",
            ],
            [
              "02",
              "Die update doe ik morgen wel.",
              "Elf plugins met een rood bolletje, en je weet niet of een update iets stukmaakt. Na de overstap heeft je publieke website helemaal geen plugins meer. Hosting en SSL regelen wij.",
            ],
            [
              "03",
              "Ik durf er zelf niet aan te komen.",
              "Dus blijft de site maanden hetzelfde, of wacht je op de webbouwer. Bij WordSwap verschijnt elke wijziging eerst als voorbeeld, en een eerdere versie terugzetten kan altijd.",
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
      <section className="voor-wie" aria-labelledby="voor-wie-kop">
        <div className="shell">
          <p className="eyebrow">VOOR WIE WE WERKEN</p>
          <h2 id="voor-wie-kop">Ondernemers die liever ondernemen dan hun website bijhouden.</h2>
          <div className="voor-wie-grid">
            {VOOR_WIE.map(([slug, naam]) => (
              <Link key={slug} href={`/${slug}`} className="voor-wie-kaart lift">
                <Image
                  src={`/images/paginas/${slug}.webp`}
                  alt={FOTO_ALT[slug]}
                  width={1600}
                  height={900}
                  sizes="(max-width: 767px) 50vw, 25vw"
                />
                <span>{naam} →</span>
              </Link>
            ))}
          </div>
          <p className="voor-wie-meer">
            Ook voor{" "}
            {[
              ["website-bouwbedrijf", "bouwbedrijven"],
              ["website-mediator", "mediators"],
              ["website-kunstenaar", "kunstenaars"],
              ["website-detacheringsbureau", "detacheringsbureaus"],
              ["website-financieel-adviseur", "financieel adviseurs"],
            ].map(([slug, naam], i, alle) => (
              <span key={slug}>
                <Link href={`/${slug}`}>{naam}</Link>
                {i < alle.length - 1 ? ", " : " "}
              </span>
            ))}
            en eigenlijk iedere ondernemer met een website, van garage tot fietsenmaker.
          </p>
          <p className="voor-wie-grens">
            Alleen een webshop of ledenomgeving die ín WordPress zelf draait (zoals WooCommerce) kan niet mee.
            Draait je webshop, boekingssysteem of ledenomgeving bij een andere partij, dan linken we daar gewoon
            naartoe. Twijfel je? <Link href={checkLink}>De websitecheck is gratis.</Link>
          </p>
        </div>
      </section>
      <section className="shell verhaal-section">
        <figure className="verhaal-beeld home-foto">
          <Image
            src="/images/paginas/website-koppelen-aan-ai.webp"
            alt={FOTO_ALT["website-koppelen-aan-ai"]}
            width={1600}
            height={900}
            sizes="(max-width: 767px) 100vw, 50vw"
          />
        </figure>
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
          <Link href="/demo" className="button-text">
            Probeer het zelf in de demo →
          </Link>
        </div>
      </section>
      {/* Onderweg via WhatsApp (wens Jos 15-10-2026), met het filmpje erbij */}
      <section className="shell demo-video-section home-whatsapp" aria-labelledby="whatsapp-kop">
        <div className="demo-video-tekst">
          <p className="eyebrow">ONDERWEG</p>
          <h2 id="whatsapp-kop">Even iets aanpassen? Gewoon appen.</h2>
          <p>
            Net een klus afgerond? Maak een foto, app hem met een zin erbij, en je krijgt een voorbeeld terug.
            Stuur &ldquo;ja&rdquo; en het staat op je site. Een tekst, foto of spraakbericht kan allemaal.
          </p>
          <p className="home-whatsapp-pakket">
            WhatsApp zit in Optimaal ontzorgd (€39 per maand, excl. btw). In het basispakket pas je je site aan via
            de chat op je eigen website.
          </p>
          <Link href="/appen" className="button-text">
            Meer over je website aanpassen via WhatsApp →
          </Link>
        </div>
        <div>
          <p className="home-video-label">Zo werkt het · ingekorte video</p>
          <WhatsAppVideo />
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
            ontwerp, zelfde inhoud: alleen de techniek eronder is anders.
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
            overgezette site. Resultaten verschillen per website. Daarom meten
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
            inhoud bij te houden. Zo is WordSwap een{" "}
            <Link href="/wordpress-alternatief" style={{ textDecoration: "underline", textUnderlineOffset: 3, fontWeight: 600 }}>
              alternatief voor WordPress
            </Link>{" "}
            waarbij je niet opnieuw hoeft te beginnen.
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
            Daarna <strong>vanaf €19 per maand</strong>, hosting en AI-chat inbegrepen.
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
            Fair use: ruim voldoende voor het normale onderhoud van je
            website. Gebruik je er maand na maand veel meer dan gemiddeld, dan
            bellen we even en spreken we samen iets passends af. Liever alles laten regelen? Optimaal ontzorgd
            kost €39 per maand. Domeinregistratie, e-mail en extra maatwerk
            staan los van het pakket.
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
            het resultaat. Daarna pas je je website aan met AI, en heb je een
            vraag, dan bel ik je terug op maandag-, woensdag- of vrijdagavond. Geen ticketsysteem, geen
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
          <Link href="/veelgestelde-vragen" className="button-text">
            Alle veelgestelde vragen →
          </Link>
        </div>
      </section>
      <section className="section-space shell" aria-labelledby="verder-kop">
        <p className="eyebrow">WAAR WIL JE MEE VERDER?</p>
        <h2 id="verder-kop">Kies wat bij jouw situatie past.</h2>
        <div className="kies-grid">
          {[
            ["wordpress-overzetten", "WordPress overzetten", "Je huidige site houden, zonder WordPress-onderhoud. Vanaf €150."],
            ["nieuwe-website", "Een nieuwe website laten maken", "Wij bouwen hem met AI, jij houdt hem bij. Vanaf €250."],
            ["website-laten-onderhouden", "Website laten onderhouden", "Wat onderhoud kost, en hoe je de reden ervoor weghaalt."],
            ["website-koppelen-aan-ai", "Website aanpassen met AI", "Typ of app wat er anders moet, bekijk het en publiceer."],
          ].map(([slug, kop, tekst]) => (
            <Link key={slug} href={`/${slug}`} className="kies-kaart lift">
              <Image src={`/images/paginas/${slug}.webp`} alt={FOTO_ALT[slug]} width={1600} height={900} sizes="(max-width: 767px) 100vw, 50vw" />
              <span className="kies-kop">{kop} →</span>
              <span className="kies-tekst">{tekst}</span>
            </Link>
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
            aandacht en wat kost het? Binnen twee werkdagen, persoonlijk van Jos.
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
