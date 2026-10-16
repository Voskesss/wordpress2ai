/**
 * Alle openbare pagina's van wordswap.nl op één plek. De sitemap, llms.txt,
 * llms-full.txt en de footer lezen hieruit, zodat ze nooit meer uit de pas
 * lopen (audit 14-10-2026: llms.txt miste twintig pagina's en wees naar
 * adressen zonder www). Nieuwe pagina? Hier toevoegen; tests/seo-samenvoegen.mts
 * controleert dat elke openbare pagina in app/ hier staat.
 */

export const SITE = "https://www.wordswap.nl";

export type Groep =
  | "start"
  | "overstappen"
  | "nieuw"
  | "bijhouden"
  | "kennis"
  | "branche"
  | "vertrouwen"
  | "juridisch";

export type SeoPagina = {
  pad: string;
  /** Korte naam voor links en lijsten. */
  naam: string;
  /** Eén zin die de kernvraag van de pagina beantwoordt (voor llms.txt). */
  zin: string;
  groep: Groep;
  /** Laatste inhoudelijke wijziging, voor de sitemap. */
  bijgewerkt: string;
};

export const GROEP_KOP: Record<Groep, string> = {
  start: "Over het aanbod",
  overstappen: "Je bestaande website overzetten",
  nieuw: "Een nieuwe website laten maken",
  bijhouden: "Je website bijhouden met AI",
  kennis: "Kennis en vergelijkingen",
  branche: "Per branche",
  vertrouwen: "Vertrouwen en contact",
  juridisch: "Juridisch",
};

