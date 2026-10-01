import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
import { aanbod } from "@/lib/aanbod";
export const metadata: Metadata = {"title": "WordPress-site traag? De 7 oorzaken en wat je eraan doet", "description": "Afbeeldingen, plugins, caching, hosting, thema, database en PHP. Dit zijn de zeven oorzaken van een trage WordPress-site, hoe je ze meet en wat je eraan kunt doen.", "alternates": {"canonical": "/wordpress-website-traag"}};
export default function Pagina(){ return <SeoLanding data={{
  "label": "Trage WordPress-site",
  "titel": "WordPress-site traag? Dit zijn de zeven oorzaken.",
  "intro": "Een trage WordPress-site komt bijna altijd door dezelfde zeven dingen: te zware afbeeldingen, te veel plugins, geen caching, goedkope hosting, een zwaar thema, een volgelopen database en een oude PHP-versie. Hieronder staat per oorzaak hoe je hem herkent, hoe je hem meet en wat je eraan doet. Onderaan staat eerlijk wat er overblijft als je alles hebt gedaan en je site nog steeds werk blijft kosten.",
  "blokken": [
    {
      "kop": "Meet eerst, sleutel daarna",
      "tekst": "Voordat je iets verandert wil je weten wat er traag is. Zet je adres in Google PageSpeed Insights, dat is gratis en je hebt geen account nodig. Let vooral op de cijfers onder ‘Core Web Vitals’. LCP is hoe lang het duurt voor het grootste ding in beeld staat, meestal je koptekst of hoofdfoto; onder de 2,5 seconde is goed. CLS is hoeveel de pagina nog verspringt tijdens het laden. Kijk naar de score op mobiel, niet op desktop, want daar zijn de meeste bezoekers en daar is het verschil het grootst. Noteer je cijfers voordat je begint, anders weet je achteraf niet of je iets hebt opgelost."
    },
    {
      "kop": "1. Te zware afbeeldingen",
      "tekst": "Dit is de meest voorkomende oorzaak en meestal ook de makkelijkste winst. Een foto die rechtstreeks uit een camera of telefoon komt is al snel 3 tot 8 MB. Op je pagina wordt hij teruggeschaald naar een paar honderd pixels breed, maar de bezoeker downloadt nog steeds dat hele bestand. Tien van die foto’s op een pagina en je zit op 40 MB voor iets wat 400 kB had kunnen zijn. Wat je eraan doet: verklein foto’s vóór het uploaden tot de breedte die je echt gebruikt, en sla ze op als WebP in plaats van JPEG of PNG. Een plugin als Smush of Imagify kan het achteraf ook, maar voorkomen is minder gedoe dan repareren."
    },
    {
      "kop": "2. Te veel of te zware plugins",
      "tekst": "Elke plugin voegt code toe, en veel plugins laden hun scripts en stylesheets op élke pagina, ook waar ze niets doen. Een contactformulier-plugin die op je hele site meelaadt terwijl je één contactpagina hebt, is pure ballast. Wat je eraan doet: zet in je overzicht alle plugins op een rij die je het afgelopen jaar niet bewust hebt gebruikt, en verwijder ze. Niet deactiveren, echt verwijderen, want gedeactiveerde plugins blijven rommel in je database achterlaten. Wil je weten welke plugin precies traag is, dan laat Query Monitor dat per pagina zien."
    },
    {
      "kop": "3. Geen of verkeerd ingestelde caching",
      "tekst": "Zonder caching bouwt WordPress bij élk bezoek de pagina opnieuw op: database raadplegen, thema laden, plugins laten draaien, en dan pas versturen. Met caching wordt er één keer een kant-en-klare versie gemaakt die daarna gewoon wordt uitgeserveerd. Dat scheelt vaak het meest van alles. Wat je eraan doet: zet één goede cache-plugin aan, bijvoorbeeld WP Rocket of LiteSpeed Cache. Let op: nooit twee tegelijk. Dat is een klassieke fout die je site juist trager of kapot maakt, omdat ze elkaars werk overschrijven."
    },
    {
      "kop": "4. Goedkope gedeelde hosting",
      "tekst": "Op gedeelde hosting staat je site op een server met tientallen tot honderden andere websites, en je deelt het geheugen en de rekenkracht. Krijgt de buurman een piek, dan merk jij dat. Dit is de oorzaak die het minst zichtbaar is in je eigen dashboard en die het vaakst over het hoofd wordt gezien. Wat je eraan doet: kijk wat je nu betaalt. Zit je op een pakket van een paar euro per maand, dan is dat vrijwel zeker je bodem. Betere hosting kost meer, maar het is de enige van deze zeven die je niet met een plugin kunt oplossen."
    },
    {
      "kop": "5. Een zwaar thema of pagebuilder",
      "tekst": "Pagebuilders als Elementor, Divi en WPBakery maken het bouwen makkelijk, maar ze verpakken elk tekstblok in vier of vijf lagen HTML en laden hun eigen scripts op elke pagina. Een site die met een pagebuilder is gemaakt is standaard twee tot drie keer zo zwaar als dezelfde site in een licht thema. Wat je eraan doet: dit is helaas de lastigste, want je site opnieuw opbouwen in een lichter thema is een flinke klus. Zit je met een pagebuilder, zet die dan op de lijst voor de volgende keer dat je site toch vernieuwd wordt."
    },
    {
      "kop": "6. Een volgelopen database",
      "tekst": "WordPress bewaart veel meer dan je ziet. Van elk bericht blijven alle oude versies staan, spamreacties blijven in de prullenbak hangen, en plugins laten tijdelijke gegevens achter die nooit worden opgeruimd. Na een paar jaar kan je database tien keer zo groot zijn als nodig, en elke paginaopbouw moet daar doorheen. Wat je eraan doet: ruim op met WP-Optimize of de opruimfunctie van je cache-plugin. Maak eerst een reservekopie, dit is het soort opruimen waarbij je niets terug kunt draaien."
    },
    {
      "kop": "7. Een verouderde PHP-versie",
      "tekst": "PHP is de taal waarin WordPress draait, en nieuwere versies zijn simpelweg sneller. Het verschil tussen PHP 7.4 en PHP 8.3 is al gauw dertig tot vijftig procent. Erger nog: PHP 7.4 krijgt sinds eind 2022 geen beveiligingsupdates meer, dus het is ook een risico. Wat je eraan doet: kijk in WordPress onder Extra, Sitestatus welke versie je draait. Staat daar iets dat begint met 7, dan kun je dat bij je hostingpartij omzetten, meestal met één knop. Test daarna wel of alles het nog doet, want heel oude plugins kunnen op een nieuwe PHP-versie struikelen."
    },
    {
      "kop": "En dan? De vraag die niemand stelt",
      "tekst": "Stel dat je dit alles doet. Foto’s verkleind, plugins opgeschoond, caching aan, betere hosting, database opgeruimd, PHP bijgewerkt. Je site is sneller, en terecht. Maar over een half jaar staat er weer een plugin bij omdat je een nieuw formulier nodig had, zijn er dertig berichten geplaatst met foto’s uit de telefoon, en is je database weer volgelopen. Dan doe je het rondje opnieuw. Dat is geen falen van jou, dat is hoe WordPress werkt: het bouwt elke pagina opnieuw op bij elk bezoek, en alles wat je toevoegt maakt dat werk zwaarder. Caching is daar een pleister op."
    },
    {
      "kop": "De andere route: het probleem weghalen",
      "tekst": aanbod.omschrijving
    },
    {
      "kop": "Moet ik overstappen om sneller te worden?",
      "tekst": "Nee, en dat willen we eerlijk zeggen. Werk eerst die zeven punten af. Voor veel sites is dat genoeg en ben je klaar. Overstappen is interessant als snelheid niet je enige probleem is: als je ook niet meer aan updates wilt denken, als je nu voor elke wijziging iemand moet mailen, of als je bang bent om zelf iets kapot te maken. Dan los je met één overstap meerdere dingen tegelijk op. Is snelheid je enige zorg, dan is een middag optimaliseren goedkoper."
    },
    {
      "kop": "Wat betekent dit voor zoekmachines?",
      "tekst": aanbod.seo
    }
  ],
  "slug": "wordpress-website-traag",
  "faq": [
    {
      "vraag": "Hoe meet ik of mijn website echt traag is?",
      "antwoord": "Zet je adres in Google PageSpeed Insights, gratis en zonder account. Kijk naar het tabblad voor mobiel en naar de Core Web Vitals, vooral LCP: dat is hoe lang het duurt voor het grootste element in beeld staat. Onder de 2,5 seconde is goed, boven de 4 seconden haken bezoekers af. Meet een paar keer op verschillende momenten, want één meting zegt weinig."
    },
    {
      "vraag": "Waarom is een WordPress-site vaak traag?",
      "antwoord": "Bij elk bezoek moet WordPress de pagina eerst nog bouwen: database raadplegen, thema en plugins laden, en dan pas versturen. Elke plugin doet daar een schepje bovenop. Cache-plugins verzachten dat, maar blijven een pleister op een systeem dat per bezoek werk doet."
    },
    {
      "vraag": "Is een cache-plugin niet genoeg?",
      "antwoord": "Vaak scheelt het veel, en het is meestal het eerste dat je moet doen. Maar caching lost de oorzaak niet op, het verbergt hem. Je foto’s blijven te zwaar, je plugins blijven meeladen en je database blijft vollopen. En voor bezoekers die als eerste op een pagina komen, of op pagina’s die vaak veranderen, werkt de cache niet of nauwelijks. Belangrijk: gebruik er nooit twee tegelijk."
    },
    {
      "vraag": "Hoeveel sneller wordt mijn site bij WordSwap?",
      "antwoord": "Je pagina’s staan bij ons kant-en-klaar op een wereldwijd netwerk, dus de bouwtijd per bezoek vervalt helemaal, en je foto’s krijgen automatisch snelle formaten voor telefoons. We meten het eerlijk: vóór de overstap en erna, met dezelfde meetlat (Google Lighthouse), en je ziet beide cijfers. Harde beloftes vooraf doen we niet, want elke site is anders."
    },
    {
      "vraag": "Helpt een snellere site ook voor Google?",
      "antwoord": "Ja. Snelheid telt mee in de ranglijst van Google, vooral op telefoons. En belangrijker: bezoekers haken af bij trage pagina’s, dus elke seconde winst is ook gewoon meer mensen die je verhaal echt lezen."
    },
    {
      "vraag": "Wat kost de overstap?",
      "antwoord": aanbod.prijs
    }
  ]
}} />; }
