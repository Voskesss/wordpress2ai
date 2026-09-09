import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";

export const metadata: Metadata = {
  title: "WordPress koppelen aan AI — plug-ins vergeleken met de betere route",
  description:
    "WordPress aan AI koppelen kan met plug-ins, maar die erven alle WordPress-nadelen. De betere route: je site omzetten en volledig door AI laten beheren — typen wat er anders moet, klaar. Vanaf €150, no cure no pay.",
  alternates: { canonical: "/wordpress-koppelen-aan-ai" },
};

export default function Pagina() {
  return (
    <SeoLanding
      data={{
        slug: "wordpress-koppelen-aan-ai",
        label: "WordPress koppelen aan AI",
        titel: "WordPress koppelen aan AI: wat werkt écht?",
        intro:
          "Wie WordPress aan AI wil koppelen, vindt vooral plug-ins: schrijfhulpjes in de editor, chatbots voor bezoekers, SEO-assistenten. Die kunnen nuttig zijn — maar ze veranderen niets aan het echte probleem: jij blijft de machine bedienen. Inloggen, updates, plugins die botsen, en alsnog zelf door het beheerscherm klikken. De koppeling die wél alles verandert: je WordPress-site omzetten naar een vorm die een AI volledig kan beheren. Daarna typ je wat er anders moet, en het gebeurt — met voorbeeld vooraf en jouw akkoord.",
        blokken: [
          {
            kop: "Route 1: een AI-plug-in ín WordPress",
            tekst:
              "Plug-ins zoals AI-schrijfassistenten of chatbots draaien binnen WordPress. Eerlijk is eerlijk: voor het sneller schrijven van een blogtekst werken ze prima. Maar ze erven alles wat WordPress zwaar maakt — elke plug-in is een extra onderdeel dat updates vraagt, kan botsen met je thema en je site trager maakt. En het beheren zelf (de juiste pagina vinden, blokken verslepen, opslaan, hopen dat niets breekt) blijft jouw werk. Je koppelt een hulpje aan de machine; de machine blijft.",
          },
          {
            kop: "Route 2: WordPress loslaten, de AI wordt je beheerder",
            tekst:
              "WordSwap zet je site om naar platte, razendsnelle web-bestanden — een zorgvuldige kopie, met controle van je SEO-structuur. Daaraan koppelen we een AI die je hele site kent. Vanaf dat moment beheer je alles via een chat: \"zet de zomeropeningstijden erop\", \"voeg een pagina toe over dakisolatie\", \"vervang deze foto\". Elke wijziging zie je eerst als voorbeeld en publiceer je zelf; elke eerdere versie blijft terug te zetten. Geen updates, geen plug-ins, minder WordPress-aanvalsoppervlak.",
          },
          {
            kop: "Ook je éigen AI kan erop",
            tekst:
              "Gebruik je zelf ChatGPT of Claude? Laat die je teksten bedenken en plak ze in de chat — of vraag als expert rechtstreekse toegang tot de bestanden van je site en werk met je eigen AI-tools; publicatie verloopt dan via de afgesproken technische route, buiten de standaard goedkeuring in het portaal. Er is geen lock-in: je site is en blijft van jou.",
          },
          {
            kop: "Wanneer een plug-in tóch de juiste keuze is",
            tekst:
              "Heb je een webshop, een ledenomgeving met inlog of een boekingssysteem met live agenda, dan heb je het draaiende WordPress-systeem echt nodig — kies dan gerust een AI-plug-in als hulpje. Voor de gewone bedrijfssite (pagina's, blog, foto's, formulieren) is de overstap vrijwel altijd de betere koppeling: goedkoper per maand, sneller, veiliger, en de AI doet het werk in plaats van jou te souffleren.",
          },
        ],
        faq: [
          {
            vraag: "Kan ik AI aan mijn bestaande WordPress-site koppelen zonder over te stappen?",
            antwoord:
              "Ja, met plug-ins — maar die helpen alleen bij het schrijven of beantwoorden, niet bij het beheren, en ze maken je site zwaarder. Wil je dat de AI je site écht beheert, dan is omzetten de route: eenmalig vanaf €150, no cure no pay — je ziet eerst de complete kopie.",
          },
          {
            vraag: "Verlies ik mijn content of Google-posities bij het omzetten?",
            antwoord:
              "We nemen je inhoud over en controleren de SEO-structuur en doorverwijzingen. Google-posities kunnen we niet garanderen.",
          },
          {
            vraag: "Wat kost een WordPress-site die aan AI gekoppeld is?",
            antwoord:
              "Bij WordSwap: eenmalig €150 tot €650 voor de overstap (naar grootte), daarna €5 tot €20 per maand voor de AI-koppeling. Vergelijk dat met hosting plus premium plug-ins plus een AI-plug-in-abonnement — vergelijk dit met je huidige facturen.",
          },
          {
            vraag: "Doet de AI ooit iets zonder mijn toestemming?",
            antwoord:
              "Nee. Elke wijziging is eerst een concept dat je als voorbeeld bekijkt; pas na jouw klik op Publiceer staat hij live. En ook daarna kun je elke versie terugzetten.",
          },
        ],
      }}
    />
  );
}
