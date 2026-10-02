import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
import { aanbod } from "@/lib/aanbod";
export const metadata: Metadata = {"title": "Website laten onderhouden: wat het kost en waar je op let", "description": "Onderhoud kost €12,50 tot €25 per maand. Wat zit erin, waar lopen mensen vast, en wanneer haal je beter de reden voor dat onderhoud weg?", "alternates": {"canonical": "/website-laten-onderhouden"}};
export default function Pagina(){ return <SeoLanding data={{
  "label": "Website laten onderhouden",
  "titel": "Je website laten onderhouden? Dit kost het, en dit zit erin.",
  "intro": "Een onderhoudspakket voor een WordPress-site kost in Nederland meestal tussen de €12,50 en €25 per maand. Daarvoor draait iemand je updates, maakt back-ups en houdt de beveiliging in de gaten. Hieronder staat precies wat je daarvoor krijgt, waar mensen in de praktijk op vastlopen, en één vraag die bijna niemand stelt: waaróm is dat onderhoud er eigenlijk?",
  "blokken": [
    {
      "kop": "Wat kost het om een website te laten onderhouden?",
      "tekst": "De meeste Nederlandse onderhoudspakketten voor WordPress zitten tussen de €12,50 en €25 per maand. Daar krijg je doorgaans voor: de updates van WordPress, je thema en je plugins, een dagelijkse of wekelijkse back-up, een beveiligingsscan en controle of je site nog in de lucht is. Wat je er bijna nooit bij krijgt is het bijwerken van je eigen teksten en foto’s. Dat valt onder ‘wijzigingen’ en gaat per uur of per strippenkaart, meestal tussen de €60 en €95 per uur. Hou daar rekening mee: het maandbedrag is zelden wat je werkelijk kwijt bent."
    },
    {
      "kop": "Wat zit er in een gewoon onderhoudspakket",
      "tekst": "Updates draaien is het grootste deel van het werk. WordPress zelf krijgt een paar keer per jaar een nieuwe versie, je thema ook, en je plugins soms maandelijks. Elke update kan iets breken, dus hoort er een back-up vooraf bij en een controle achteraf. Daarnaast houdt een goede partij je PHP-versie bij, ruimt hij je database op en kijkt hij of je site nog snel genoeg laadt. Dat is echt werk en het is het geld waard als je WordPress houdt."
    },
    {
      "kop": "Waar mensen in de praktijk op vastlopen",
      "tekst": "Niet bij de updates, want die merk je nauwelijks. Het knelt bij de kleine dingen. Je wilt je openingstijden rond de kerst aanpassen, een foto van een afgerond project erbij zetten of een prijs wijzigen. Dat zijn vijf minuten werk, maar je moet het mailen, wachten tot iemand tijd heeft, controleren of het goed is overgenomen, en soms nog een correctie vragen. Twee dagen later staat het erop. Veel ondernemers laten daarom maar zitten, en zo veroudert een site die technisch perfect wordt onderhouden."
    },
    {
      "kop": "De vraag die bijna niemand stelt",
      "tekst": "Waarom moet er eigenlijk elke maand onderhoud gepleegd worden? Niet omdat jouw bedrijf verandert, maar omdat WordPress uit losse onderdelen bestaat die allemaal hun eigen updates hebben: de kern, het thema, en vaak twintig tot veertig plugins van verschillende makers. Elk van die onderdelen kan een lek krijgen of kapotgaan bij een update. Je betaalt dus elke maand om een systeem bij te houden dat je zelf nooit gevraagd hebt. Dat is geen verwijt aan je webbouwer, zo werkt WordPress nu eenmaal."
    },
    {
      "kop": "De andere route: de reden voor het onderhoud weghalen",
      "tekst": aanbod.omschrijving
    },
    {
      "kop": "Automatisch is niet hetzelfde als alleen",
      "tekst": "Er zijn inmiddels diensten die een WordPress-site volautomatisch omzetten: adres invullen, knop indrukken, klaar. Technisch knap, en voor wie zelf handig is prima. Maar bij een overstap komen altijd dingen boven die een machine niet voor je kan wegen. Welke pagina’s mogen vervallen. Of dat oude formulier nog gebruikt wordt. Wat er moet gebeuren met die ene pagina die goed scoort in Google. Of je mail meeverhuist en wanneer. Daarom zit bij ons een mens aan de andere kant. Je krijgt eerst een kopie te zien op een testadres, je loopt hem samen met Jos na, en pas als jij akkoord bent gaat hij live. Betaal je pas na akkoord, dus als het niet goed is, gaat het niet door."
    },
    {
      "kop": "En daarna blijft die begeleiding",
      "tekst": "Na de overstap ben je niet opeens alleen. Kleine wijzigingen typ je gewoon in de chat op je eigen website: je ziet eerst een voorstel, jij drukt op publiceren en je kunt altijd terug naar een vorige versie. Loop je vast of twijfel je over iets, dan mail of app je Jos. Geen ticketsysteem, geen wachtrij, geen strippenkaart die afloopt. Dat is het verschil tussen je website uitbesteden en je website zelf kunnen bijhouden met iemand die meekijkt."
    },
    {
      "kop": "Wat kost het bij WordSwap?",
      "tekst": aanbod.prijs
    },
    {
      "kop": "Wanneer is een gewoon onderhoudspakket beter?",
      "tekst": "Als je tevreden bent met WordPress en alleen het technische werk uit handen wilt geven, is een onderhoudspakket van €12,50 tot €25 prima en goedkoper dan overstappen. Hetzelfde geldt als je een webshop met een kassa draait of een ledengedeelte met inloggen hebt: daar heb je een draaiend systeem voor nodig en dat doen wij niet. Zit je vooral vast op kleine wijzigingen die steeds blijven liggen, dan is overstappen interessanter."
    },
    {
      "kop": "Wat betekent dit voor zoekmachines?",
      "tekst": aanbod.seo
    }
  ],
  "slug": "website-laten-onderhouden",
  "faq": [
    {
      "vraag": "Wat kost het om een website te laten onderhouden?",
      "antwoord": "Een WordPress-onderhoudspakket kost in Nederland meestal €12,50 tot €25 per maand voor updates, back-ups en beveiliging. Inhoudelijke wijzigingen vallen daar meestal buiten en gaan per uur, vaak €60 tot €95. Bij WordSwap vervalt het technische onderhoud en zijn kleine wijzigingen inbegrepen, omdat je ze zelf in de chat typt."
    },
    {
      "vraag": "Wat kost een webdesigner per uur?",
      "antwoord": "In Nederland ligt dat meestal tussen de €60 en €95 per uur, afhankelijk van de regio en het bureau. Voor een kleine tekstwijziging betaal je vaak een heel uur of een kwartier als minimum. Dat is ook precies de reden dat kleine aanpassingen zo vaak blijven liggen."
    },
    {
      "vraag": "Kan ik mijn website zelf onderhouden?",
      "antwoord": "Technisch onderhoud van WordPress zelf doen kan, maar het vraagt dat je bijhoudt wat er verandert, back-ups maakt vóór elke update en controleert of er niets stuk is. De meeste ondernemers beginnen daar vol goede moed aan en laten het na een jaar liggen. Je eigen teksten en foto’s bijhouden is een ander verhaal: dat zou gewoon makkelijk moeten zijn."
    },
    {
      "vraag": "Gaat mijn website offline tijdens de overstap?",
      "antwoord": "Nee. We maken eerst een kopie op een testadres. Die bekijk je rustig, je geeft aan wat er anders moet, en pas als jij akkoord geeft zetten we hem live. Je oude site blijft tot dat moment gewoon staan. Zonder akkoord betaal je ook niets voor de omzetting."
    },
    {
      "vraag": "Wat als ik een wijziging wil die ik niet zelf kan?",
      "antwoord": "Dan doen wij het. Je mailt of appt het gewoon. Groter werk rekenen we per kwartier af en we zeggen vooraf wat het ongeveer wordt, zodat je nooit voor een verrassing staat."
    },
    {
      "vraag": "Moet ik van WordPress af om dit te kunnen?",
      "antwoord": "Voor onze manier wel, en daar zijn we eerlijk over. Juist doordat er geen WordPress meer onder zit vervallen de updates, de plugins en de beveiligingsrisico’s. Je ontwerp, je teksten en je adressen in Google nemen we mee, dus aan de buitenkant blijft het jouw website."
    }
  ]
}} />; }