export const SEO_PAGINAS: SeoPagina[] = [
  { pad: "", naam: "Home", zin: "WordSwap zet je website over naar een snelle versie zonder WordPress en regelt hosting, onderhoud en beveiliging; jij past hem aan door in een chat te typen.", groep: "start", bijgewerkt: "2026-10-11" },
  { pad: "/prijzen", naam: "Prijzen", zin: "Overstap eenmalig €150 tot €650, daarna vanaf €19 per maand inclusief hosting en AI-chat; Optimaal ontzorgd €39 per maand met voorrang en WhatsApp. Alles excl. btw.", groep: "start", bijgewerkt: "2026-09-30" },
  { pad: "/website-abonnement", naam: "Website abonnement", zin: "Een website-abonnement vanaf €19 per maand excl. btw met hosting, beveiliging en AI-chat; maandelijks opzegbaar en je neemt je bestanden mee.", groep: "start", bijgewerkt: "2026-10-14" },
  { pad: "/hoe-het-werkt", naam: "Hoe het werkt", zin: "Van gratis websitecheck via een kopie om te beoordelen tot de overstap na jouw akkoord.", groep: "start", bijgewerkt: "2026-09-13" },
  { pad: "/demo", naam: "Demo", zin: "Probeer zonder account hoe je een website aanpast door te typen wat er anders moet.", groep: "start", bijgewerkt: "2026-08-28" },

  { pad: "/wordpress-overzetten", naam: "WordPress overzetten", zin: "Je WordPress-site omzetten naar een snelle, gewone website met hetzelfde ontwerp, dezelfde teksten en adressen; blog en formulieren gaan mee, webshops niet.", groep: "overstappen", bijgewerkt: "2026-10-14" },
  { pad: "/seo-behoud", naam: "SEO bij de overstap", zin: "Hoe adressen, titels, beschrijvingen en doorverwijzingen meegaan zodat je vindbaarheid bij een overstap niet verloren gaat.", groep: "overstappen", bijgewerkt: "2026-09-10" },
  { pad: "/wordpress-backup-maken", naam: "WordPress-back-up maken", zin: "Stap voor stap een complete kopie van je WordPress-site maken en bewaren, voordat je iets verandert.", groep: "overstappen", bijgewerkt: "2026-09-22" },
  { pad: "/zelf-doen", naam: "Zelf doen", zin: "Technische handleiding om je WordPress-site zelf om te zetten naar een statische website.", groep: "overstappen", bijgewerkt: "2026-09-22" },

  { pad: "/nieuwe-website", naam: "Nieuwe website laten maken", zin: "Een nieuwe website zonder WordPress: AI-ontwerp vanaf €250, ontwerp door een designer vanaf €1.750, daarna zelf bijhouden via de chat.", groep: "nieuw", bijgewerkt: "2026-10-14" },
  { pad: "/ai-website", naam: "Goedkope AI-website? Let hierop", zin: "Waarom een website met AI maken goedkoop is geworden, en waar je op let bij bijhouden, eigendom en meenemen.", groep: "nieuw", bijgewerkt: "2026-09-22" },

  { pad: "/website-koppelen-aan-ai", naam: "Website aanpassen met AI", zin: "Je website aanpassen door te typen of te appen wat er anders moet; je ziet eerst een voorbeeld en publiceert zelf.", groep: "bijhouden", bijgewerkt: "2026-10-14" },
  { pad: "/website-laten-onderhouden", naam: "Website laten onderhouden", zin: "Wat website-onderhoud kost (meestal €12,50 tot €25 per maand voor WordPress) en hoe je de reden voor dat onderhoud weghaalt.", groep: "bijhouden", bijgewerkt: "2026-10-11" },
  { pad: "/website-zonder-onderhoud", naam: "Website zonder onderhoud", zin: "Een website zonder WordPress-updates, plug-ins en beveiligingsonderhoud: wat daarvoor nodig is en wat je zelf nog doet.", groep: "bijhouden", bijgewerkt: "2026-09-15" },
  { pad: "/appen", naam: "Website aanpassen via WhatsApp", zin: "Je website aanpassen door een appje te sturen, met tekst, foto of spraakbericht; onderdeel van Optimaal ontzorgd.", groep: "bijhouden", bijgewerkt: "2026-09-30" },
  { pad: "/eigen-ai-koppelen", naam: "Website beheren met ChatGPT of Claude", zin: "Je eigen ChatGPT of Claude gebruiken voor je hele website, zonder API-sleutel of plug-ins; het verschil met AI in WordPress, en wat eraan komt.", groep: "bijhouden", bijgewerkt: "2026-10-15" },
  { pad: "/wordpress-koppelen-aan-ai", naam: "AI gebruiken in WordPress", zin: "AI-plug-ins binnen WordPress vergeleken met overstappen: wat elke route kost aan werk en onderhoud.", groep: "bijhouden", bijgewerkt: "2026-09-13" },

  { pad: "/wordpress-alternatief", naam: "Alternatief voor WordPress", zin: "De alternatieven voor WordPress op een rij: bouwdozen, andere systemen en overstappen met behoud van je site, of een nieuwe site die wij met AI bouwen.", groep: "kennis", bijgewerkt: "2026-10-11" },
  { pad: "/wordswap-vs-wordpress", naam: "WordSwap vs. WordPress", zin: "Wanneer WordSwap past en wanneer WordPress de betere keuze blijft.", groep: "kennis", bijgewerkt: "2026-10-11" },
  { pad: "/website-maken-met-chatgpt-of-claude", naam: "Website maken met ChatGPT of Claude", zin: "Gids: zelf een website maken en bijhouden met ChatGPT of Claude, met GitHub, hosting en domein; wat het kost en waar het misgaat.", groep: "kennis", bijgewerkt: "2026-10-16" },
  { pad: "/wordpress-website-traag", naam: "WordPress-site traag", zin: "De zeven oorzaken van een trage WordPress-site, hoe je meet en wat je eraan doet.", groep: "kennis", bijgewerkt: "2026-10-11" },
  { pad: "/wat-kost-een-website-per-maand", naam: "Wat kost een website per maand?", zin: "Een website laten regelen kost meestal €20 tot €75 per maand, bij WordSwap €19 of €39; alle kostenposten uitgelegd, met een rekensom over 3 jaar voor vier routes.", groep: "kennis", bijgewerkt: "2026-10-14" },
  { pad: "/wordpress-kritieke-fout", naam: "Kritieke fout in WordPress", zin: "Wat je doet bij de melding over een kritieke fout of een wit scherm, stap voor stap van veilig naar technisch.", groep: "kennis", bijgewerkt: "2026-10-14" },
  { pad: "/wordpress-gehackt", naam: "WordPress gehackt", zin: "De signalen van een hack en de stappen in de juiste volgorde: hoster, wachtwoorden, scannen, schone back-up, Google en dichtzetten.", groep: "kennis", bijgewerkt: "2026-10-14" },
  { pad: "/webbouwer-onbereikbaar", naam: "Webbouwer onbereikbaar", zin: "Zelf je domeinnaam, hosting en WordPress-toegang terugkrijgen als je webbouwer niet meer reageert.", groep: "kennis", bijgewerkt: "2026-10-14" },
  { pad: "/veelgestelde-vragen", naam: "Veelgestelde vragen", zin: "Alle antwoorden op één plek, waaronder wat je via de chat kunt aanpassen en dat je nooit vastzit.", groep: "kennis", bijgewerkt: "2026-09-15" },

  { pad: "/website-kapsalon", naam: "Website voor kappers", zin: "Een website voor je kapsalon met prijzen en openingstijden die altijd kloppen.", groep: "branche", bijgewerkt: "2026-09-22" },
  { pad: "/website-schildersbedrijf", naam: "Website voor schilders", zin: "Een website voor je schildersbedrijf met projecten die je zelf bijhoudt, zonder onderhoud.", groep: "branche", bijgewerkt: "2026-09-22" },
  { pad: "/website-hoveniersbedrijf", naam: "Website voor hoveniers", zin: "Een website voor je hoveniersbedrijf met foto's van je werk, bij te houden vanaf je telefoon.", groep: "branche", bijgewerkt: "2026-09-22" },
  { pad: "/website-installatiebedrijf", naam: "Website voor installateurs", zin: "Een website voor je installatiebedrijf waarop diensten en storingsnummer altijd kloppen.", groep: "branche", bijgewerkt: "2026-09-22" },
  { pad: "/website-bouwbedrijf", naam: "Website voor bouwbedrijven", zin: "Een website voor je bouwbedrijf met projecten die je bijhoudt met een app.", groep: "branche", bijgewerkt: "2026-09-22" },
  { pad: "/website-adviesbureau", naam: "Website voor adviesbureaus", zin: "Adviesbureaus houden cases, adviseursprofielen en whitepapers zelf bij, en collega's werken mee als teamlid.", groep: "branche", bijgewerkt: "2026-10-14" },
  { pad: "/website-detacheringsbureau", naam: "Website voor detacheringsbureaus", zin: "Voor detachering en werving en selectie: vacatures zelf online zetten en weghalen, terwijl je sollicitatiesysteem bij de externe partij blijft.", groep: "branche", bijgewerkt: "2026-10-14" },
  { pad: "/website-accountant", naam: "Website voor accountants", zin: "Accountants en boekhouders houden tarieven en belastingnieuws zelf actueel; het klantportaal bij de externe partij blijft gewoon gelinkt.", groep: "branche", bijgewerkt: "2026-10-14" },
  { pad: "/website-financieel-adviseur", naam: "Website voor financieel adviseurs", zin: "Hypotheek- en verzekeringsadviseurs houden vergunningsgegevens, dienstverleningsdocument en tarieven zelf actueel; rekentools van externe partijen blijven gelinkt.", groep: "branche", bijgewerkt: "2026-10-14" },
  { pad: "/website-coach", naam: "Website voor coaches", zin: "Een website voor je coachpraktijk met blog, workshops en ervaringen die je zelf bijwerkt; je agendalink blijft werken.", groep: "branche", bijgewerkt: "2026-10-14" },
  { pad: "/website-mediator", naam: "Website voor mediators", zin: "Een rustige website voor je mediationpraktijk; kennisartikelen gaan mee op hun eigen adres en tarieven pas je zelf aan.", groep: "branche", bijgewerkt: "2026-10-14" },
  { pad: "/website-kunstenaar", naam: "Website voor kunstenaars", zin: "Een portfolio met grote foto's waar je nieuw werk en exposities zelf aan toevoegt, ook vanaf je telefoon.", groep: "branche", bijgewerkt: "2026-10-14" },
  { pad: "/website-stichting", naam: "Website voor stichtingen", zin: "Een website voor je stichting of vereniging die meerdere mensen kunnen bijhouden, zodat je niet afhangt van één vrijwilliger.", groep: "branche", bijgewerkt: "2026-10-14" },

  { pad: "/over-wordswap", naam: "Over WordSwap", zin: "Jos Klijnhout, WordSwap (handelsnaam van J.K. Klijnhout Holding B.V., KvK 09190650), Oosterbeek.", groep: "vertrouwen", bijgewerkt: "2026-09-22" },
  { pad: "/veiligheid", naam: "Veiligheid en controle", zin: "Hoe een site zonder WordPress minder kwetsbaar is, en hoe je zelf de regie houdt over elke wijziging.", groep: "vertrouwen", bijgewerkt: "2026-09-22" },
  { pad: "/contact", naam: "Gratis websitecheck", zin: "Gratis geschiktheidscheck en prijsvoorstel binnen twee werkdagen; telefoon 026 234 01 22, info@wordswap.nl.", groep: "vertrouwen", bijgewerkt: "2026-09-23" },
  { pad: "/partners", naam: "Samenwerken", zin: "Samenwerken met webbureaus rond bestaande WordPress-klantsites.", groep: "vertrouwen", bijgewerkt: "2026-09-13" },
  { pad: "/webinar", naam: "Gratis webinar", zin: "Een korte online uitleg van hoe je je website bijhoudt door te typen wat er anders moet.", groep: "vertrouwen", bijgewerkt: "2026-09-16" },

  { pad: "/privacy", naam: "Privacy", zin: "Welke gegevens we verwerken en waarom.", groep: "juridisch", bijgewerkt: "2026-10-01" },
  { pad: "/voorwaarden", naam: "Voorwaarden", zin: "Afspraken over prijzen, eigendom en opzeggen.", groep: "juridisch", bijgewerkt: "2026-10-09" },
  { pad: "/verwerkersovereenkomst", naam: "Verwerkersovereenkomst", zin: "De verwerkersovereenkomst voor klanten.", groep: "juridisch", bijgewerkt: "2026-10-01" },
];

