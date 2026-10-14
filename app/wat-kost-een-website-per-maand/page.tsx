import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
import { aanbod } from "@/lib/aanbod";

// Informatieve zoekintentie: "wat kost een website per maand", "maandelijkse
// kosten website", "website onderhoud kosten". Marktbedragen zijn ranges uit
// openbare prijspagina's (oktober 2026) en blijven gelijk aan
// /website-laten-onderhouden (onderhoud €12,50 tot €25, wijzigingen €60 tot
// €95 per uur). WordSwap-bedragen komen uit lib/aanbod.ts.
export const metadata: Metadata = {
  title: "Wat kost een website per maand? Eerlijk overzicht",
  description:
    "Laat je je website regelen, dan betaal je meestal €20 tot €75 per maand. Bij WordSwap €19 of €39 per maand. Met een eerlijke rekensom over 3 jaar.",
  alternates: { canonical: "/wat-kost-een-website-per-maand" },
};

export default function Pagina() {
  return (
    <SeoLanding
      data={{
        slug: "wat-kost-een-website-per-maand",
        label: "Kosten per maand",
        titel: "Wat kost een website per maand? Het eerlijke antwoord.",
        intro:
          "Laat je de techniek voor je regelen, dan kost een gewone bedrijfswebsite meestal €20 tot €75 per maand, exclusief btw en e-mail. Bij WordSwap is dat €19 per maand voor het basispakket of €39 per maand voor Optimaal ontzorgd, met hosting, onderhoud, beveiliging en de AI-chat erin. Goedkoper kan alleen als je alles zelf doet: met een websitebouwer betaal je soms maar een paar euro per maand, maar dan bouw en onderhoud je de site zelf. Bovenaan de bandbreedte zit een WordPress-site waarvoor je hosting, een onderhoudspakket en af en toe een uur wijzigingen betaalt. Hieronder lees je per kostenpost wat je betaalt en waarom, en rekenen we vier routes door over drie jaar. Ook de route waarin WordSwap niet de goedkoopste is.",
        blokken: [
          {
            kop: "Domeinnaam: 5 tot 20 euro per jaar",
            tekst:
              "Een .nl-domeinnaam kost meestal ongeveer €5 tot €20 per jaar, afhankelijk van waar je hem registreert. Let vooral op de verlengprijs: het eerste jaar is vaak goedkoper of zelfs gratis bij een websitebouwer, daarna betaal je het normale tarief. Per maand is het dus zelden meer dan anderhalve euro. Wat belangrijker is dan de prijs: je domeinnaam blijft van jou, waar hij ook staat. Zorg dat je zelf weet waar hij geregistreerd is en hoe je erbij kunt, ook als je later van websitepartij wisselt.",
          },
          {
            kop: "Hosting: de plek waar je website staat",
            tekst:
              "Voor een WordPress-site heb je hosting nodig. Gedeelde hosting heeft lokkertjes vanaf een paar euro per maand in het eerste jaar, maar na de actieperiode betaal je voor een fatsoenlijk WordPress-pakket meestal €8 tot €15 per maand. Speciale managed WordPress-hosting, waarbij de hoster meer werk voor je doet, kan oplopen tot €50 per maand of meer. Bij een websitebouwer als Wix of JouwWeb en bij WordSwap zit hosting in het abonnement, dus daar betaal je hem niet apart.",
          },
          {
            kop: "E-mail op je eigen domein",
            tekst:
              "Een adres als info@jouwbedrijf.nl kost los van je website geld. Bij sommige hostingpakketten zit een simpele mailbox inbegrepen. Neem je een zakelijk pakket bij een grote mailprovider, dan betaal je meestal ongeveer €5 tot €8 per postbus per maand, met agenda en opslag erbij. Omdat je e-mail bij elke route ongeveer even veel kost, laten we hem in de rekensom hieronder buiten beschouwing. Let wel op bij een overstap: zit je mail in je huidige hostingpakket, kijk dan eerst waar die heen kan voordat je die hosting opzegt.",
          },
          {
            kop: "Onderhoud en updates",
            tekst:
              "Een WordPress-site moet regelmatig bijgewerkt worden: WordPress zelf, je thema en elke plug-in. Doe je dat zelf, dan kost het geen geld maar wel tijd, en af en toe een kapotte pagina na een update. Laat je het doen, dan betaal je in Nederland meestal €12,50 tot €25 per maand voor een onderhoudspakket. Wat je daarvoor krijgt en waar mensen op vastlopen, staat bij [website laten onderhouden](/website-laten-onderhouden). Bij een websitebouwer of bij een website zonder WordPress vallen deze updates weg.",
          },
          {
            kop: "Beveiliging en back-ups",
            tekst:
              "Bij WordPress zit beveiliging vaak in het onderhoudspakket of in duurdere hosting: een beveiligingsplug-in, een scan en dagelijkse back-ups. Doe je het zelf, dan zit er soms een betaalde plug-in tussen. Het grootste kostenrisico is niet het maandbedrag maar een hack: een site opschonen kost al snel een paar uur werk tegen uurtarief. Een site zonder database en plug-ins heeft die inbraakroutes niet, wat het risico flink verkleint. Lees meer bij [een alternatief voor WordPress](/wordpress-alternatief).",
          },
          {
            kop: "Wijzigingen laten doen: de verborgen post",
            tekst:
              "Dit is de post die mensen het vaakst vergeten. Een onderhoudspakket regelt de techniek, maar een nieuwe tekst, een andere foto of een extra pagina valt daar meestal buiten. Daarvoor betaal je per uur of met een strippenkaart, vaak €60 tot €95 per uur. Laat je vier keer per jaar een uur iets aanpassen, dan is dat al €240 tot €380 per jaar, oftewel €20 tot €32 per maand bovenop je pakket. Wie zelf wijzigingen kan doen, bespaart hier het meest.",
          },
          {
            kop: "Plug-in-licenties",
            tekst:
              "Veel WordPress-sites draaien op een of meer betaalde plug-ins, bijvoorbeeld een paginabouwer, een SEO-plug-in of een formulierenplug-in. Een premium licentie kost vaak ergens tussen de €50 en €120 per jaar per plug-in, en die moet je jaarlijks verlengen om updates te blijven krijgen. Met twee of drie van zulke licenties zit je zo op €10 tot €25 per maand. Gebruik je alleen gratis plug-ins, dan vervalt deze post.",
          },
          {
            kop: "Rekensom: vier routes over drie jaar",
            tekst:
              "We gaan uit van een kleine bedrijfssite die al bestaat, rekenen exclusief btw en laten e-mail weg. (a) Zelf WordPress met hosting en zelf onderhouden: hosting €290 tot €540, domein ongeveer €30, eventueel licenties tot €360. Totaal ongeveer €320 tot €930 over drie jaar, plus je eigen uren voor updates en het risico als het misgaat. (b) WordPress met een onderhoudspakket bij een bureau: hosting €290 tot €540, onderhoud €450 tot €900, domein €30 en vier uur wijzigingen per jaar à €60 tot €95, samen €720 tot €1.140. Totaal ongeveer €1.490 tot €2.610. (c) Een websitebouwer zoals Wix of JouwWeb: een betaald pakket met eigen domein kost ongeveer €5 tot €20 per maand, dus €180 tot €720 over drie jaar, plus de tijd om je site opnieuw op te bouwen en zelf bij te houden. (d) WordSwap: overstap eenmalig €150 tot €650 plus 36 maanden basispakket vanaf €19 is €684, met domein samen ongeveer €860 tot €1.360. Kleine wijzigingen doe je zelf in de chat. Kies je Optimaal ontzorgd voor €39 per maand, dan wordt het ongeveer €1.580 tot €2.080. Prijzen oktober 2026, check altijd bij de aanbieder.",
          },
          {
            kop: "Zo vergelijk je je eigen kosten eerlijk",
            tekst:
              "Pak de facturen van het afgelopen jaar erbij en tel alles bij elkaar: hosting, domein, onderhoudspakket, licenties en elke rekening voor een wijziging. Deel dat door twaalf en je weet wat je website je echt per maand kost. Vergelijk daarna niet alleen het maandbedrag, maar ook wat erin zit. Wie doet de updates? Wie betaalt als er iets misgaat? Hoe snel staat een nieuwe tekst online? En wat neem je mee als je stopt? Een goedkoop pakket met dure uurtjes kan duurder uitvallen dan een hoger maandbedrag waarin je wijzigingen zelf doet. Tel ook je eigen tijd mee: een uur per maand puzzelen met updates is voor een ondernemer ook geld.",
          },
          {
            kop: "Wanneer WordSwap niet de goedkoopste is",
            tekst:
              "Bouw je graag zelf, vind je een sjabloon prima en heb je geen tijd nodig voor wijzigingen, dan is een websitebouwer in geld goedkoper. Een gratis bouwer met reclame en zonder eigen domein kost zelfs niets. Ook wie WordPress goed kent en het onderhoud zelf trouw bijhoudt, is in euro's goedkoper uit, al betaal je met je tijd. WordSwap is vooral voordelig als je nu een onderhoudspakket betaalt en voor elke wijziging moet wachten of betalen, of als je je bestaande site wilt houden zonder alles opnieuw op te bouwen. Twijfel je wat voor jou het slimst is? [Stel je vraag aan Jos](/contact) en je krijgt een eerlijk antwoord, ook als dat ergens anders is. Onze eigen bedragen staan bij de [prijzen](/prijzen).",
          },
        ],
        faq: [
          {
            vraag: "Is website onderhoud aftrekbaar als zakelijke kosten?",
            antwoord:
              "Voor een ondernemer zijn de kosten van een website die je voor je bedrijf gebruikt in de regel zakelijke kosten. Maandelijkse posten zoals hosting en onderhoud boek je meestal als kosten in het jaar zelf; de eenmalige bouw kan soms anders verwerkt moeten worden. Dit is geen belastingadvies: vraag je boekhouder hoe het voor jouw situatie zit.",
          },
          {
            vraag: "Wat kost een simpele website per maand?",
            antwoord:
              "Voor een simpele site van een paar pagina's zit je met een betaalde websitebouwer meestal rond €5 tot €20 per maand, als je hem zelf bouwt en bijhoudt. Wil je dat iemand de techniek voor je regelt, dan begint het bij ongeveer €20 tot €40 per maand. Bij WordSwap is dat vanaf €19 per maand excl. btw, met hosting, beveiliging en de AI-chat erin.",
          },
          {
            vraag: "Wat gebeurt er als ik mijn website niet onderhoud?",
            antwoord:
              "Bij een WordPress-site raken WordPress, je thema en je plug-ins verouderd. Dat maakt je site kwetsbaar voor hacks, en na een tijd kunnen onderdelen stuk gaan als je hosting nieuwere software gaat draaien. Een gehackte site opschonen kost vaak meer dan jaren onderhoud. Bij een websitebouwer of een site zonder WordPress speelt dit veel minder, omdat er geen updates zijn die jij moet doen.",
          },
          {
            vraag: "Waarom is mijn hosting na het eerste jaar duurder?",
            antwoord:
              "Veel hosters en websitebouwers lokken met een lage prijs voor de eerste periode en rekenen daarna het normale tarief. Kijk bij het vergelijken daarom altijd naar de verlengprijs, want die betaal je de jaren erna. Hetzelfde geldt voor een domeinnaam die het eerste jaar gratis is.",
          },
          {
            vraag: "Kan een website ook helemaal gratis?",
            antwoord:
              "Ja, bij een gratis versie van een websitebouwer. Je krijgt dan meestal reclame van de bouwer op je site en een adres met hun naam erin, in plaats van je eigen domeinnaam. Voor een hobby is dat prima; voor een bedrijf oogt het minder professioneel en zit je vast aan dat platform.",
          },
          {
            vraag: "Moet ik voor zakelijke e-mail apart betalen?",
            antwoord:
              "Meestal wel, tenzij er een mailbox in je hostingpakket zit. Een zakelijk mailpakket kost ongeveer €5 tot €8 per postbus per maand. Bij WordSwap staat e-mail ook los van het pakket. Stap je over, dan kijken we eerst samen waar je mail nu draait, zodat je niet per ongeluk je mail opzegt met je oude hosting.",
          },
          {
            vraag: "Waarom kosten kleine tekstwijzigingen vaak zoveel?",
            antwoord:
              "Omdat ze buiten een onderhoudspakket vallen en per uur worden gerekend, vaak €60 tot €95 per uur, soms met een minimum van een kwartier of een half uur. Kun je wijzigingen zelf doen, dan vervalt die post. Bij WordSwap typ je wat er anders moet in een chat; wil je toch dat wij iets doen, dan is dat €15 per kwartier excl. btw.",
          },
          {
            vraag: "Wat kost het?",
            antwoord: aanbod.prijs,
          },
        ],
      }}
    />
  );
}
