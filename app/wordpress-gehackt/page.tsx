import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";

// Noodpagina voor een gehackte WordPress-site. Feiten gecheckt 14-10-2026:
// Search Console-rapport "Beveiligingsproblemen" + "Beoordeling aanvragen"
// (support.google.com/webmasters/answer/9044101), Sucuri SiteCheck is een
// scanner van buitenaf (sitecheck.sucuri.net), Wordfence scant core, thema's
// en plug-ins (wordpress.org/plugins/wordfence), meldplicht datalekken binnen
// 72 uur na ontdekking (autoriteitpersoonsgegevens.nl, meldplicht-datalekken).
// Bewust geen juridisch advies en nooit "onhackbaar".
export const metadata: Metadata = {
  title: "WordPress gehackt? Dit doe je, in deze volgorde",
  description:
    "Website gehackt? Herken de signalen en volg de stappen: niets wissen, hoster bellen, wachtwoorden, scannen, schone back-up, Google en daarna dichtzetten.",
  alternates: { canonical: "/wordpress-gehackt" },
};

export default function Pagina() {
  return (
    <SeoLanding
      data={{
        slug: "wordpress-gehackt",
        label: "WordPress gehackt",
        titel: "Je WordPress-site is gehackt. Dit doe je, in deze volgorde.",
        intro:
          "Een gehackte website voelt als een inbraak, en zo moet je het ook aanpakken: eerst rustig vaststellen wat er is gebeurd, dan de deuren op slot, dan opruimen. Deze pagina loopt de stappen met je door in een volgorde die veilig is, ook als je geen techneut bent. Bij elke stap staat wat je zelf kunt doen en wanneer je beter iemand inschakelt. Er zijn geen garanties bij een hack, maar met deze volgorde maak je het in elk geval niet erger.",
        blokken: [
          {
            kop: "Hoe zie je dat je site gehackt is?",
            tekst:
              "Een hack is lang niet altijd zichtbaar op je voorpagina. Let op deze signalen. Bezoekers worden doorgestuurd naar een andere site, soms alleen als ze via Google of op hun telefoon binnenkomen, zodat jij er zelf niets van merkt. In Google verschijnen pagina’s van jouw site met teksten over pillen, casino’s of in een vreemde taal; typ eens site:jouwdomein.nl in Google en kijk wat er voorbijkomt. Je browser of die van een klant toont een rode waarschuwing bij je site. Je hostingpartij meldt dat je site spam verstuurt of zet hem uit. In je WordPress staan beheerders of plug-ins die je niet kent. Of je kunt ineens niet meer inloggen. Eén signaal kan toeval zijn, twee of meer is reden om de stappen hieronder te volgen.",
          },
          {
            kop: "Eerst: geen paniek, en niets wissen",
            tekst:
              "De eerste neiging is alles weggooien wat er vreemd uitziet. Doe dat nog niet. Verwijderde bestanden en accounts zijn ook sporen: daaraan kan iemand later zien hoe de inbreker binnenkwam en wanneer. Schrijf op wat je ziet, met datum en tijd, en maak schermafbeeldingen. Maak als het kan een kopie van de site zoals hij nu is, gehackt en wel, en bewaar die apart. Niet om terug te zetten, maar als bewijs en om te onderzoeken. Zet je site eventueel tijdelijk offline, of vraag je hoster dat te doen, zodat bezoekers geen schade oplopen.",
          },
          {
            kop: "Bel je hostingpartij",
            tekst:
              "Je hoster is bij een hack je belangrijkste bondgenoot. Die kan in de logboeken van de server zien wat er is gebeurd, heeft vaak eigen scanners en houdt meestal back-ups bij van de afgelopen dagen of weken. Soms heeft de hoster je site zelf al stilgezet omdat er spam vanaf kwam. Vertel wat je hebt gezien en vraag drie dingen: kunnen jullie zien hoe ze binnenkwamen, welke back-ups zijn er en van welke datum, en kunnen jullie meekijken bij het opschonen. Heeft een webbouwer of onderhoudspartij je site in beheer, schakel die dan tegelijk in.",
          },
          {
            kop: "Verander al je wachtwoorden, en wel allemaal",
            tekst:
              "Ga ervan uit dat de inbreker je wachtwoorden kent. Verander ze daarom allemaal, niet alleen dat van WordPress. Het gaat om: elk beheerdersaccount in WordPress, het klantenpaneel van je hosting, de FTP- of SFTP-toegang, de database en het mailaccount dat aan je site gekoppeld is. Het databasewachtwoord moet ook in het bestand wp-config.php worden aangepast, anders gaat je site plat; laat dat deel gerust aan je hoster over. Gebruik voor elk account een ander, lang wachtwoord en doe dit vanaf een computer waarvan je zeker weet dat hij schoon is. Kijk daarna in WordPress bij Gebruikers welke beheerders er zijn. Ken je er een niet, noteer dan de gegevens en haal het account daarna weg.",
          },
          {
            kop: "Scan je site, maar vertrouw niet blind op één scan",
            tekst:
              "Er zijn twee soorten scanners. Een scanner van buitenaf, zoals de gratis Sucuri SiteCheck, bekijkt je site zoals een bezoeker hem ziet en vindt bijvoorbeeld kwaadaardige doorverwijzingen en of je op een zwarte lijst staat. Hij kan niet in de bestanden op de server kijken, dus een schone uitslag zegt niet alles. Een scanner binnenin WordPress, zoals de plug-in Wordfence, vergelijkt de bestanden van WordPress, je thema en je plug-ins met de originele versies en zoekt naar bekende kwaadaardige code. Doe het allebei en bewaar de uitslag. Vinden ze iets, dan weet je waar je moet zoeken. Vinden ze niets terwijl je wel signalen ziet, laat dan iemand met verstand van zaken meekijken.",
          },
          {
            kop: "Zet een schone back-up terug",
            tekst:
              "De betrouwbaarste weg terug is een back-up van vóór de hack. Het lastige is weten wanneer de hack begon: inbrekers zitten soms weken stil voordat ze iets doen. Kies daarom een back-up van ruim vóór het eerste signaal, en reken erop dat je de wijzigingen van daarna opnieuw moet doen. Werk direct na het terugzetten WordPress, je thema en al je plug-ins bij. Doe je dat niet, dan zet je ook het gat terug waardoor ze binnenkwamen. Heb je geen bruikbare back-up, dan moet de site handmatig opgeschoond worden; dat is werk voor een specialist. Een eigen kopie hebben voor de volgende keer? Lees [hoe je een WordPress-back-up maakt](/wordpress-backup-maken).",
          },
          {
            kop: "Laat Google weten dat het opgelost is",
            tekst:
              "Heeft Google de hack opgemerkt, dan zie je dat in Google Search Console bij het rapport Beveiligingsproblemen. Daar staat bijvoorbeeld of er gehackte inhoud of malware is gevonden. Heb je nog geen Search Console, dan kun je je site er gratis aanmelden. Is alles opgeschoond en getest, klik dan in dat rapport op Beoordeling aanvragen en beschrijf kort wat het probleem was en wat je hebt gedaan. Vraag het pas aan als echt alles schoon is, en dien niet meerdere verzoeken tegelijk in. Spampagina’s die in Google zijn beland, verdwijnen daarna niet meteen; dat kan even duren.",
          },
          {
            kop: "Daarna: zet de deuren op slot",
            tekst:
              "Veel WordPress-hacks komen binnen via een verouderde plug-in of thema, of via een zwak of gelekt wachtwoord. Werk daarom WordPress, thema en plug-ins voortaan bij zodra er een update is. Verwijder plug-ins en thema’s die je niet gebruikt; uitgeschakeld is niet genoeg, ook die bestanden staan nog op de server. Zet tweestapsverificatie aan voor elke beheerder, zodat een wachtwoord alleen niet genoeg is om binnen te komen. Geef niet meer mensen beheerdersrechten dan nodig. En zorg voor automatische back-ups die je zelf kunt terugzetten. Wil je dit niet zelf bijhouden, lees dan wat [website laten onderhouden](/website-laten-onderhouden) inhoudt.",
          },
          {
            kop: "Kunnen er persoonsgegevens gelekt zijn?",
            tekst:
              "Denk ook even verder dan je website. Kwamen er via je contactformulier, nieuwsbrief, offerteaanvragen of een klantomgeving gegevens van mensen binnen, dan kan de inbreker die hebben ingezien. Dan is er mogelijk sprake van een datalek. Volgens de Autoriteit Persoonsgegevens moet je een datalek binnen 72 uur na ontdekking melden als het waarschijnlijk een risico is voor de mensen van wie de gegevens zijn. Is dat risico niet waarschijnlijk, dan hoeft melden niet, maar leg je het lek wel vast in je eigen administratie. Bij een hoog risico moet je de betrokkenen soms ook zelf informeren. Dit is geen juridisch advies: lees de uitleg op autoriteitpersoonsgegevens.nl of vraag iemand die er verstand van heeft, en wacht daar niet te lang mee.",
          },
          {
            kop: "Een site zonder inlogpagina en plug-ins",
            tekst:
              "Is je site eenmaal schoon, dan is de vraag: hoe groot is de kans dat het opnieuw gebeurt? Bij WordPress blijft dat een kwestie van bijhouden. Er is ook een andere route. WordSwap zet je site over naar een versie zonder WordPress: kant-en-klare pagina’s, zonder database, zonder PHP en zonder plug-ins. Er is dan geen inlogpagina op je site waar bots wachtwoorden op uitproberen, en geen plug-ins met lekken. Onhackbaar bestaat niet, voor geen enkele website, maar de inbraakroutes waar de meeste gehackte WordPress-sites op sneuvelen, zijn dan weg. Hoe dat zit, lees je bij [veiligheid en controle](/veiligheid). De overstap kost eenmalig €150 tot €650, daarna vanaf €19 per maand, excl. btw. Zet je site wel eerst helemaal schoon voordat je overstapt.",
          },
        ],
        faq: [
          {
            vraag: "Hoe zie ik of mijn website gehackt is?",
            antwoord:
              "Let op doorverwijzingen naar andere sites, vreemde pagina’s in Google (zoek op site:jouwdomein.nl), een waarschuwing in de browser, een melding van je hoster of van Google Search Console, en onbekende beheerders of plug-ins in WordPress. Sommige hacks zie je alleen als bezoeker via Google of op je telefoon, dus kijk ook eens vanaf een ander apparaat.",
          },
          {
            vraag: "Hoe kan een kleine website nou gehackt worden?",
            antwoord:
              "Bijna nooit doordat iemand het speciaal op jou gemunt heeft. Er draaien de hele dag geautomatiseerde programma’s die miljoenen sites afgaan op zoek naar bekende lekken in plug-ins en zwakke wachtwoorden. Een kleine site met een verouderde plug-in is voor zo’n programma net zo interessant als een grote, bijvoorbeeld om spam te versturen of bezoekers door te sturen.",
          },
          {
            vraag: "Kan ik een gehackte site niet gewoon opschonen met een plug-in?",
            antwoord:
              "Een beveiligingsplug-in kan veel vinden en soms ook opruimen, maar een inbreker die al binnen is, kan dingen achterlaten die de plug-in niet ziet, zoals een verborgen achterdeur of een extra beheerdersaccount. Gebruik zo’n plug-in daarom als hulpmiddel naast de andere stappen: wachtwoorden wijzigen, een schone back-up terugzetten en alles bijwerken.",
          },
          {
            vraag: "Waarom zie ik zelf niets, terwijl klanten raar worden doorgestuurd?",
            antwoord:
              "Veel hacks zijn zo gemaakt dat de eigenaar ze niet opmerkt. Ze sturen bijvoorbeeld alleen bezoekers door die via Google of op een telefoon binnenkomen, of slaan ingelogde beheerders over. Kijk daarom in een privévenster, op je telefoon via mobiel internet, en laat iemand anders je site eens via Google openen.",
          },
          {
            vraag: "Moet ik mijn website na een hack helemaal opnieuw laten bouwen?",
            antwoord:
              "Niet per se. Met een schone back-up en de stappen op deze pagina is een site vaak weer goed te krijgen. Opnieuw opbouwen ligt meer voor de hand als er geen bruikbare back-up is, als de hack telkens terugkomt, of als de site al jaren niet is bijgewerkt. Dan is het een goed moment om ook naar de techniek eronder te kijken.",
          },
          {
            vraag: "Is een website zonder WordPress onhackbaar?",
            antwoord:
              "Nee, dat kan niemand eerlijk beloven. Wel valt er bij een site zonder WordPress veel minder aan te vallen: geen inlogpagina op de site zelf, geen plug-ins en geen database. De hosting en beveiliging eromheen houden wij bij WordSwap in de gaten en up-to-date.",
          },
        ],
      }}
    />
  );
}
