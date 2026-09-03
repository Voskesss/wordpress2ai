import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";

export const metadata: Metadata = {
  title: "WordPress omzetten naar een gewone website",
  description:
    "WordPress omzetten naar een gewone (statische) HTML-website: sneller, veiliger, geen onderhoud. Vanaf €150, SEO blijft behouden, no cure no pay.",
  alternates: { canonical: "/wordpress-omzetten-naar-gewone-website" },
};

export default function Pagina() {
  return (
    <SeoLanding
      data={{
        slug: "wordpress-omzetten-naar-gewone-website",
        label: "WordPress omzetten",
        titel: "WordPress omzetten naar een gewone website — zo simpel als het klinkt",
        intro:
          "De meeste bedrijfssites gebruiken misschien 5% van wat WordPress kan, maar betalen wel 100% van de prijs: hosting, updates, beveiligingsrisico's en traagheid. Door je site om te zetten naar een gewone, statische website houd je precies dezelfde site over — alleen dan snel, veilig en zonder onderhoud.",
        blokken: [
          {
            kop: "Wat is een 'gewone' website eigenlijk?",
            tekst:
              "Kant-en-klare HTML-pagina's, zonder database of beheersysteem eronder. Bij elk bezoek wordt gewoon de pagina zelf geladen — er hoeft niets berekend of opgebouwd te worden. Daardoor laadt zo'n site vrijwel direct, kan er niets gehackt worden (er draait niets om te hacken) en is er letterlijk geen onderhoud.",
          },
          {
            kop: "Maar hoe wijzig ik dan nog iets?",
            tekst:
              "Vroeger was dat het nadeel van statische sites: voor elke wijziging had je een webbouwer nodig. Dat lossen wij op met AI: je typt in een chat wat er anders moet — \"ander telefoonnummer\", \"nieuwe pagina over dakisolatie\" — en de AI voert het uit. Jij bekijkt het voorbeeld en keurt het goed. Makkelijker dan WordPress ooit was.",
          },
          {
            kop: "De omzetting: een 95%-kopie",
            tekst:
              "We bouwen je bestaande site na als een kopie: zelfde design, zelfde teksten, zelfde URL's, zelfde formulieren. In 2 van de 3 gevallen exact; bijzondere plugins of sliders zijn soms lastiger, maar ook die zetten we zo identiek mogelijk over. Je beoordeelt de complete kopie vóórdat je betaalt — niet tevreden, dan betaal je niets.",
          },
          {
            kop: "Wat je bespaart",
            tekst:
              "Hosting (€10-25 p/m), premium plugins en thema's (€5-30 p/m), onderhoud of een onderhoudscontract (€30+ p/m) en het uurtarief voor elke kleine aanpassing. Daarvoor in de plaats komt één klein maandbedrag van €5 tot €20 waar hosting én AI-wijzigingen al in zitten.",
          },
        ],
        faq: [
          {
            vraag: "Verlies ik mijn Google-posities bij het omzetten?",
            antwoord:
              "Nee. Alle URL's, paginatitels en meta-omschrijvingen worden letterlijk overgenomen en we melden de site aan bij Google Search Console. Omdat de site sneller wordt, is het effect op je vindbaarheid eerder positief.",
          },
          {
            vraag: "Kan mijn blog mee?",
            antwoord:
              "Ja, alle blogberichten gaan mee op hun eigen adres, inclusief categorieën en tags. Nieuwe blogs schrijf je daarna gewoon via de chat.",
          },
          {
            vraag: "Werken mijn contactformulieren nog?",
            antwoord:
              "Ja, formulieren zetten we om en de inzendingen krijg je per e-mail, net als nu. De invuller krijgt automatisch een nette bevestiging.",
          },
          {
            vraag: "Wat kan er níet omgezet worden?",
            antwoord:
              "Webshops en ledenportalen met inlog — die hebben een draaiend systeem nodig. Gewone bedrijfssites, ook met blog en formulieren, juist wél. Een bestaand boekings- of afsprakensysteem (agenda-widget) nemen we gewoon mee, en maatwerk is bespreekbaar. Twijfel je? De check is gratis.",
          },
        ],
      }}
    />
  );
}