export const urlVan = (pad: string) => `${SITE}${pad || "/"}`;

/** De hoofdpagina per onderwerp: daar linkt elke pagina in die groep naar. */
const HOOFDPAGINA: Partial<Record<Groep, string>> = {
  overstappen: "/wordpress-overzetten",
  nieuw: "/nieuwe-website",
  bijhouden: "/website-koppelen-aan-ai",
  kennis: "/wordpress-alternatief",
};

/** Verwante pagina's voor het blok "Lees ook": eerst de hoofdpagina van de
 * eigen groep, dan de rest van de groep. Branchepagina's verwijzen naar de
 * twee routes (overzetten of nieuw), want een kapper zoekt geen andere kapper. */
export function verwant(pad: string, max = 4): SeoPagina[] {
  const eigen = SEO_PAGINAS.find((p) => p.pad === pad);
  if (!eigen) return [];
  const paden =
    eigen.groep === "branche"
      ? ["/wordpress-overzetten", "/nieuwe-website", "/website-laten-onderhouden", "/appen"]
      : [
          HOOFDPAGINA[eigen.groep] ?? "",
          ...SEO_PAGINAS.filter((p) => p.groep === eigen.groep).map((p) => p.pad),
          "/wordpress-overzetten",
          "/nieuwe-website",
        ];
  const uit: SeoPagina[] = [];
  for (const q of paden) {
    const p = SEO_PAGINAS.find((x) => x.pad === q && q !== "");
    if (p && p.pad !== pad && !uit.includes(p)) uit.push(p);
    if (uit.length === max) break;
  }
  return uit;
}

