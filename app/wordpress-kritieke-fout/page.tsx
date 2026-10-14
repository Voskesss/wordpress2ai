import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";

// Noodpagina voor de melding die WordPress toont bij een fatale fout.
// Feiten gecheckt 14-10-2026: Nederlandse teksten via translate.wordpress.org
// (nl, wp/dev), herstelmodus via make.wordpress.org (5.2), plug-inmap hernoemen
// via wordpress.org/documentation/article/faq-troubleshooting, WP_DEBUG via
// developer.wordpress.org/advanced-administration/debug/debug-wordpress.
export const metadata: Metadata = {
  title: "Er is een kritieke fout op deze website: wat nu?",
  description:
    "Je WordPress-site toont ‘Er is een kritieke fout op deze website’ of een wit scherm? Zo los je het stap voor stap op, van veilig naar technisch.",
  alternates: { canonical: "/wordpress-kritieke-fout" },
};

export default function Pagina() {
  return (
    <SeoLanding
      data={{
        slug: "wordpress-kritieke-fout",
        label: "Kritieke fout in WordPress",
        titel: "Er is een kritieke fout op deze website. Wat nu?",
        intro:
          "Je opent je eigen website en ziet alleen een witte pagina met één zin: er is een kritieke fout op deze website. Schrik niet te hard. In de meeste gevallen staan je teksten en foto’s er nog gewoon, alleen loopt WordPress vast op een stukje code, vaak van een plug-in of thema. Hieronder staat wat je kunt doen, in volgorde van de veiligste stap naar de technischere. En ook wanneer je beter kunt stoppen en hulp vraagt.",
        blokken: [
          {
            kop: "Wat betekent deze melding?",
            tekst:
              "WordPress draait op de programmeertaal PHP. Gaat er in die code iets zo mis dat de pagina niet meer opgebouwd kan worden, dan stopt WordPress liever helemaal dan dat het een halve, kapotte pagina laat zien. Je bezoekers zien dan dezelfde korte melding als jij. De precieze tekst verschilt per versie, bijvoorbeeld ‘Er is een kritieke fout opgetreden op deze site’, soms met de toevoeging dat je je beheer-e-mail moet controleren. Bij oudere versies, of als de foutmelding is uitgezet, zie je alleen een wit scherm. Het goede nieuws: de fout zit bijna altijd in de code, niet in je inhoud. Je pagina’s en berichten staan in de database en die raakt bij zo’n fout meestal niet beschadigd.",
          },
          {
            kop: "Stap 1: kijk in je mail, daar staat vaak al de oplossing",
            tekst:
              "Sinds versie 5.2 stuurt WordPress bij zo’n fout automatisch een mail naar het beheerdersadres van de site. Dat is het adres dat ooit bij de installatie is ingevuld, dus misschien niet je dagelijkse mailbox. Het onderwerp is in het Nederlands iets als ‘[naam van je site] je site ervaart een technisch probleem’, in het Engels ‘Your Site is Experiencing a Technical Issue’. Kijk ook in je spam. In die mail staat welke plug-in of welk thema de fout veroorzaakte, plus een speciale link naar de herstelmodus. Klik die link aan en log in. In de herstelmodus is de foute plug-in alleen voor jou even stilgezet; bezoekers zien de fout nog wel. Ga in het menu naar Plugins, deactiveer de plug-in die in de mail genoemd wordt en klik daarna bovenin op de knop om de herstelmodus te verlaten. Open je site daarna in een privévenster om te zien of hij het weer doet.",
          },
          {
            kop: "Wat zit er meestal achter?",
            tekst:
              "Vraag jezelf eerst af: wat is er als laatste veranderd? Bijna altijd is het een van deze dingen. Een plug-in of thema is bijgewerkt en past niet meer bij de rest. Twee plug-ins bijten elkaar. WordPress zelf heeft een automatische update gedaan. Of je hostingpartij heeft de PHP-versie verhoogd en een oude plug-in kan daar niet mee overweg. Soms is het ook gewoon een plug-in die je net hebt geïnstalleerd. Weet je wat er veranderd is, dan weet je ook waar je moet zoeken, en dat scheelt veel gepuzzel. Schrijf het op voordat je verder gaat, zodat je het later aan een helpdesk kunt vertellen.",
          },
          {
            kop: "Stap 2: vraag je hostingpartij om mee te kijken",
            tekst:
              "Kreeg je geen mail, of werkt de link niet? Neem dan contact op met je hostingpartij, de partij waar je elk jaar of elke maand voor je website betaalt. Dat is geen zwaktebod, het is de snelste route. Veel hosters maken elke dag automatisch een back-up en kunnen je site terugzetten naar gisteren, toen alles nog werkte. Ze kunnen ook in de foutlogboeken van de server kijken en zien dan vaak in één oogopslag welke plug-in de fout gooit. Vraag het zo concreet mogelijk: ‘mijn site geeft sinds vanochtend een kritieke fout, kunnen jullie zien waardoor, en is er een back-up van gisteren?’",
          },
          {
            kop: "Stap 3: zet alle plug-ins in één keer uit via het bestandsbeheer",
            tekst:
              "Dit is de bekende truc uit de WordPress-documentatie en hij is veilig, zolang je precies doet wat hier staat. Log in op het klantenpaneel van je hosting en open het bestandsbeheer (of gebruik een FTP-programma). Ga naar de map wp-content en zoek daarin de map plugins. Geef die map een andere naam, bijvoorbeeld plugins.uit. Daarmee staan alle plug-ins tegelijk uit, zonder dat er iets wordt verwijderd. Werkt je site nu weer, dan weet je dat het aan een plug-in ligt. Log in op je beheer, zet de map daarna terug naar de naam plugins en activeer de plug-ins één voor één. Kijk na elke plug-in even naar je site. Komt de fout terug, dan heb je de boosdoener gevonden. Laat die uit staan en zoek een bijgewerkte versie of een vervanger.",
          },
          {
            kop: "Stap 4: ligt het aan het thema?",
            tekst:
              "Hielp het uitzetten van de plug-ins niet, dan kan het thema de oorzaak zijn, zeker als dat net is bijgewerkt. Zelfde idee: ga in het bestandsbeheer naar wp-content en dan naar themes, en geef de map van je eigen thema tijdelijk een andere naam. WordPress valt dan terug op een standaardthema, als dat nog op je site staat. Je site ziet er dan even anders uit, maar je ziet wel of hij weer opent. Let op: heb je in de loop der jaren aanpassingen in je thema laten maken, zet de naam dan zeker weer terug en laat het repareren over aan wie dat thema kent.",
          },
          {
            kop: "Stap 5: de PHP-versie en het foutlogboek",
            tekst:
              "Is de fout begonnen zonder dat jij iets hebt bijgewerkt, dan kan de hostingpartij de PHP-versie hebben verhoogd. In het hostingpaneel kun je die versie meestal zelf kiezen. Even terugzetten kan je site weer aan de praat krijgen, maar zie het als noodverband: oude PHP-versies krijgen op den duur geen beveiligingsupdates meer, dus de echte oplossing is de oude plug-in bijwerken of vervangen. Wil je precies weten wat er misgaat, dan kun je in het bestand wp-config.php de regels voor WP_DEBUG en WP_DEBUG_LOG op true zetten. WordPress schrijft de fouten dan naar het bestand debug.log in de map wp-content. Dit is het technischste deel. Twijfel je bij wp-config.php, sla deze stap dan over: een typfout in dat bestand maakt de zaak erger.",
          },
          {
            kop: "Wanneer je moet stoppen en hulp vragen",
            tekst:
              "Stop als je merkt dat je gaat gokken. Bijvoorbeeld als je bestanden wilt verwijderen in plaats van hernoemen, als je in de database wilt gaan werken, als je geen back-up hebt en ook je hoster er geen heeft, of als je site al langer dan een dag plat ligt en er klanten op je wachten. Stop ook als je vreemde bestanden of onbekende plug-ins ziet: dan kan het een hack zijn en geen gewone fout, en dan gelden andere stappen, zie [wat te doen als je WordPress-site gehackt is](/wordpress-gehackt). Hulp vind je bij je hostingpartij, bij de webbouwer die je site gemaakt heeft of bij een onderhoudspartij. Wat zo’n partij doet en ongeveer kost, lees je bij [website laten onderhouden](/website-laten-onderhouden).",
          },
          {
            kop: "Hoe voorkom je het de volgende keer?",
            tekst:
              "Drie gewoontes maken het verschil. Zorg dat er altijd een recente back-up is die je zelf kunt terugzetten, niet alleen die van je hoster; hoe dat gratis kan lees je bij [een WordPress-back-up maken](/wordpress-backup-maken). Werk niet alles tegelijk bij: eerst één plug-in, even kijken, dan de volgende. Gaat het mis, dan weet je meteen welke het was. En ruim plug-ins op die je niet meer gebruikt, want elke plug-in is een extra kans op botsingen. Wordt je site ook steeds trager, dan hebben die twee problemen vaak dezelfde oorsprong; lees [waarom een WordPress-site traag wordt](/wordpress-website-traag).",
          },
          {
            kop: "Wil je dit nooit meer meemaken?",
            tekst:
              "Is dit de eerste keer, dan is het vaak met de stappen hierboven op te lossen en kun je gewoon verder met WordPress. Komt het vaker voor, of houd je niet van dit soort avonden, dan is er een andere route. WordSwap zet je bestaande site over naar een versie zonder WordPress: zelfde ontwerp, zelfde teksten, zelfde adressen in Google. Er draait dan geen PHP en er zijn geen plug-ins meer die bij een update kunnen botsen, dus dit soort fout bestaat bij die site niet. Dat betekent niet dat er nooit iets mis kan gaan, wel dat de hosting en techniek bij ons liggen. Je teksten pas je daarna aan door in een chat te typen wat er anders moet. De overstap kost eenmalig €150 tot €650, daarna vanaf €19 per maand, excl. btw. Lees meer bij [WordPress overzetten](/wordpress-overzetten) of bekijk de [prijzen](/prijzen).",
          },
        ],
        faq: [
          {
            vraag: "Ben ik mijn website kwijt door een kritieke fout?",
            antwoord:
              "Meestal niet. De fout zit bijna altijd in de code van een plug-in, thema of PHP-versie, terwijl je teksten en foto’s in de database en de uploadmap staan. Zodra de foute code is uitgezet, komt je site in de regel gewoon terug. Daarom is het belangrijk dat je niets verwijdert, maar alleen tijdelijk uitzet of hernoemt.",
          },
          {
            vraag: "Ik heb de herstelmail van WordPress niet gekregen, wat nu?",
            antwoord:
              "Die mail gaat naar het beheerdersadres dat bij de installatie is ingevuld. Dat kan een oud adres zijn, of het adres van je webbouwer. Kijk ook in je spam. Sommige hostingpakketten versturen mail van WordPress niet goed, dus het kan ook zijn dat hij nooit verstuurd is. Ga dan verder met stap 2: je hostingpartij vragen om mee te kijken.",
          },
          {
            vraag: "Waarom gaat mijn WordPress-site kapot na een update?",
            antwoord:
              "Een plug-in, thema en WordPress zelf worden door verschillende makers bijgewerkt, elk in hun eigen tempo. Past een nieuwe versie van het ene onderdeel niet bij een oudere versie van het andere, dan kan de pagina niet meer opgebouwd worden. Daarom is één voor één bijwerken, met een back-up vooraf, zo’n goed idee.",
          },
          {
            vraag: "Wat is het verschil tussen een wit scherm en deze foutmelding?",
            antwoord:
              "In de kern is het hetzelfde probleem: de code loopt vast. Nieuwere WordPress-versies vangen de fout op en tonen de melding over een kritieke fout, met een herstelmail. Bij oudere versies, of als de foutweergave is uitgezet, krijg je alleen een lege witte pagina. De stappen om het op te lossen zijn gelijk.",
          },
          {
            vraag: "Is het verstandig om automatische updates voor plug-ins aan te zetten?",
            antwoord:
              "Daar zijn de meningen over verdeeld. Automatische updates dichten beveiligingslekken sneller, maar je merkt pas dat er iets misging als je site al plat ligt. Zet je ze aan, zorg dan voor dagelijkse back-ups en kijk regelmatig even naar je site. Voor grote plug-ins, zoals een paginabouwer, kiezen veel beheerders ervoor om zelf te updaten.",
          },
          {
            vraag: "Kan een website zonder WordPress ook zo’n kritieke fout krijgen?",
            antwoord:
              "Deze specifieke fout niet, want die komt van PHP-code die bij elk bezoek draait, en dat heeft een site zonder WordPress niet. Er kan natuurlijk nog steeds iets misgaan, bijvoorbeeld bij de hosting of door een verkeerde wijziging. Bij WordSwap houden wij de techniek in de gaten, en zet je een eerdere versie van een pagina zelf terug.",
          },
        ],
      }}
    />
  );
}
