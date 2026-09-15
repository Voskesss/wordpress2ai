/** Shared public product facts; keep visible pages and machine-readable summaries aligned. */
export const aanbod = {
  omschrijving:
    "WordSwap zet je bestaande bedrijfswebsite over naar een versie zonder WordPress. Je ontwerp en inhoud worden zorgvuldig overgenomen, met behoud van bestaande URL’s, structuur, titels en meta-informatie als uitgangspunt. Daarna past de eigenaar teksten, foto’s en pagina’s aan via de ingebouwde AI-chat, met een voorbeeld en goedkeuring vóór publicatie.",
  prijs:
    "Overstap €150–€650 eenmalig; daarna vanaf €12 per maand voor hosting, beheer en het AI-portaal. Alle bedragen exclusief btw. De exacte prijs spreken we vooraf schriftelijk af.",
  inbegrepen:
    "Ingebouwde AI-chat, hosting, SSL, domeinkoppeling en versiegeschiedenis. Fair use: maximaal 30 nieuwe concepten per maand; AI-gebruik is ook begrensd. Bij intensieve vervolgverzoeken bespreken we een passend gebruikspakket. Maandelijks opzegbaar.",
  aanvullingen:
    "Domeinregistratie of -verlenging en een e-mailabonnement staan los van de koppeling. Meer AI-gebruik dan de fair-use-grens spreken we apart af als gebruikspakket. E-mailmigratie, extra functies en maatwerk bespreken we apart. Formulierbevestigingen vanaf je eigen domein: optioneel €49 eenmalig exclusief btw.",
  geschikt:
    "Voor bedrijfswebsites met pagina’s, foto’s, blogs en contactformulieren. Geen migratie van webshops, ledenportalen of zelfstandige boekings- en cursusplatforms. Externe boekingswidgets beoordelen we per site. We richten ons op WordPress, maar een site in een ander CMS kan vaak ook mee; dat bekijken we in de gratis websitecheck.",
  ontwerp:
    "Je behoudt je domeinnaam. We nemen inhoud en ontwerp zo nauwkeurig mogelijk over; bijzondere functies en afwijkingen bespreken we vooraf. Je beoordeelt de kopie voordat je akkoord geeft. Zonder akkoord betaal je niet voor de omzetting.",
  seo: "Bestaande URL’s en paginastructuur nemen we waar mogelijk exact over, net als paginatitels en meta-informatie. We vergelijken de oude en nieuwe inrichting, controleren de sitemap en richten bij afgesproken URL-wijzigingen passende doorverwijzingen in. Zoekposities en vermeldingen in AI-antwoorden kunnen we niet garanderen.",
  veiligheid:
    "Een stuk veiliger dan een gewone WordPress-site, al belooft niemand je eerlijk gezegd een website die honderd procent onkwetsbaar is. Je website bestaat uit kant-en-klare pagina’s zonder database, PHP of plugins, dus de inbraakroutes waar de meeste gehackte websites op sneuvelen, bestaan bij jou niet. De rest regelen wij: we houden de hosting, de beveiliging, het portaal en je contactformulier in de gaten en up-to-date. Daar hoef jij niet naar om te kijken.",
  wijzigen:
    "Eigenlijk alles wat je op je website ziet. Teksten, prijzen en openingstijden aanpassen; foto’s vervangen of toevoegen; nieuwe pagina’s maken, zoals een extra dienst, een actie of een blogbericht; knoppen, menu-items en formulieren toevoegen; en de titels en omschrijvingen die Google laat zien. Je typt het in gewone woorden, bijvoorbeeld: “maak een pagina over onze workshops met deze foto”. Nieuwe pagina’s en onderdelen bouwt de AI altijd op in de stijl van je eigen site, met dezelfde kleuren, lettertypes en opbouw, zodat alles bij elkaar blijft passen. Wil je bewust iets anders, zoals een andere foto bovenaan of een afwijkende kleur, dan vraag je dat gewoon. Je ziet elke wijziging eerst als voorbeeld en zet hem zelf live. Wat niet via de chat gaat: een webshop, een ledenomgeving met inlog of een compleet nieuw ontwerp; dat bespreken we apart.",
  meenemen:
    "Nee. Je website bestaat uit gewone webbestanden die van jou zijn, en die download je op elk moment zelf in je portaal, ook als je gewoon blijft. Je domeinnaam en e-mail staan op jouw naam. Het abonnement is maandelijks opzegbaar en dat regel je ook zelf in je portaal. Stop je, dan neem je alles mee: je website, je formulierberichten en je facturen — en je site blijft na de betaalde periode nog een maand extra online, zodat je rustig kunt verhuizen. Dat is precies het verschil met veel AI-websitebouwers, waar je site alleen in hun systeem bestaat en je hem vaak niet kunt meenemen.",
  eigenAi:
    "De ingebouwde WordSwap-chat is beschikbaar. Teksten uit ChatGPT of Claude kun je daarin plakken. Een rechtstreekse koppeling vanuit zo’n assistent is nog gepland. Experts kunnen op afspraak eigen AI-codetools gebruiken; zij werken buiten de standaard goedkeuringsroute.",
};
export const aankoopVragen = [
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
    "Is WordSwap een chatbot voor mijn bezoekers?",
    "De ingebouwde AI-chat is voor jou als eigenaar: daarmee pas je je website aan. Wil je daarnaast een chatbot óp je website die vragen van bezoekers beantwoordt? Dat kunnen we toevoegen — in je klantomgeving kun je nu al documenten over je bedrijf klaarzetten waar die chatbot straks uit put.",
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
    "Ja, dat regelen we vooraf. Je oude WordPress-site blijft gewoon bestaan zolang jij je hosting aanhoudt — teruggaan is dan alleen je domein terugwijzen. Wil je die hosting opzeggen, dan maak je eerst (met onze hulp, zonder dat wij je inloggegevens nodig hebben) een complete kopie van je WordPress-site. Die kopie houd je zelf en bewaren wij desgewenst een jaar mee. Wil je binnen dat jaar terug, dan zetten we hem voor je terug — je hebt dan alleen weer hosting nodig. En los daarvan: de koppeling met ons is maandelijks opzegbaar en je websitebestanden zijn altijd van jou.",
  ],
];
