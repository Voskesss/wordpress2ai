/** Shared public product facts; keep visible pages and machine-readable summaries aligned. */
export const aanbod = {
  omschrijving:
    "WordSwap zet bestaande WordPress-bedrijfswebsites over naar statische websites. Daarna past de eigenaar teksten, foto’s en pagina’s aan via de ingebouwde AI-chat, met een voorbeeld en goedkeuring vóór publicatie.",
  prijs:
    "Overstap €150–€650 eenmalig; daarna €5–€20 per maand voor hosting en de AI-koppeling. Alle bedragen exclusief btw. De exacte prijs spreken we vooraf schriftelijk af.",
  inbegrepen:
    "Ingebouwde AI-chat, hosting, SSL, domeinkoppeling en versiegeschiedenis. Fair use: 30 wijzigingen per maand. Maandelijks opzegbaar.",
  aanvullingen:
    "Domeinregistratie of -verlenging en een e-mailabonnement staan los van de koppeling. E-mailmigratie, extra functies en maatwerk bespreken we apart. Formulierbevestigingen vanaf je eigen domein: optioneel €49 eenmalig exclusief btw.",
  geschikt:
    "Voor bedrijfswebsites met pagina’s, foto’s, blogs en contactformulieren. Geen migratie van webshops, ledenportalen of zelfstandige boekings- en cursusplatforms. Externe boekingswidgets beoordelen we per site.",
  ontwerp:
    "Je behoudt je domeinnaam. We nemen inhoud en ontwerp zo nauwkeurig mogelijk over; bijzondere functies en afwijkingen bespreken we vooraf. Je beoordeelt de kopie voordat je akkoord geeft. Zonder akkoord betaal je niet voor de omzetting.",
  seo: "We controleren bestaande URL’s, paginatitels, beschrijvingen en sitemap en richten waar nodig doorverwijzingen in. Zoekposities en vermeldingen in AI-antwoorden kunnen we niet garanderen.",
  veiligheid:
    "De publieke website heeft geen WordPress-database, PHP of WordPress-plugins. Dat verkleint het aanvalsoppervlak. Het beheerportaal, accounts, hosting en formulieren blijven beveiliging nodig hebben. Geen website is risicovrij.",
  eigenAi:
    "De ingebouwde WordSwap-chat is beschikbaar. Teksten uit ChatGPT of Claude kun je daarin plakken. Een rechtstreekse koppeling vanuit zo’n assistent is nog gepland. Experts kunnen op afspraak eigen AI-codetools gebruiken; zij werken buiten de standaard goedkeuringsroute.",
};
export const aankoopVragen = [
  [
    "Is WordSwap een chatbot voor mijn bezoekers?",
    "De AI-chat is voor jou als eigenaar. Je geeft er wijzigingen mee door aan je website. Je bezoekers gebruiken je website zoals ze gewend zijn.",
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
    "Kan ik later weer weg?",
    "De koppeling is maandelijks opzegbaar en je kunt je websitebestanden meenemen. Een overstap terug naar WordPress vraagt een nieuwe inrichting; dat gebeurt niet automatisch.",
  ],
];
