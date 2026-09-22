import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
export const metadata: Metadata = {"title": "Een website voor je bouwbedrijf die je bijhoudt met een app", "description": "Opgeleverde projecten op je site zetten vanaf de bouwplaats, met een appje. Je site gaat exact over, zonder updates en plugins. Vanaf 150 euro.", "alternates": {"canonical": "/website-bouwbedrijf"}};
export default function Pagina(){ return <SeoLanding data={{
  "slug": "website-bouwbedrijf",
  "label": "Website voor bouwbedrijven",
  "titel": "Een website voor je bouwbedrijf die je bijhoudt met een app",
  "intro": "Opgeleverde projecten zijn je beste verkoopargument, en die staan vaak alleen op de telefoon van de uitvoerder. Wij zetten je site over zoals hij is, en daarna zet je een project erop vanaf de bouwplaats.",
  "blokken": [
    {
      "kop": "Een project erop, vanaf de bouwplaats",
      "tekst": "Stuur foto's met een zin erbij en wij maken er een projectpagina van. Je ziet eerst hoe het eruitziet en drukt zelf op publiceren. Ook je uitvoerder kan dat doen, zonder dat hij iets van websites hoeft te weten."
    },
    {
      "kop": "Je bestaande site, zonder het onderhoud",
      "tekst": "Zelfde indeling, zelfde foto's, zelfde teksten. Wat eraf gaat is WordPress. Geen updates, geen plugins, geen beveiligingslek waar je achteraf van hoort."
    },
    {
      "kop": "Vacatures en aanbestedingen",
      "tekst": "Een vacature erbij of een pagina over een aanbesteding is een kwestie van vragen. Je kunt ook een pdf meesturen, dan zetten we er een nette downloadlink van."
    },
    {
      "kop": "Wat het kost",
      "tekst": "Overzetten is eenmalig vanaf 150 euro, daarna vanaf 19 euro per maand. Er zit geen limiet op het aantal pagina's of wijzigingen in dat bedrag."
    }
  ],
  "faq": [
    {
      "vraag": "Wij hebben veel pagina's, kan dat?",
      "antwoord": "Ja, er is geen maximum. Bij de gratis websitecheck kijken we hoe groot je site is en wat er allemaal mee moet."
    },
    {
      "vraag": "Kunnen meerdere mensen erbij?",
      "antwoord": "Ja, je kunt collega's toegang geven tot het beheer. Iedereen ziet wat er gewijzigd is."
    },
    {
      "vraag": "Blijven onze certificeringen en logo's staan?",
      "antwoord": "Alles wat nu op je site staat gaat mee, inclusief logo's, keurmerken en documenten. We controleren na het overzetten of er niets is weggevallen."
    },
    {
      "vraag": "Kunnen we later nog terug?",
      "antwoord": "Je bestanden zijn altijd van jou en je kunt ze op elk moment downloaden. We bewaren daarnaast een kopie van je WordPress-site."
    }
  ]
}} />; }