/** "14 oktober 2026" uit "2026-10-14". */
export function datumNl(iso: string): string {
  const [j, m, d] = iso.split("-").map(Number);
  const maanden = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
  return `${d} ${maanden[m - 1]} ${j}`;
}

/**
 * WebPage-gegevens met auteur, datum en kruimelpad. Zoekmachines en
 * AI-assistenten wegen wie iets schreef en hoe vers het is mee (SEO-ronde
 * 14-10-2026); de zichtbare regel op de pagina zegt hetzelfde.
 */
export function paginaJsonLd(pad: string, titel: string) {
  const p = SEO_PAGINAS.find((x) => x.pad === pad);
  if (!p) return null;
  const url = urlVan(pad);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#pagina`,
        url,
        name: titel,
        description: p.zin,
        inLanguage: "nl-NL",
        dateModified: p.bijgewerkt,
        author: { "@type": "Person", name: "Jos Klijnhout", url: `${SITE}/over-wordswap` },
        publisher: { "@id": `${SITE}/#organisatie` },
        isPartOf: { "@type": "WebSite", name: "WordSwap", url: SITE },
        breadcrumb: { "@id": `${url}#kruimelpad` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#kruimelpad`,
        itemListElement: [
          { name: "Home", item: `${SITE}/` },
          { name: p.naam, item: url },
        ].map((x, i) => ({ "@type": "ListItem", position: i + 1, ...x })),
      },
    ],
  };
}
