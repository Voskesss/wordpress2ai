import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";

// Noodpagina voor wie zijn webbouwer niet meer bereikt. Feiten gecheckt
// 14-10-2026: houder opzoeken via sidn.nl/whois (persoonsgegevens pas na
// akkoord op de voorwaarden, particulieren kunnen afgeschermd zijn; de
// whois toont registrar en soms een reseller), verhuistoken binnen vijf
// dagen + herinneringsbrief + escalatie via nieuwe registrar en SIDN
// (sidn.nl/en/nl-domain-name/transferring-your-domain-name). Huisregel
// domeinen: nooit stellig over waar of op wiens naam iets staat.
export const metadata: Metadata = {
  title: "Webbouwer reageert niet? Zo neem je het over",
  description:
    "Je webbouwer reageert niet meer? Zoek uit wie je domein, hosting en WordPress beheert, haal je toegang terug en stel je site alvast veilig.",
  alternates: { canonical: "/webbouwer-onbereikbaar" },
};

export default function Pagina() {
  return (
    <SeoLanding
      data={{
        slug: "webbouwer-onbereikbaar",
        label: "Webbouwer onbereikbaar",
        titel: "Je webbouwer reageert niet meer. Zo krijg je de regie terug.",
        intro:
          "Je wilt een telefoonnummer aanpassen, of er gaat iets mis met je site, en de webbouwer die alles voor je regelde neemt niet meer op. Mails blijven onbeantwoord. Misschien is hij gestopt, ziek of gewoon druk. Wat de reden ook is: je wilt weer zelf bij je eigen website kunnen. Dat lukt vaak, maar je moet eerst weten wat er precies is en bij wie het ligt. Deze pagina helpt je dat stap voor stap uit te zoeken, zonder dat je technisch hoeft te zijn.",
        blokken: [
          {
            kop: "Eerst rustig: je site werkt waarschijnlijk gewoon nog",
            tekst:
              "Een webbouwer die niet reageert, betekent niet dat je site morgen weg is. Zolang de hosting en de domeinnaam betaald worden, blijft hij meestal gewoon online. Het risico zit in de rekeningen die je niet ziet: als die bij de webbouwer binnenkomen en hij ze niet meer betaalt, kan je site of je domeinnaam na verloop van tijd verlopen. Je hebt dus tijd om het goed te doen, maar niet eindeloos. Stuur je webbouwer in elk geval één duidelijke mail met wat je nodig hebt en een redelijke termijn. Dat is netjes, en later handig als bewijs dat je het geprobeerd hebt.",
          },
          {
            kop: "Je website bestaat uit drie losse onderdelen",
            tekst:
              "Wat je ‘mijn website’ noemt, zijn eigenlijk drie dingen die vaak bij verschillende partijen liggen. De domeinnaam: je adres, zoals jouwbedrijf.nl. De hosting: de computer waar je site op staat, en waar vaak ook je e-mail draait. En de toegang tot WordPress zelf: het beheer waarin je teksten en foto’s staan. Per onderdeel kan de situatie anders zijn. Misschien staat de domeinnaam op jouw naam, maar zit de hosting in een pakket van de webbouwer. Maak daarom een lijstje met deze drie, en vul per onderdeel in wat je weet. Zet er een vierde bij: je e-mail, want die wil je bij een verhuizing zeker niet kwijtraken.",
          },
          {
            kop: "De domeinnaam: kijk op wiens naam hij staat",
            tekst:
              "Voor een .nl-adres zoek je dat op bij de Whois van SIDN, de organisatie die alle .nl-namen beheert: ga naar sidn.nl/whois en vul je domeinnaam in. Je ziet daar onder meer via welke partij de naam is geregistreerd, de registrar, en soms ook een tussenpersoon. Wie de houder is, zie je pas als je de gebruiksvoorwaarden van de Whois accepteert, en bij particulieren kunnen gegevens afgeschermd zijn. De houder is degene die zeggenschap heeft over de naam. Staat daar jouw naam of die van je bedrijf? Dan is dat een goed begin: dan blijft je domeinnaam van jou, waar hij ook staat. Voor andere extensies, zoals .com of .eu, heeft de beheerder van die extensie een eigen opzoekdienst.",
          },
          {
            kop: "Domein verhuizen: de verhuiscode",
            tekst:
              "Ben jij de houder, dan kun je de naam naar een andere registrar laten verhuizen. Daarvoor heb je een verhuiscode nodig, bij .nl heet dat het verhuistoken. Die vraag je aan bij de huidige registrar. Volgens SIDN moet de registrar je het token binnen vijf dagen geven als je erom vraagt. Gebeurt dat niet, dan kun je een herinnering sturen; SIDN heeft daar een voorbeeldbrief voor. Lukt het dan nog niet, dan kan je nieuwe registrar de oude namens jou benaderen, en als ook dat niets oplevert, kan die nieuwe registrar SIDN inschakelen. Je moet dan wel aantonen dat jij de houder bent, bijvoorbeeld met een legitimatiebewijs en een uittreksel van de KVK. Let op: zet bij een verhuizing de instellingen voor je website en e-mail goed, anders liggen die even plat.",
          },
          {
            kop: "Staat de domeinnaam op naam van de webbouwer?",
            tekst:
              "Dat komt vaker voor dan je zou denken, en dan moet het eerst geregeld worden. De houder kan alleen gewijzigd worden op verzoek van iemand die namens de huidige houder mag optreden. In dit geval is dat de webbouwer, dus je hebt zijn medewerking nodig. Vraag hem schriftelijk om de domeinnaam op jouw naam over te zetten, en verwijs naar je afspraken en facturen als je die hebt. Reageert hij niet of weigert hij, schakel dan iemand met juridische kennis in, bijvoorbeeld via je branchevereniging of rechtsbijstandsverzekering. Ga in de tussentijd niet zelf iets omzetten of opzeggen bij de registrar, want dan kan je adres onbereikbaar worden.",
          },
          {
            kop: "De hosting: wie betaalt de rekening?",
            tekst:
              "Kijk in je administratie of je zelf facturen krijgt van een hostingpartij. Zo ja, dan heb je waarschijnlijk een eigen account en kun je via die partij je wachtwoord herstellen of hulp vragen bij het inloggen. Betaal je alles aan de webbouwer, dan zit je site vaak in zijn eigen hostingpakket. Dan kan de hostingpartij jou meestal niet zomaar toegang geven, omdat het account niet van jou is. Je hebt dan de medewerking van de webbouwer nodig, of je zorgt dat je een volledige kopie van je site krijgt en die ergens anders neerzet. Weet je niet waar je site gehost wordt? Dat valt vaak op te zoeken; in de gratis websitecheck kijken wij mee.",
          },
          {
            kop: "Toegang tot WordPress terugkrijgen",
            tekst:
              "Probeer eerst de gewone weg: ga naar jouwdomein.nl/wp-admin en klik op ‘Wachtwoord vergeten’. Dat werkt als je een eigen account hebt met een mailadres waar je bij kunt. Heb je nooit een eigen account gehad, dan kan iemand met toegang tot de hosting een beheerdersaccount voor je aanmaken: dat is je eigen hostingpartij als het hostingaccount op jouw naam staat, en anders de webbouwer. Krijg je wel toegang, maak dan meteen een eigen beheerdersaccount aan op je eigen mailadres en maak een volledige back-up; hoe dat gratis gaat lees je bij [een WordPress-back-up maken](/wordpress-backup-maken).",
          },
          {
            kop: "Wat je nu al kunt veiligstellen",
            tekst:
              "Wacht niet tot alles is uitgezocht. Je site staat nu nog online, en alles wat je kunt zien, kun je ook bewaren. Kopieer de teksten van je belangrijkste pagina’s naar een document. Sla de foto’s op die je zelf hebt aangeleverd of waar je de rechten van hebt. Noteer welke pagina’s er zijn en wat de adressen zijn, want die zijn belangrijk voor je vindbaarheid in Google. Schrijf op welke mailadressen je gebruikt en hoe je contactformulier werkt. Dan heb je in het slechtste geval in elk geval de inhoud nog, ook als de site zelf ooit verdwijnt.",
          },
          {
            kop: "Afspraken voor de volgende keer",
            tekst:
              "Wie je site ook gaat beheren, leg een paar dingen vast. De domeinnaam staat op naam van jou of je bedrijf. Je hebt zelf een beheerdersaccount, ook als je er nooit in komt. Je weet bij welke partijen je hosting, domein en e-mail lopen, en wie de rekeningen betaalt. Je krijgt af en toe een complete kopie van je site, of weet waar je die kunt halen. En spreek af wat er gebeurt als de samenwerking stopt: hoe en binnen welke termijn je alles overgedragen krijgt. Dat voelt bij het begin wat ongemakkelijk, maar het voorkomt precies de situatie waar je nu in zit.",
          },
          {
            kop: "Hoe WordSwap je hierbij helpt",
            tekst:
              "WordSwap bouwt een kopie van je site rechtstreeks vanaf je live website. Daar hebben we geen inloggegevens voor nodig, en ook geen medewerking van je webbouwer: alleen je websiteadres. Je krijgt dezelfde site, met hetzelfde ontwerp, dezelfde teksten en dezelfde pagina-adressen, maar dan zonder WordPress. Daarna pas je hem zelf aan door in een chat te typen wat er anders moet, en hoef je voor een nieuw telefoonnummer nooit meer op iemand te wachten. Eén ding blijft: om je adres naar de nieuwe site te laten wijzen, heb je zeggenschap over je domeinnaam nodig. Daar zoeken we samen met je uit wat er moet gebeuren. De overstap kost eenmalig €150 tot €650, daarna vanaf €19 per maand, excl. btw. Meer bij [WordPress overzetten](/wordpress-overzetten) en [SEO bij de overstap](/seo-behoud), of [neem contact op](/contact).",
          },
        ],
        faq: [
          {
            vraag: "Hoe kom ik erachter bij wie mijn website gehost wordt?",
            antwoord:
              "Kijk eerst in je administratie: krijg je zelf facturen van een hostingpartij, dan is dat je antwoord. Betaal je alles aan je webbouwer, dan staat de hosting vaak bij een partij waar hij een pakket heeft. Met online opzoekdiensten is het vaak te achterhalen; lukt dat niet, dan kijken wij in de gratis websitecheck mee.",
          },
          {
            vraag: "Wat als mijn domeinnaam op naam van de webbouwer staat?",
            antwoord:
              "Dan heeft de webbouwer de zeggenschap en moet de houder gewijzigd worden. Dat kan alleen met medewerking van de huidige houder. Vraag het schriftelijk, verwijs naar je afspraken en facturen, en schakel bij weigering juridische hulp in. Zeg intussen niets op, zodat je adres bereikbaar blijft.",
          },
          {
            vraag: "Hoe lang heeft een registrar om mijn verhuistoken te geven?",
            antwoord:
              "Voor .nl-namen zegt SIDN dat je huidige registrar het token binnen vijf dagen moet geven als jij als houder erom vraagt. Blijft het uit, stuur dan een herinnering met de voorbeeldbrief van SIDN, of laat je nieuwe registrar de oude benaderen. Voor andere extensies gelden eigen regels.",
          },
          {
            vraag: "Kan mijn website gekopieerd worden zonder dat ik wachtwoorden heb?",
            antwoord:
              "Ja. WordSwap bouwt de kopie rechtstreeks vanaf je live site, met alleen je websiteadres. Je hoeft geen inloggegevens te delen en de webbouwer hoeft niets te doen. Voor het koppelen van je domeinnaam aan de nieuwe site heb je wel zeggenschap over die domeinnaam nodig.",
          },
          {
            vraag: "Zijn de teksten en het ontwerp van mijn website eigenlijk van mij?",
            antwoord:
              "Dat hangt af van wat je hebt afgesproken. Teksten en foto’s die je zelf hebt gemaakt of aangeleverd, zijn in de regel van jou. Het ontwerp en de code kunnen auteursrechtelijk bij de maker liggen, tenzij dat anders is afgesproken. Kijk in je offerte of voorwaarden, en vraag bij twijfel iemand met juridische kennis. Dit is geen juridisch advies.",
          },
          {
            vraag: "Wat gebeurt er met mijn e-mail als ik bij mijn webbouwer weg ga?",
            antwoord:
              "Dat hangt af van waar je mail nu draait. Zit die in het hostingpakket van de webbouwer, dan moet hij mee verhuizen voordat dat pakket stopt, anders kun je mail missen. Draait je mail ergens anders, bijvoorbeeld bij een aparte mailprovider, dan verandert er meestal niets. Zoek dit uit voordat je iets opzegt.",
          },
        ],
      }}
    />
  );
}
