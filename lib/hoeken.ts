/**
 * Invalshoeken voor advertenties. Iedereen is dezelfde ondernemer met een
 * WordPress-site; per advertentie raak je alleen een andere snaar. Daarom is er
 * één homepage en één webinarpagina, en verschillen alleen de kop en het
 * stukje tekst eronder: /?hoek=<sleutel> en /webinar?hoek=<sleutel>.
 *
 * - kop:   de vraag of uitspraak uit de advertentie
 * - tekst: de herkenning onder de kop (werkt op homepage én webinarpagina)
 * - mail:  één zin die in de bevestigingsmail en de eerste voorbereidingsmail
 *          terugkomt, zodat de aanmelder zijn eigen reden terugleest
 *
 * De hoek gaat mee naar de melding, de inschrijving en de leadlijst, zodat
 * zichtbaar wordt welke snaar het hardst binnenkomt. Webinarteksten: alleen
 * wat/waarom/wanneer, nooit hoe, geen prijzen.
 */
export const HOEKEN = {
  achterstand: {
    naam: "Achterstand",
    kop: "Loopt jouw website altijd achter omdat aanpassen te veel tijd kost?",
    tekst:
      "Een nieuwe dienst, een ander tarief, een vacature: het staat in je hoofd, maar niet op je website. Want aanpassen betekent inloggen, zoeken en hopen dat er niets verspringt. Dus schuift het weer een week door.",
    mail: "Je website loopt achter omdat aanpassen te veel tijd kost. Heel herkenbaar, en precies waar het webinar over gaat.",
  },
  vakman: {
    naam: "Vakmensen",
    kop: "Ben je vakman en geen websitebouwer?",
    tekst:
      "Je bent goed in je vak. Daar verdien je je geld mee, niet met inloggen, plugins bijwerken en uitzoeken waarom een blok verspringt. Toch moet je website kloppen, want je klanten kijken er wél naar.",
    mail: "Jij bent vakman, geen websitebouwer. Daarom gaat het webinar ook niet over techniek, maar over een website die klopt zonder dat jij er je avond in steekt.",
  },
  ai: {
    naam: "Nieuwe tijdperk",
    kop: "Jij gebruikt al AI. Je website nog niet.",
    tekst:
      "Je laat ChatGPT al een offerte of mail opzetten. Maar voor die ene zin op je website log je nog steeds in, zoek je de juiste pagina en hoop je dat de opmaak blijft staan. Twee tijdperken tegelijk.",
    mail: "Je gebruikt AI al voor je werk, alleen je website doet nog niet mee. In het webinar zie je wat er verandert als dat wel zo is.",
  },
  webbouwer: {
    naam: "Afhankelijkheid",
    kop: "Moet je voor elke kleine wijziging je webbouwer mailen?",
    tekst:
      "Een openingstijd, een foto, een typefout: voor alles stuur je een mailtje en dan wacht je. Soms dagen, soms met een factuur erachteraan. Terwijl je het eigenlijk gewoon zelf zou willen regelen, als het maar makkelijk was.",
    mail: "Voor elke kleine wijziging je webbouwer mailen en dan wachten: daar wil je vanaf. Daar begint het webinar ook mee.",
  },
  chatgpt: {
    naam: "Kopiëren en plakken",
    kop: "Schrijf je je teksten met ChatGPT en plak je ze daarna zelf in WordPress?",
    tekst:
      "De tekst is in een minuut klaar. Daarna begint het echte werk: inloggen, de goede pagina vinden, plakken, en uitzoeken waarom de opmaak nu ineens anders is. Het lastigste stuk doe je dus nog steeds zelf.",
    mail: "Je schrijft je teksten al met ChatGPT, maar het plakken in WordPress blijft handwerk. In het webinar zie je dat die laatste stap ook weg kan.",
  },
  kosten: {
    naam: "Kosten",
    kop: "Betaal je elke maand voor onderhoud aan een website die je zelf niet eens kunt aanpassen?",
    tekst:
      "Elke maand gaat er geld naar hosting en onderhoud. Maar wil je iets veranderen, dan moet je alsnog mailen, wachten of zelf gaan zoeken. Je betaalt dus voor een website die je niet echt in eigen hand hebt.",
    mail: "Je betaalt elke maand voor onderhoud aan een website die je zelf niet kunt aanpassen. In het webinar hoor je waarom dat niet zo hoeft te zijn.",
  },
  bijwerken: {
    naam: "Gedoe",
    kop: "Durf jij nog op ‘bijwerken’ te drukken in WordPress?",
    tekst:
      "Er staan weer updates klaar. Maar je weet niet wat er gebeurt als je op de knop drukt, dus laat je ze liever staan. En elke week dat ze blijven staan, voelt het een beetje minder veilig.",
    mail: "Je durft niet meer zomaar op ‘bijwerken’ te drukken. Heel begrijpelijk. In het webinar hoor je waarom je daar straks niet meer over na hoeft te denken.",
  },
  lijstje: {
    naam: "Lijstje",
    kop: "Wat staat er al maanden op je lijstje voor je website?",
    tekst:
      "Die nieuwe foto’s. Die dienst die er nog niet op staat. Die tekst die al een jaar niet klopt. Het lijstje wordt alleen maar langer, want aan je website beginnen kost altijd meer tijd dan je denkt.",
    mail: "Er staat al maanden van alles op je lijstje voor je website. Neem dat lijstje gerust mee naar het webinar, daar gaat het precies over.",
  },
  stilstand: {
    naam: "Website staat stil",
    kop: "Wanneer heb jij voor het laatst iets aan je website veranderd?",
    tekst:
      "Bij veel ondernemers is het eerlijke antwoord: te lang geleden. Niet omdat er niets te vertellen is, maar omdat aanpassen gedoe is. Zo loopt je website langzaam achter op je bedrijf.",
    mail: "Je website staat al een tijdje stil. Niet omdat je niets te vertellen hebt, maar omdat aanpassen gedoe is. Daar gaat het webinar over.",
  },
  "geen-nieuwe": {
    naam: "Geen nieuwe website",
    kop: "Tevreden met je website? Mooi. Dan bouwen we geen nieuwe.",
    tekst:
      "Je bent blij met hoe je website eruitziet, dus dat hoeft niet anders. Wat wél anders kan: alles erachter. Geen updates, geen plugins meer, en aanpassen door gewoon te vragen wat er moet veranderen.",
    mail: "Je bent tevreden met je website, en die blijft dus gewoon zoals hij is. In het webinar gaat het over wat er achter de schermen verandert, niet aan je ontwerp.",
  },
  "wordpress-zat": {
    naam: "WordPress zat",
    kop: "Je website is prima. WordPress ben je zat.",
    tekst:
      "Aan je website ligt het niet: die ziet er goed uit en doet wat hij moet doen. Het is alles eromheen. De updates, de plugins, het inloggen en dat gevoel dat er altijd iets stuk kan gaan.",
    mail: "Je website is prima, alleen WordPress ben je zat. Dan zit je goed: in het webinar blijft je website staan en gaat het over het gedoe eromheen.",
  },
  "na-de-bouw": {
    naam: "Na de bouw",
    kop: "Met AI kan iedereen een website maken. Maar wie houdt hem daarna bij?",
    tekst:
      "Een website laten maken is tegenwoordig snel en goedkoop. Maar daarna begint het pas: teksten bijwerken, foto’s vervangen, updates bijhouden. Juist de jaren ná de bouw bepalen of je website blijft kloppen.",
    mail: "Een website maken kan iedereen tegenwoordig. De echte vraag is wie hem daarna bijhoudt. Daar gaat het webinar over.",
  },
  // Sleutel blijft "regelt-zichzelf", zodat al gekopieerde advertentielinks blijven werken
  "regelt-zichzelf": {
    naam: "Regelt het",
    kop: "Mijn website regelt het. Ik hoef het alleen maar te vragen.",
    tekst:
      "Geen updates, geen plugins, geen webbouwer die je moet mailen. Wil je iets veranderen, dan zeg je gewoon wat er anders moet. Jij kijkt of het klopt en beslist wat er live gaat.",
    mail: "Een website die het voor je regelt, zodra je het vraagt: dat laat ik je in het webinar zien.",
  },
} as const;

export type HoekSleutel = keyof typeof HOEKEN;
export type Hoek = (typeof HOEKEN)[HoekSleutel] & { sleutel: HoekSleutel };

/** Sleutel uit de link → hoek, of null bij een onbekende of lege waarde. */
export function vindHoek(waarde: unknown): Hoek | null {
  const s = typeof waarde === "string" ? waarde : Array.isArray(waarde) ? waarde[0] : null;
  if (!s || !Object.hasOwn(HOEKEN, s)) return null;
  return { ...HOEKEN[s as HoekSleutel], sleutel: s as HoekSleutel };
}

/** Leesbare naam (zoals bewaard bij een inschrijving) → hoek. */
export function vindHoekOpNaam(naam: unknown): Hoek | null {
  if (typeof naam !== "string") return null;
  // Oude naam van vóór de hernoeming, voor inschrijvingen die hem al hebben
  if (naam === "Regelt zichzelf") naam = "Regelt het";
  const s = (Object.keys(HOEKEN) as HoekSleutel[]).find((k) => HOEKEN[k].naam === naam);
  return s ? { ...HOEKEN[s], sleutel: s } : null;
}
