import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
export const metadata: Metadata = {"title": "Een website voor je schildersbedrijf zonder onderhoud", "description": "Voor-en-na-foto's op je site zetten met een bericht vanaf de steiger. Je site gaat exact over, zonder WordPress eronder. Vanaf 150 euro eenmalig.", "alternates": {"canonical": "/website-schildersbedrijf"}};
export default function Pagina(){ return <SeoLanding data={{
  "slug": "website-schildersbedrijf",
  "label": "Website voor schilders",
  "titel": "Een website voor je schildersbedrijf zonder onderhoud",
  "intro": "Voor-en-na-foto's zijn het beste wat een schilder kan laten zien, en juist die blijven op de telefoon staan. Wij zetten je site over zoals hij is, en daarna zet je een klus erop met een appje vanaf de steiger.",
  "blokken": [
    {
      "kop": "Voor en na, zonder tussenpersoon",
      "tekst": "Klus klaar? Stuur je foto's met een zin erbij en wij zetten er een project van op je site. Je ziet eerst een voorbeeld en drukt zelf op publiceren. Dat is het hele verhaal: geen inlogscherm, geen handleiding, geen factuur voor een half uurtje."
    },
    {
      "kop": "Alles blijft staan wat er staat",
      "tekst": "Je referenties, je werkgebied, je contactformulier en je plek in Google gaan mee. We zetten de site precies zo over als hij nu is. Wat eraf gaat is WordPress, en daarmee de updates en de plugins die stuk kunnen."
    },
    {
      "kop": "Ook als je met onderaannemers werkt",
      "tekst": "Werk je samen met stukadoors of een bouwbedrijf, dan is een pagina erbij een kwestie van vragen. Er is geen maximum aan het aantal pagina's en je betaalt niet per wijziging."
    },
    {
      "kop": "Wat het kost",
      "tekst": "Overzetten is eenmalig vanaf 150 euro, daarna vanaf 19 euro per maand. Daar zit de hosting, het beheer en het aanpassen via de chat in."
    }
  ],
  "faq": [
    {
      "vraag": "Ik heb honderden foto's, past dat?",
      "antwoord": "Ja. We nemen je bestaande foto's mee en bewaren ze; niets gaat verloren als je later iets vervangt. Bij de gratis websitecheck kijken we even hoe groot je site is."
    },
    {
      "vraag": "Kan ik ook gewoon bellen in plaats van typen?",
      "antwoord": "Je kunt je wijziging ook inspreken in de chat, en je kunt ons altijd bellen. Sommige klanten doen alles zelf, anderen sturen ons een appje."
    },
    {
      "vraag": "Blijft mijn site vindbaar in Google?",
      "antwoord": "Dat is het eerste waar we op letten. Je bestaande adressen, titels en omschrijvingen gaan mee en we controleren na het overzetten of er niets is weggevallen."
    },
    {
      "vraag": "Wat als ik toch een nieuw ontwerp wil?",
      "antwoord": "Dat kan als aparte dienst. Overzetten en opnieuw ontwerpen zijn bij ons twee verschillende dingen, zodat je niet gedwongen wordt te kiezen."
    }
  ]
}} />; }
