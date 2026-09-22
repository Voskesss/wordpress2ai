import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
export const metadata: Metadata = {"title": "Een website voor je hoveniersbedrijf die je zelf bijhoudt", "description": "Je site over zoals hij is, en daarna zet je een tuinproject erop met een appje vanaf de klus. Vanaf 150 euro eenmalig, daarna vanaf 19 euro per maand.", "alternates": {"canonical": "/website-hoveniersbedrijf"}};
export default function Pagina(){ return <SeoLanding data={{
  "slug": "website-hoveniersbedrijf",
  "label": "Website voor hoveniers",
  "titel": "Een website voor je hoveniersbedrijf die je zelf bijhoudt",
  "intro": "Je maakt foto's op elke klus, en op je site staat nog het werk van twee jaar geleden. Niet omdat je het niet wilt, maar omdat er iemand aan te pas moet komen. Wij zetten je site precies zo over als hij nu is, en daarna zet je een project erop met een bericht vanaf de tuin.",
  "blokken": [
    {
      "kop": "Je laatste project erop, vanaf de klus",
      "tekst": "Tuin klaar, foto's gemaakt? Stuur ze via WhatsApp met een zin erbij: “zet dit project erop, aanleg met natuursteen in Wolfheze”. Wij maken er een projectpagina van met je foto's erin, en jij bekijkt hem voordat hij live gaat. Geen inloggen, geen plugin, geen wachten op een webbouwer."
    },
    {
      "kop": "Je huidige site blijft je huidige site",
      "tekst": "We bouwen niets opnieuw. Dezelfde indeling, dezelfde foto's, dezelfde teksten en kleuren, alleen zonder WordPress eronder. Wat je nu hebt aan projectpagina's, een contactformulier en je vindbaarheid in Google gaat mee. Vind je je site juist niet meer mooi, dan maken we ook een nieuw ontwerp, maar dat is een aparte keuze."
    },
    {
      "kop": "Seizoenswerk, zonder gedoe",
      "tekst": "In het voorjaar wil je snel iets kunnen zeggen over aanleg en onderhoud, in het najaar over snoeiwerk en bladruimen. Een zin aanpassen of een blok bovenaan zetten is bij ons een berichtje, geen klusje voor de avond."
    },
    {
      "kop": "Wat het kost",
      "tekst": "Het overzetten is eenmalig vanaf 150 euro, daarna vanaf 19 euro per maand voor hosting en beheer. Geen updates die blijven staan, geen plugins die stuk gaan, geen jaarlijkse verrassing."
    }
  ],
  "faq": [
    {
      "vraag": "Kan mijn fotogalerij mee?",
      "antwoord": "Ja. Galerijen, sliders en lightboxen gaan gewoon mee, en je oude foto's blijven bewaard. Nieuwe foto's stuur je mee in de chat of via WhatsApp; wij verkleinen ze voor het web zodat je site snel blijft."
    },
    {
      "vraag": "Hoeveel projecten kan ik erop zetten?",
      "antwoord": "Er is geen maximum aan het aantal pagina's of projecten. Wel kijken we bij de websitecheck even hoeveel foto's je site heeft, zodat we weten wat we overzetten."
    },
    {
      "vraag": "Blijft mijn contactformulier werken?",
      "antwoord": "Ja. Aanvragen komen binnen zoals je gewend bent, per mail, en ze staan daarnaast in je portaal zodat je er altijd bij kunt."
    },
    {
      "vraag": "Wat als ik het zelf niet wil doen?",
      "antwoord": "Dan stuur je ons een berichtje en doen wij het. De chat is er om het makkelijker te maken, niet om het werk naar jou te schuiven."
    }
  ]
}} />; }
