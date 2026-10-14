import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
export const metadata: Metadata = {"title": "Website stichting laten maken, zelf bijhouden", "description": "Niet meer afhankelijk van die ene vrijwilliger die WordPress kent. Meerdere mensen houden de site bij, ook ANBI-gegevens. Vanaf 150 euro eenmalig.", "alternates": {"canonical": "/website-stichting"}};
export default function Pagina(){ return <SeoLanding data={{
  "slug": "website-stichting",
  "label": "Website voor stichtingen en verenigingen",
  "titel": "Een website voor je stichting of vereniging die niet van één vrijwilliger afhangt",
  "kort": "Website voor je stichting",
  "intro": "Bij veel stichtingen en verenigingen is er één iemand die weet hoe de website werkt. Dat gaat goed, tot die persoon verhuist, stopt in het bestuur of gewoon geen zin meer heeft in WordPress-updates. Dan blijft de site staan zoals hij is, met nieuws van twee jaar terug. Wij zetten je site over zoals hij is, en daarna kan iedereen die je toegang geeft hem bijhouden door te typen wat er anders moet.",
  "blokken": [
    {
      "kop": "Niet meer afhankelijk van die ene vrijwilliger",
      "tekst": "Het beheer is geen kennis meer die in één hoofd zit. Je hoeft geen thema's, plugins of inlogcodes van een oude hostingpartij over te dragen. Wie de site bijhoudt, beschrijft gewoon wat er moet veranderen, ziet eerst een voorbeeld en publiceert. Stopt iemand, dan neemt de volgende het over zonder cursus."
    },
    {
      "kop": "Meerdere mensen met een eigen inlog",
      "tekst": "Je kunt teamleden uitnodigen, elk met een eigen inlog. Tot 3 teamleden zijn gratis. Per persoon stel je in of iemand zelf mag publiceren of alleen voorstellen klaarzet, en of hij de berichten uit het contactformulier mag zien. Zo kan de secretaris het nieuws bijhouden, de penningmeester de financiële stukken en de voorzitter alles nog even nalezen. Iedereen ziet wat er is gewijzigd."
    },
    {
      "kop": "ANBI-gegevens die actueel moeten zijn",
      "tekst": "Heeft je stichting een ANBI-status, dan vraagt de Belastingdienst dat je bepaalde gegevens online openbaar maakt, zoals de doelstelling, de bestuurders, het beleidsplan in hoofdlijnen, een verslag van activiteiten en de financiële verantwoording. Die verantwoording hoort er in het algemeen binnen een half jaar na afloop van het boekjaar op te staan. Welke eisen precies voor jouw organisatie gelden, check je het best op de site van de Belastingdienst. Wij zorgen dat je die pagina en de pdf's zelf eenvoudig kunt vervangen, zodat het niet blijft liggen omdat niemand weet hoe het moet."
    },
    {
      "kop": "Nieuws en activiteiten",
      "tekst": "Een ledenvergadering, een sponsorloop, een open dag, een nieuwsbericht over wat de stichting dit jaar heeft bereikt. Je zet het erop met een foto en haalt het weg als het voorbij is. Een uitnodiging of verslag als pdf kan er ook bij, als nette downloadlink."
    },
    {
      "kop": "Een donatieknop naar je eigen betaalpagina",
      "tekst": "Doneren loopt bij de meeste stichtingen al via een externe partij, zoals een betaalpagina van de bank of een donatieplatform. Daar linken we naartoe met een duidelijke knop. Het geld komt dus niet via de website binnen en wij bouwen zelf geen betaalsysteem. Draait je donatieformulier nu als plugin in WordPress, dan kijken we bij de check wat het beste alternatief is."
    },
    {
      "kop": "Geen onderhoud en geen verrassingen",
      "tekst": "Een stichting heeft weinig budget en nog minder zin in een gehackte site. Na het overzetten is er geen WordPress meer om bij te werken en geen plugin die lek kan raken. Wil je het onderhoud helemaal uit handen geven, lees dan over [website laten onderhouden](/website-laten-onderhouden)."
    },
    {
      "kop": "Wat het kost",
      "tekst": "Overzetten is eenmalig vanaf 150 euro, daarna vanaf 19 euro per maand voor hosting en beheer. Teamleden kosten tot het derde lid niets extra. Kijk bij de [prijzen](/prijzen) of lees hoe het [overzetten van WordPress](/wordpress-overzetten) gaat."
    }
  ],
  "faq": [
    {
      "vraag": "Onze websitevrijwilliger stopt, hoe dragen we de site over?",
      "antwoord": "Na het overzetten is er niets technisch meer over te dragen. De nieuwe vrijwilliger krijgt een eigen inlog en kan meteen aan de slag door te typen wat er moet veranderen. De oude kan blijven meekijken of je haalt zijn toegang weg."
    },
    {
      "vraag": "Kunnen meerdere bestuursleden de site bijhouden?",
      "antwoord": "Ja. Tot 3 teamleden zijn gratis, elk met een eigen inlog. Per persoon bepaal je of hij zelf mag publiceren of dat iemand anders het eerst nakijkt."
    },
    {
      "vraag": "Kunnen jullie onze ANBI-pagina controleren op de regels?",
      "antwoord": "Nee, wij zijn geen fiscalisten en controleren niet of je publicatie voldoet. We zorgen wel dat de pagina meegaat en dat je de gegevens en stukken zelf snel kunt bijwerken. Voor de eisen kijk je op de site van de Belastingdienst."
    },
    {
      "vraag": "Kunnen mensen via onze site doneren?",
      "antwoord": "Je site krijgt een donatieknop die doorlinkt naar de betaalpagina of het donatieplatform dat je al gebruikt. Het betalen zelf gebeurt daar, niet op de website."
    },
    {
      "vraag": "Wie doet de check voor een stichting of vereniging?",
      "antwoord": "Jos uit Oosterbeek kijkt zelf naar je site: hoeveel pagina's en documenten er zijn, wat er buiten WordPress draait en wat het gaat kosten. Je kunt hem ook eerst [een vraag sturen](/contact)."
    }
  ]
}} />; }
