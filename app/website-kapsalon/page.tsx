import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
export const metadata: Metadata = {"title": "Een website voor je salon met prijzen die kloppen", "description": "Prijslijst en openingstijden in een minuut aangepast, zonder webbouwer. Je afsprakensysteem blijft gewoon werken. Vanaf 150 euro eenmalig.", "alternates": {"canonical": "/website-kapsalon"}};
export default function Pagina(){ return <SeoLanding data={{
  "slug": "website-kapsalon",
  "label": "Website voor kappers en salons",
  "titel": "Een website voor je salon met prijzen die kloppen",
  "intro": "Een prijslijst van drie jaar geleden of openingstijden die niet meer kloppen, daar heb je elke week gesprekken over aan de balie. Wij zetten je site over zoals hij is, en daarna pas je hem aan door te typen wat er anders moet.",
  "blokken": [
    {
      "kop": "Prijzen en openingstijden, in een minuut",
      "tekst": "Prijs omhoog, een dag gesloten rond de feestdagen, een nieuwe behandeling erbij? Typ het en je ziet meteen hoe het eruitziet. Geen webbouwer bellen voor twee regels tekst."
    },
    {
      "kop": "Je werk laten zien",
      "tekst": "Nieuwe kleuring of kapsel waar je trots op bent? Stuur de foto mee en wij zetten hem erbij. Je bekijkt het eerst en publiceert zelf."
    },
    {
      "kop": "Online afspraken blijven werken",
      "tekst": "Gebruik je een afsprakensysteem van een andere partij, dan blijft dat gewoon werken: daar linken of sluiten we naartoe, net als nu. Alleen een boekingssysteem dat ín WordPress draait gaat niet mee."
    },
    {
      "kop": "Wat het kost",
      "tekst": "Eenmalig vanaf 150 euro om over te zetten, daarna vanaf 19 euro per maand voor hosting en beheer."
    }
  ],
  "faq": [
    {
      "vraag": "Ik gebruik Salonized of Treatwell, kan dat mee?",
      "antwoord": "Draait je afsprakensysteem bij die partij, dan blijft de knop of het venster gewoon werken zoals nu. We kijken bij de websitecheck even hoe het bij jou is ingebouwd."
    },
    {
      "vraag": "Kan ik mijn prijslijst zelf aanpassen?",
      "antwoord": "Ja, dat is precies waar het voor bedoeld is. Je typt wat er anders moet, ziet een voorbeeld en publiceert zelf."
    },
    {
      "vraag": "Blijft mijn site vindbaar als mensen zoeken op mijn plaats?",
      "antwoord": "Je bestaande adressen en teksten gaan mee, inclusief je vindbaarheid. Na het overzetten controleren we of er niets is weggevallen."
    },
    {
      "vraag": "Wat als ik het te ingewikkeld vind?",
      "antwoord": "Dan stuur je ons een berichtje, ook via WhatsApp, en regelen wij het. Je zit nergens aan vast."
    }
  ]
}} />; }
