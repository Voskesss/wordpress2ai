import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
import { aanbod } from "@/lib/aanbod";

// Zoekintentie: "website abonnement", "website abonnement mkb", "website huren
// per maand", "website laten maken per maand". Veel aanbieders noemen pas een
// prijs na een gesprek; hier staat de prijs vooraan. Bedragen komen uit
// lib/aanbod.ts en app/prijzen/page.tsx.
export const metadata: Metadata = {
  title: "Website abonnement vanaf €19 per maand",
  description:
    "Website abonnement voor zzp en mkb: vanaf €19 per maand excl. btw voor hosting, beveiliging en AI-chat. Maandelijks opzegbaar, je bestanden neem je mee.",
  alternates: { canonical: "/website-abonnement" },
};

export default function Pagina() {
  return (
    <SeoLanding
      data={{
        slug: "website-abonnement",
        label: "Website abonnement",
        titel: "Een website-abonnement met de prijs gewoon vooraan.",
        kort: "Website-abonnement vanaf €19",
        intro:
          "Bij WordSwap betaal je één keer voor je website en daarna een vast bedrag per maand: vanaf €19 excl. btw voor hosting, beveiliging en een AI-chat waarmee je zelf alles bijhoudt. Geen offertegesprek om te horen wat het kost, geen jaarcontract, en je websitebestanden blijven van jou. Hieronder lees je wat er in het abonnement zit, wat er los van staat en wat er gebeurt als je ooit wilt stoppen.",
        blokken: [
          {
            kop: "Wat is een website-abonnement eigenlijk?",
            tekst:
              "Bij een website-abonnement koop je niet alleen een website, maar ook de zorg eromheen. Je betaalt per maand en iemand anders regelt de hosting, de beveiliging en de techniek. Voor zzp'ers en kleine ondernemers is dat vaak prettiger dan een los gebouwde site waar je daarna zelf hosting bij zoekt, updates draait en bij elke wijziging een webbouwer moet bellen. Het verschil tussen aanbieders zit in drie dingen: wat er precies in het maandbedrag zit, wie de eigenaar van de site is, en wat er gebeurt als je opzegt.",
          },
          {
            kop: "Waarom wij de prijs vooraan zetten",
            tekst:
              "Zoek je op website huren per maand, dan zie je vaak mooie pagina's zonder bedrag. Je moet eerst een gesprek inplannen, of je ontdekt pas later dat het maandbedrag boven de €90 ligt. Aan de andere kant zijn er goedkope pakketten van een paar tientjes per maand, waarbij je in een vast sjabloon werkt. Wij vinden dat je vooraf moet weten waar je aan toe bent. Daarom staat het hier gewoon: vanaf €19 per maand voor het basispakket, €39 per maand voor Optimaal ontzorgd, alles exclusief btw. Alle bedragen op een rij vind je bij de [prijzen](/prijzen).",
          },
          {
            kop: "Wat zit er in het basispakket?",
            tekst:
              "Voor vanaf €19 per maand krijg je alles wat je nodig hebt om je site zelf bij te houden. Updates en plug-ins bestaan bij ons niet, dus daar hoef je ook niet voor te betalen. Er geldt fair use: ruimte voor het normale onderhoud van je site.",
            lijst: [
              "Hosting",
              "SSL (het slotje in de adresbalk)",
              "Beveiliging",
              "De koppeling met je domeinnaam",
              "Versiegeschiedenis",
              "Hulp per e-mail",
              "De AI-chat: daarin typ je in gewone woorden wat er anders moet, zoals een nieuwe openingstijd, een extra foto of een hele nieuwe pagina. Je ziet eerst een voorbeeld en zet het daarna zelf live. Hoe dat precies gaat, zie je bij [je website koppelen aan AI](/website-koppelen-aan-ai).",
            ],
          },
          {
            kop: "Optimaal ontzorgd: €39 per maand",
            tekst:
              "Wil je er nog minder naar omkijken, dan is er Optimaal ontzorgd. Je krijgt alles uit het basispakket, plus voorrang: heb je een vraag, dan helpen we jou als eerste. En je kunt je website bijhouden via WhatsApp. Je stuurt een tekst, foto of spraakbericht, je krijgt een voorbeeld terug en pas na jouw akkoord gaat het live. Hoe dat werkt, lees je bij [je website bijhouden via een appje](/appen). Storingen aan onze kant lossen we trouwens voor iedereen kosteloos op, ook in het basispakket.",
            tabel: {
              kop: ["Onderdeel", "Basispakket", "Optimaal ontzorgd"],
              rijen: [
                ["Per maand (excl. btw)", "Vanaf €19", "€39"],
                ["Hosting, SSL, beveiliging en domeinkoppeling", "Ja", "Ja"],
                ["AI-chat en versiegeschiedenis", "Ja", "Ja"],
                ["Hulp per e-mail", "Ja", "Ja"],
                ["Storingen aan onze kant kosteloos opgelost", "Ja", "Ja"],
                ["Voorrang bij je vragen", "Nee", "Ja"],
                ["Website bijhouden via WhatsApp", "Nee", "Ja"],
              ],
            },
          },
          {
            kop: "Wat zit er niet in het abonnement?",
            tekst:
              "Eerlijk is eerlijk: niet alles zit in het maandbedrag. Dit staat los van het pakket:",
            lijst: [
              "Je domeinnaam. Die blijft van jou, waar hij ook staat.",
              "Je e-mail. Daarvoor kijken we eerst samen waar die nu draait voordat er iets verandert.",
              "Werk dat wij voor je doen buiten je pakket, zoals een wijziging, advies of een koppeling: €15 per kwartier excl. btw, altijd eerst in overleg.",
              "Maatwerk en extra functies: die spreken we apart af.",
              "Een webshop of een ledenomgeving met inlog hosten we niet; staat die bij een andere partij, dan linken we er gewoon naartoe.",
            ],
          },
          {
            kop: "Opzeggen: wat neem je mee?",
            tekst:
              "Het abonnement is maandelijks opzegbaar, en dat regel je zelf in je portaal. Je website bestaat uit gewone webbestanden die van jou zijn. Die download je op elk moment zelf, ook als je gewoon blijft. Stop je, dan neem je alles mee: je website, je formulierberichten en je facturen. Je site blijft na de betaalde periode nog een maand extra online, zodat je rustig kunt verhuizen naar een andere partij.",
          },
          {
            kop: "Het verschil met een site huren bij een bureau",
            tekst:
              "Bij veel huurconstructies blijft de website eigendom van het bureau. Je betaalt maandelijks, maar stop je, dan stopt ook je site en begin je ergens anders weer bij nul. Soms zit er een contract van een of meer jaren aan vast. Lees dus altijd wie de eigenaar is en wat je meekrijgt bij opzeggen. Bij WordSwap is dat simpel: de bestanden zijn van jou, je kunt ze altijd downloaden en er is geen jaarcontract. Wil je weten hoe dit zich verhoudt tot een gewoon onderhoudspakket voor WordPress, lees dan [website laten onderhouden](/website-laten-onderhouden).",
          },
          {
            kop: "Twee routes: overzetten of nieuw laten maken",
            tekst:
              "Heb je al een website, bijvoorbeeld in WordPress? Dan zetten we die over: zelfde ontwerp, zelfde teksten, zelfde pagina-adressen. Dat kost eenmalig €150 tot €650, afhankelijk van de grootte, en je ziet eerst de complete kopie. Lees meer bij [WordPress overzetten](/wordpress-overzetten). Heb je nog geen site, of ben je toe aan iets nieuws? Dan maken we [een nieuwe website](/nieuwe-website) met een AI-ontwerp vanaf €250 (tot 8 pagina's), €400 tot 20 pagina's en €650 voor grotere sites. Een ontwerp door een designer kan ook, vanaf €1.750. Daarna loopt het abonnement voor beide routes precies hetzelfde.",
          },
          {
            kop: "Persoonlijk, ook al werkt de AI mee",
            tekst:
              "WordSwap is geen anonieme fabriek. Jos uit Oosterbeek kijkt mee bij elke overstap en is je aanspreekpunt als je ergens niet uitkomt. De AI doet het snelle werk, maar een mens controleert of je site klopt voordat hij live gaat. Wil je eerst zien hoe het bijhouden voelt? [Probeer de demo](/demo), of [stel je vraag](/contact) en je krijgt een eerlijk antwoord, ook als WordSwap niet bij je past.",
          },
        ],
        faq: [
          {
            vraag: "Zit er een minimale looptijd aan het website-abonnement?",
            antwoord:
              "Nee. Beide pakketten zijn maandelijks opzegbaar en dat regel je zelf in je portaal. Je betaalt alleen eenmalig voor de overstap of het nieuwe ontwerp, en dat pas nadat je de site hebt gezien en akkoord hebt gegeven.",
          },
          {
            vraag: "Is mijn website van mij of van WordSwap?",
            antwoord:
              "Van jou. Je website bestaat uit gewone webbestanden die je op elk moment zelf downloadt in je portaal. Stop je, dan neem je ze mee en blijft je site na de betaalde periode nog een maand online, zodat je rustig kunt verhuizen.",
          },
          {
            vraag: "Kan ik een website-abonnement afsluiten als ik nog geen website heb?",
            antwoord:
              "Ja. Dan maken we eerst een nieuwe website voor je, met een AI-ontwerp vanaf €250 excl. btw. Daarna loopt het abonnement vanaf €19 per maand, net als bij een overstap. Meer daarover bij [een nieuwe website laten maken](/nieuwe-website).",
          },
          {
            vraag: "Zijn mijn domeinnaam en e-mail bij het abonnement inbegrepen?",
            antwoord:
              "Nee, die staan los van het pakket. De koppeling van je domeinnaam aan je website zit er wel in. Je domeinnaam blijft van jou, waar hij ook staat. Voor je e-mail kijken we eerst waar die nu draait; een eventuele mailverhuizing bespreken we apart, met de kosten vooraf.",
          },
          {
            vraag: "Wanneer kies ik Optimaal ontzorgd in plaats van het basispakket?",
            antwoord:
              "Als je liever een appje stuurt dan inlogt, of als je bij een vraag niet wilt wachten. Optimaal ontzorgd kost €39 per maand excl. btw en geeft je voorrang bij je vragen en je website bijhouden via WhatsApp. Doe je het bijhouden graag zelf in de chat en heb je zelden vragen, dan is het basispakket genoeg.",
          },
          {
            vraag: "Kan ik een webshop huren via een website-abonnement?",
            antwoord:
              "Niet bij ons. Een webshop of ledenomgeving met inlog heeft een draaiend systeem met database nodig, en dat hosten wij niet. Heb je je webshop bij een externe partij, zoals Shopify, dan kan je bedrijfssite wel bij ons staan en linken we gewoon naar je winkel.",
          },
          {
            vraag: "Wat betaal ik als ik iets wil laten doen dat ik niet zelf kan?",
            antwoord:
              "Werk dat wij voor je doen buiten je pakket rekenen we per kwartier: €15 excl. btw, altijd eerst in overleg zodat je nooit voor verrassingen staat. Storingen die bij ons liggen lossen we kosteloos op. Veel kleine wijzigingen doe je overigens zelf in de chat, zonder extra kosten.",
          },
          {
            vraag: "Wat kost het?",
            antwoord: aanbod.prijs,
          },
        ],
      }}
    />
  );
}
