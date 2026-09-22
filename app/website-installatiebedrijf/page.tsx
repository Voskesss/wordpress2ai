import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
export const metadata: Metadata = {"title": "Een website voor je installatiebedrijf die altijd klopt", "description": "Telefoonnummer, spoeddienst en projecten altijd kloppend, zonder je webbouwer te bellen. Je site gaat exact over. Vanaf 150 euro eenmalig.", "alternates": {"canonical": "/website-installatiebedrijf"}};
export default function Pagina(){ return <SeoLanding data={{
  "slug": "website-installatiebedrijf",
  "label": "Website voor installateurs",
  "titel": "Een website voor je installatiebedrijf die altijd klopt",
  "intro": "Een verkeerd telefoonnummer of een oude spoeddienst op je site kost je direct werk. Wij zetten je site over zoals hij is, en daarna pas je hem aan door te typen wat er anders moet.",
  "blokken": [
    {
      "kop": "Wat er moet kloppen, klopt",
      "tekst": "Telefoonnummer, bereikbaarheid, spoeddienst, werkgebied: dat zijn de dingen waar iemand op afgaat als zijn cv-ketel uitvalt. Bij ons is dat een zin aanpassen in een chat, niet een mailtje naar je webbouwer waar je twee dagen op wacht."
    },
    {
      "kop": "Je projecten laten zien",
      "tekst": "Badkamer af, warmtepomp geplaatst? Foto's meesturen en wij zetten er een project van op. Je bekijkt het voorbeeld en publiceert zelf."
    },
    {
      "kop": "Geen updates meer, en geen plugins",
      "tekst": "Je site draait daarna zonder WordPress. Dat betekent geen updates die blijven staan, geen plugin die het na een update niet meer doet, en geen site die er ineens uit ligt op een zaterdag."
    },
    {
      "kop": "Wat het kost",
      "tekst": "Eenmalig vanaf 150 euro om over te zetten, daarna vanaf 19 euro per maand voor hosting en beheer."
    }
  ],
  "faq": [
    {
      "vraag": "Kan mijn offerteformulier mee?",
      "antwoord": "Ja. Formulieren gaan mee en de aanvragen komen bij je binnen zoals je gewend bent. Ze staan ook in je portaal, zodat je nooit een aanvraag kwijt bent."
    },
    {
      "vraag": "Ik gebruik een extern plansysteem, kan dat?",
      "antwoord": "Draait je plan- of reserveringssysteem bij een andere partij, dan is dat geen probleem: daar linken of sluiten we gewoon naartoe, precies zoals nu. Alleen een systeem dat ín WordPress zelf draait gaat niet mee."
    },
    {
      "vraag": "Hoe snel is een wijziging live?",
      "antwoord": "Je ziet direct een voorbeeld en publiceert zelf. Meestal is dat een kwestie van een minuut of twee."
    },
    {
      "vraag": "En als er iets misgaat?",
      "antwoord": "Je ziet elke wijziging eerst als concept en je kunt altijd een stap terug. Daarnaast bewaren we een kopie van je oude WordPress-site, zodat de weg terug openblijft."
    }
  ]
}} />; }
