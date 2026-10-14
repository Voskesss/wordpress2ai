import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
import { aanbod } from "@/lib/aanbod";

// Hoofdpagina van het cluster "WordPress overzetten/omzetten". De pagina's
// website-zonder-cms, wordpress-omzetten-naar-gewone-website en
// wordpress-omzetten-snel-en-ai-vriendelijk zijn hierin opgegaan en sturen
// door (next.config.ts): vier pagina's op één zoekterm laat Google kiezen,
// en dan kiest hij er geen.
export const metadata: Metadata = {
  title: "WordPress overzetten naar een snelle website",
  description:
    "WordPress omzetten naar een snelle, gewone website: zelfde ontwerp, teksten en adressen. Daarna bijhouden via een chat. Vanaf €150, eerst de kopie zien.",
  alternates: { canonical: "/wordpress-overzetten" },
};

export default function Pagina() {
  return (
    <SeoLanding
      data={{
        slug: "wordpress-overzetten",
        label: "WordPress overzetten",
        titel: "Je WordPress-website overzetten naar een snelle, gewone website.",
        intro:
          "WordSwap zet je bestaande WordPress-site om naar een website zonder WordPress: zelfde ontwerp, zelfde teksten, zelfde pagina-adressen. Updates en plug-ins vervallen; hosting, beveiliging en formulieren regelen wij. Daarna houd je de inhoud bij door in een chat te typen wat er anders moet. Je bekijkt eerst de complete kopie, en pas na jouw akkoord stap je over.",
        blokken: [
          {
            kop: "Wat is een gewone website eigenlijk?",
            tekst:
              "Kant-en-klare pagina's, zonder database of beheersysteem eronder. Bij elk bezoek wordt de pagina zelf geladen; er hoeft niets berekend of opgebouwd te worden. Dat maakt je site sneller en haalt de zwakke plekken van WordPress en plug-ins weg. Er is ook geen inlogpagina meer die aangevallen kan worden. Lees meer over [veiligheid en controle](/veiligheid).",
          },
          { kop: "Wat nemen we over?", tekst: aanbod.ontwerp },
          {
            kop: "En hoe pas ik daarna nog iets aan?",
            tekst:
              "Vroeger was dat het nadeel van een gewone website: voor elke wijziging had je een webbouwer nodig. Nu typ je in de chat wat er anders moet, bijvoorbeeld \"ander telefoonnummer\" of \"maak een pagina over dakisolatie\". De AI maakt een voorstel in de stijl van je site, jij bekijkt het en publiceert zelf. Zie hoe dat werkt bij [je website aanpassen met AI](/website-koppelen-aan-ai), of [probeer de demo](/demo).",
          },
          {
            kop: "Wordt mijn site sneller?",
            tekst:
              "Meestal wel, omdat de pagina's niet bij ieder bezoek door WordPress opgebouwd hoeven te worden. Grote foto's, video's en externe scripts blijven invloed hebben, en een goed ingerichte WordPress-site kan ook snel zijn. Daarom meten we de oude en de nieuwe pagina's. Is traagheid je reden om te zoeken? Lees eerst [waarom een WordPress-site traag wordt](/wordpress-website-traag).",
          },
          {
            kop: "Wat gebeurt er met Google en AI-zoekmachines?",
            tekst: `${aanbod.seo} Hoe we dat precies aanpakken staat bij [SEO bij de overstap](/seo-behoud).`,
          },
          {
            kop: "Domein en e-mail uit elkaar houden",
            tekst:
              "Je domeinnaam blijft van jou, waar hij ook staat. We bekijken waar je e-mail draait voordat de hosting verandert. Zit die in je huidige hostingpakket, dan bespreken we een eventuele mailverhuizing en de kosten. Zeg je oude hosting niet op voordat de benodigde onderdelen zijn gecontroleerd.",
          },
          { kop: "Welke functies kunnen mee?", tekst: aanbod.geschikt },
          {
            kop: "Wat het je scheelt",
            tekst:
              "Vergelijk je huidige rekeningen voor hosting, plug-ins en onderhoud met het WordSwap-bedrag: hosting, beveiliging en de AI-chat vanaf €19 per maand excl. btw. Domein, e-mail en maatwerk zijn apart. Wat een onderhoudspakket voor WordPress gewoonlijk kost, lees je bij [website laten onderhouden](/website-laten-onderhouden). Alle bedragen staan bij de [prijzen](/prijzen).",
          },
          {
            kop: "Nog aan het vergelijken?",
            tekst:
              "Overzetten is niet de enige route. Bij [een alternatief voor WordPress](/wordpress-alternatief) staan bouwdozen, andere systemen en deze overstap naast elkaar, en bij [WordSwap vs. WordPress](/wordswap-vs-wordpress) de verschillen op een rij. Wil je eerst zelf een veilige kopie hebben? Lees hoe je [een complete back-up van je WordPress-site maakt](/wordpress-backup-maken).",
          },
        ],
        faq: [
          {
            vraag: "Hoe lang duurt de overstap?",
            antwoord:
              "Een gemiddelde bedrijfssite staat meestal binnen enkele dagen als kopie klaar, inclusief onze controles op links, formulieren en vindbaarheid. Jij bekijkt de kopie rustig naast je huidige site; pas na jouw akkoord koppelen we je domein. Grote sites spreken we vooraf door, dan weet je precies waar je aan toe bent.",
          },
          {
            vraag: "Wat moet ik zelf aanleveren?",
            antwoord:
              "Alleen je websiteadres. We bouwen de kopie rechtstreeks vanaf je live site, dus je hoeft geen inloggegevens te delen en niets te exporteren. Heb je wel een WordPress-export, dan mag die mee, maar nodig is hij niet.",
          },
          {
            vraag: "Kan mijn blog mee?",
            antwoord:
              "Ja, alle blogberichten gaan mee op hun eigen adres, inclusief categorieën en tags. Nieuwe blogs schrijf je daarna via de chat.",
          },
          {
            vraag: "Werken mijn contactformulieren nog?",
            antwoord:
              "Ja. Formulieren zetten we om en de inzendingen krijg je per e-mail, net als nu. Wie het formulier invult, krijgt automatisch een nette bevestiging.",
          },
          {
            vraag: "Wat kan er niet omgezet worden?",
            antwoord:
              "Webshops en ledenomgevingen met inlog, want die hebben een draaiend systeem nodig. Gewone bedrijfssites, ook met blog en formulieren, juist wel. Een bestaand boekings- of afsprakensysteem beoordelen we vooraf per site, en maatwerk is bespreekbaar. Twijfel je? De check is gratis.",
          },
          {
            vraag: "Wat als ik later toch weer WordPress wil?",
            antwoord:
              "Dat kan. Vóór je je oude hosting opzegt, zetten we een complete kopie van je WordPress-site veilig. Wil je binnen een jaar terug, dan zetten we die voor je terug; je hebt dan alleen weer hosting nodig. Je bestanden blijven van jou en het abonnement is maandelijks opzegbaar.",
          },
          {
            vraag: "Ik wil eigenlijk ook een nieuw ontwerp. Kan dat?",
            antwoord:
              "Zeker. Veel klanten stappen eerst één-op-één over (zelfde site, geen risico voor Google) en laten daarna een nieuw AI-ontwerp maken, vanaf €250. Je bekijkt dat ontwerp naast je site en beslist zelf of en wanneer je overstapt. Meer bij [een nieuwe website laten maken](/nieuwe-website).",
          },
          {
            vraag: "Wat kost de overstap?",
            antwoord: aanbod.prijs,
          },
        ],
      }}
    />
  );
}
