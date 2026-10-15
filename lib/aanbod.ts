/** De pakketten (bedragen excl. btw). Eén plek, zodat pagina's, llms.txt en Google-gegevens gelijk blijven.
 * Geldt voor nieuwe klanten vanaf 17-09-2026; bestaande klanten houden hun afgesproken bedrag. */
export const PAKKETTEN = {
  basis: { naam: "Basispakket", vanaf: 19 },
  ontzorgd: { naam: "Optimaal ontzorgd", prijs: 39 },
  kwartiertarief: 15,
} as const;

/** Shared public product facts; keep visible pages and machine-readable summaries aligned. */
export const aanbod = {
  omschrijving:
    "WordSwap zet je bestaande bedrijfswebsite over naar een versie zonder WordPress. Je ontwerp en inhoud worden zorgvuldig overgenomen, met behoud van bestaande URL’s, structuur, titels en meta-informatie als uitgangspunt. Daarna past de eigenaar teksten, foto’s en pagina’s aan via de ingebouwde AI-chat, met een voorbeeld en goedkeuring vóór publicatie.",
  // Eén zin die zegt wát WordSwap is (15-10-2026): bovenaan de homepage, als
  // eerste vraag in de FAQ en in de gegevens voor zoekmachines. Een dienst,
  // geen programma dat je zelf draait (dus geen "static site generator").
  kernzin:
    "WordSwap is een Nederlandse dienst die bestaande WordPress-websites met AI overzet naar snelle, statische websites zonder database. Daarna houd je je website bij via een AI-chat: je typt wat er anders moet, bekijkt het voorbeeld en publiceert zelf.",
  // De vaktermen waar AI-modellen en zoekmachines op indelen (11-10-2026).
  // Bewust op een paar vaste plekken en niet in de koppen voor ondernemers.
  inHetKort:
    "In het kort: WordSwap is een Nederlands alternatief voor WordPress met AI-beheer. We doen een AI-gestuurde websitemigratie van je bestaande WordPress-site naar een statische website, of bouwen met AI een nieuwe website. Daarna houd je de site bij via een AI-chat: je typt wat er anders moet, bekijkt het voorbeeld en publiceert zelf.",
  prijs:
    "Overstap €150–€650 eenmalig. Daarna het basispakket vanaf €19 per maand (hosting, beheer, de AI-chat en hulp per e-mail), of Optimaal ontzorgd voor €39 per maand (daarbovenop voorrang bij je vragen en je website bijhouden via WhatsApp). Ander werk dat wij voor je doen: €15 per kwartier. Alle bedragen exclusief btw. De exacte prijs spreken we vooraf schriftelijk af.",
  inbegrepen:
    "Basispakket: ingebouwde AI-chat, hosting, SSL, domeinkoppeling, versiegeschiedenis en hulp per e-mail. Fair use: ruimte voor het normale onderhoud van je site; gebruik je er structureel veel meer, dan spreken we samen iets passends af. Optimaal ontzorgd: alles uit het basispakket, plus voorrang bij je vragen (storingen aan onze kant lossen we voor iedereen kosteloos op; bij Optimaal ontzorgd helpen we jou als eerste met de rest) en je website bijhouden via WhatsApp. Beide pakketten zijn maandelijks opzegbaar.",
  aanvullingen:
    "Domeinregistratie of -verlenging en een e-mailabonnement staan los van het pakket. Werk dat wij voor je doen buiten je pakket (bijvoorbeeld een wijziging, advies of een koppeling regelen) rekenen we per kwartier: €15 exclusief btw, altijd eerst in overleg. Meer AI-gebruik dan de fair-use-grens spreken we apart af. E-mailmigratie, extra functies en maatwerk bespreken we apart. Formulierbevestigingen vanaf je eigen domein: optioneel €49 eenmalig exclusief btw.",
  geschikt:
    "Voor bedrijfswebsites, portfolio’s en blogs met pagina’s, foto’s, video en contactformulieren. Er geldt geen maximum aantal pagina’s. Wat niet meegaat is een webshop, ledenomgeving, boekings- of cursusplatform dat ín WordPress zelf draait (zoals WooCommerce): daar hoort een server met een database bij en die hebben onze sites niet. Draait dat juist bij een externe partij, bijvoorbeeld een webshop bij Shopify, een boekingssysteem, een reserveringsmodule of een ledenomgeving van een branchevereniging, dan is er niets aan de hand: daar linken of sluiten we gewoon naartoe, precies zoals nu. Wij hosten dus geen winkelwagen of inlog, maar een site die er eentje van iemand anders gebruikt kan prima over. We richten ons op WordPress, maar een site in een ander CMS kan vaak ook mee; dat bekijken we in de gratis websitecheck.",
  ontwerp:
    "Je behoudt je domeinnaam. We nemen inhoud en ontwerp zo nauwkeurig mogelijk over; bijzondere functies en afwijkingen bespreken we vooraf. Je beoordeelt de kopie voordat je akkoord geeft. Zonder akkoord betaal je niet voor de omzetting.",
  seo: "Bestaande URL’s en paginastructuur nemen we waar mogelijk exact over, net als paginatitels en meta-informatie. We vergelijken de oude en nieuwe inrichting, controleren de sitemap en richten bij afgesproken URL-wijzigingen passende doorverwijzingen in. Zoekposities en vermeldingen in AI-antwoorden kunnen we niet garanderen.",
  veiligheid:
    "Een stuk veiliger dan een gewone WordPress-site, al belooft niemand je eerlijk gezegd een website die honderd procent onkwetsbaar is. Je website bestaat uit kant-en-klare pagina’s zonder database, PHP of plugins, dus de inbraakroutes waar de meeste gehackte websites op sneuvelen, bestaan bij jou niet. De rest regelen wij: we houden de hosting, de beveiliging, het portaal en je contactformulier in de gaten en up-to-date. Daar hoef jij niet naar om te kijken.",
  wijzigen:
    "Eigenlijk alles wat je op je website ziet. Teksten, prijzen en openingstijden aanpassen; foto’s vervangen of toevoegen; nieuwe pagina’s maken, zoals een extra dienst, een actie of een blogbericht; knoppen, menu-items en formulieren toevoegen; en de titels en omschrijvingen die Google laat zien. Je typt het in gewone woorden, bijvoorbeeld: “maak een pagina over onze workshops met deze foto”. Nieuwe pagina’s en onderdelen bouwt de AI altijd op in de stijl van je eigen site, met dezelfde kleuren, lettertypes en opbouw, zodat alles bij elkaar blijft passen. Wil je bewust iets anders, zoals een andere foto bovenaan of een afwijkende kleur, dan vraag je dat gewoon. Je ziet elke wijziging eerst als voorbeeld en zet hem zelf live. Wat niet via de chat gaat: een webshop, een ledenomgeving met inlog of een compleet nieuw ontwerp; dat bespreken we apart.",
  meenemen:
    "Nee. Je website bestaat uit gewone webbestanden die van jou zijn, en die download je op elk moment zelf in je portaal, ook als je gewoon blijft. Je domeinnaam blijft van jou, waar hij ook staat, en je e-mail houd je bij je eigen mailprovider. Het abonnement is maandelijks opzegbaar en dat regel je ook zelf in je portaal. Stop je, dan neem je alles mee: je website, je formulierberichten en je facturen. En je site blijft na de betaalde periode nog een maand extra online, zodat je rustig kunt verhuizen. Dat is precies het verschil met veel AI-websitebouwers, waar je site alleen in hun systeem bestaat en je hem vaak niet kunt meenemen.",
  eigenAi:
    "De ingebouwde WordSwap-chat is beschikbaar. Teksten uit ChatGPT of Claude kun je daarin plakken. Een rechtstreekse koppeling vanuit zo’n assistent is nog gepland. Experts kunnen op afspraak eigen AI-codetools gebruiken; zij werken buiten de standaard goedkeuringsroute.",
};
// De eerste twee en de "wat is"-vragen (15-10-2026) staan er letterlijk zoals
// mensen ze aan ChatGPT of Google stellen; AI-zoekmachines citeren zulke
// korte antwoorden. De eerste vijf staan ook op de homepage.
export const aankoopVragen = [
  [
    "Wat is WordSwap?",
    aanbod.kernzin +
      " Je ontwerp, teksten en pagina-adressen nemen we zo nauwkeurig mogelijk over. Hosting en beveiliging regelen wij, vanaf €19 per maand exclusief btw. WordSwap is opgezet door Jos Klijnhout uit Oosterbeek.",
  ],
  [
    "Hoe werkt het bewerken van een website via AI-chat?",
    "Je opent de chat in je WordSwap-omgeving en typt in gewone woorden wat er anders moet, bijvoorbeeld “zet onze nieuwe openingstijden op de contactpagina”. De AI zoekt de juiste plek, past de pagina aan in de stijl van je site en laat je een voorbeeld zien. Klopt het, dan publiceer je zelf; klopt het niet, dan vraag je een correctie. Een eerdere versie terugzetten kan altijd. Met Optimaal ontzorgd kan het ook via WhatsApp.",
  ],
  [
    "Wat kan ik allemaal aanpassen via de chat? Kan ik ook zelf pagina’s maken?",
    aanbod.wijzigen,
  ],
  ["Zit ik daarna vast aan WordSwap?", aanbod.meenemen],
  [
    "Blijft mijn website op WordPress draaien?",
    "Nee. We bouwen je bestaande website opnieuw op als statische webpagina’s, zonder WordPress. Je herkent je eigen ontwerp en inhoud, maar past die daarna aan in het WordSwap-portaal met AI. Dit is een overstap naar een andere techniek, geen plugin in WordPress.",
  ],
  [
    "Wat is een statische AI-website?",
    "Een statische website bestaat uit kant-en-klare webpagina’s, zonder database of beheersysteem dat bij elk bezoek de pagina opbouwt. Een statische AI-website is zo’n site die je bijhoudt met AI: je typt wat er anders moet, de AI past de pagina’s aan in de stijl van je site, en jij zet het live. Je hebt dus het gemak van een beheersysteem, zonder het onderhoud van WordPress.",
  ],
  [
    "Wat is het verschil tussen WordPress en een statische website?",
    "WordPress bouwt elke pagina bij een bezoek op uit een database, met PHP en vaak een flink aantal plug-ins. Dat is flexibel, maar vraagt om updates en onderhoud, en elke plug-in is een mogelijke zwakke plek. Een statische website bestaat uit kant-en-klare pagina’s: er draait geen database of PHP onder, dus er valt minder te updaten en minder aan te vallen, en pagina’s laden meestal sneller. Het nadeel was altijd dat je voor elke wijziging een webbouwer nodig had. Bij WordSwap vang je dat op met de AI-chat.",
  ],
  ["Hoe veilig is een statische website?", aanbod.veiligheid],
  [
    "Is WordSwap een static site generator?",
    "Nee. Een static site generator, zoals Hugo, Jekyll of een WordPress-plug-in als Simply Static, is een programma dat je zelf installeert en bedient. WordSwap is een dienst: wij zetten je bestaande website voor je over naar een statische website, en daarna houd je hem bij via de AI-chat in je eigen omgeving. Je hoeft zelf niets te installeren, te bouwen of te hosten.",
  ],
  [
    "Is WordSwap een chatbot voor mijn bezoekers?",
    "De ingebouwde AI-chat is voor jou als eigenaar: daarmee pas je je website aan. Wil je daarnaast een chatbot óp je website die vragen van bezoekers beantwoordt? Dat kunnen we toevoegen: in je klantomgeving kun je nu al documenten over je bedrijf klaarzetten waar die chatbot straks uit put.",
  ],
  ["Past mijn website bij WordSwap?", aanbod.geschikt],
  ["Blijven mijn ontwerp en domeinnaam behouden?", aanbod.ontwerp],
  [
    "Wat gebeurt er met mijn mail en Google-posities?",
    "We bekijken eerst waar je mail draait. E-mailmigratie is een aanvullende dienst; je mailprovider blijft je aanspreekpunt voor mail. " +
      aanbod.seo,
  ],
  [
    "Wat betaal ik, en wat komt erbij?",
    aanbod.prijs + " " + aanbod.aanvullingen,
  ],
  [
    "Heb ik hulp nodig om mijn website bij te houden?",
    "Meestal niet: je vraagt het aan je website en die regelt het. Vragen stel je in het basispakket gewoon per e-mail. Wil je dat wij iets voor je doen, dan kan dat per kwartier (€15 exclusief btw), of je kiest Optimaal ontzorgd (€39 per maand): dan helpen we jou als eerste met je vragen en houd je je website ook bij via WhatsApp. Storingen die bij ons liggen lossen we voor iedereen kosteloos op.",
  ],
  [
    "Heb ik een eigen ChatGPT- of Claude-abonnement nodig?",
    "Nee, voor de ingebouwde WordSwap-chat is geen eigen AI-abonnement nodig. " +
      aanbod.eigenAi,
  ],
  [
    "Wat als de AI het verkeerd begrijpt?",
    "Je bekijkt het voorstel vóór je publiceert. Klopt het niet, dan vraag je een aanpassing. Na publicatie kan een eerdere versie worden teruggezet. Bij vragen neem je contact op met Jos; extra maatwerk spreken we apart af.",
  ],
  [
    "Kan ik later weer terug naar WordPress?",
    "Ja, dat regelen we vooraf. Je oude WordPress-site blijft gewoon bestaan zolang jij je hosting aanhoudt. Teruggaan is dan alleen je domein terugwijzen. Wil je die hosting opzeggen, dan maak je eerst (met onze hulp, zonder dat wij je inloggegevens nodig hebben) een complete kopie van je WordPress-site. Die kopie houd je zelf en bewaren wij desgewenst een jaar mee. Wil je binnen dat jaar terug, dan zetten we hem voor je terug. Je hebt dan alleen weer hosting nodig. En los daarvan: de koppeling met ons is maandelijks opzegbaar en je websitebestanden zijn altijd van jou.",
  ],
];
