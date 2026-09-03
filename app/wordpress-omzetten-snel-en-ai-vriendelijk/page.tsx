import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";

export const metadata: Metadata = {
  title: "WordPress omzetten naar een snelle, AI-vriendelijke website",
  description:
    "Zo zet je je WordPress-site om naar een snellere website die ook door AI-chatbots (ChatGPT, Claude, Perplexity) goed gelezen en genoemd wordt. Vanaf €150, no cure no pay.",
  alternates: { canonical: "/wordpress-omzetten-snel-en-ai-vriendelijk" },
};

export default function Pagina() {
  return (
    <SeoLanding
      data={{
        slug: "wordpress-omzetten-snel-en-ai-vriendelijk",
        label: "Snel & AI-vriendelijk",
        titel: "Hoe zet ik mijn WordPress-website om naar een snellere, AI-vriendelijke website?",
        intro:
          "Het korte antwoord: laat je WordPress-site omzetten naar een statische website — kant-en-klare HTML-pagina's zonder database of plugins. Die laadt vrijwel direct én is perfect leesbaar voor AI-zoekmachines zoals ChatGPT, Claude, Perplexity en Google's AI-overzichten. WordSwap doet precies dat: een 1-op-1 kopie van je site, sneller en AI-klaar, vanaf €150 en no cure no pay. Wijzigen doe je daarna gewoon via AI-chat.",
        blokken: [
          {
            kop: "Waarom is een statische site sneller én AI-vriendelijker?",
            tekst:
              "WordPress bouwt elke pagina op het moment dat iemand hem opvraagt: database-verzoeken, plugins, thema-code — dat kost tijd. Een statische site ís al gebouwd; de server hoeft hem alleen te versturen. Voor bezoekers scheelt dat seconden. Voor AI-bots scheelt het nog meer: die lezen vaak geen JavaScript uit en haken af bij trage antwoorden. Een statische site levert de complete inhoud direct als schone HTML — precies wat een taalmodel nodig heeft om je bedrijf te begrijpen en te citeren.",
          },
          {
            kop: "Zo word je genoemd in ChatGPT, Claude en Perplexity",
            tekst:
              "AI-zoekmachines noemen bedrijven waarvan ze de website goed kunnen lezen en vertrouwen. Dat regel je met vier dingen die bij elke WordSwap-site standaard zitten: (1) alle inhoud als server-gerenderde HTML, zodat elke bot alles ziet; (2) structured data (Schema.org) die vertelt wát je bedrijf is en doet; (3) een llms.txt-bestand — de nieuwe standaard waarmee je AI-systemen een nette samenvatting van je site geeft; en (4) een robots-configuratie die AI-crawlers zoals GPTBot, ClaudeBot en PerplexityBot expliciet welkom heet in plaats van blokkeert (veel WordPress-beveiligingsplugins blokkeren ze per ongeluk).",
          },
          {
            kop: "Stappenplan: van WordPress naar snel en AI-klaar",
            tekst:
              "Stap 1: je vraagt de gratis site-check aan en maakt in WordPress een export (twee klikken, wij leggen het uit). Stap 2: wij bouwen de statische kopie — zelfde design, teksten en URL's, mét structured data, llms.txt en AI-vriendelijke robots-regels. Stap 3: jij beoordeelt de complete kopie vóórdat je iets betaalt. Stap 4: na jouw akkoord koppelen we je domein en melden we de site aan bij Google. Vanaf dat moment wijzig je alles via AI-chat — je site wordt dus niet alleen gelezen door AI, maar ook beheerd met AI.",
          },
          {
            kop: "Wat levert het op?",
            tekst:
              "Laadtijden van seconden naar milliseconden (en snelheid is een rankingfactor bij Google), geen onderhoud of beveiligingsrisico's meer, lagere maandlasten — en een steeds belangrijker voordeel: als klanten aan een AI-assistent vragen om een bedrijf zoals het jouwe, is een goed leesbare site het verschil tussen genoemd worden of onzichtbaar zijn. Steeds meer mensen zoeken via AI in plaats van via Google; wie daar nu leesbaar is, pakt die stroom als eerste.",
          },
        ],
        faq: [
          {
            vraag: "Wat maakt een website 'AI-vriendelijk'?",
            antwoord:
              "Complete inhoud als server-gerenderde HTML (geen inhoud die pas na JavaScript verschijnt), snelle laadtijd, duidelijke paginatitels en structuur, structured data (Schema.org), een llms.txt-bestand met een samenvatting van je site, en robots-regels die AI-crawlers toelaten. WordSwap-sites hebben dit allemaal standaard.",
          },
          {
            vraag: "Wat is llms.txt?",
            antwoord:
              "Een klein tekstbestand op je website (vergelijkbaar met robots.txt) dat AI-systemen in gewone taal vertelt wat je site is, wat je aanbiedt en welke pagina's belangrijk zijn. Het is een jonge standaard die door steeds meer AI-zoekmachines gelezen wordt — en het kost niets om hem goed te hebben.",
          },
          {
            vraag: "Blokkeert mijn huidige WordPress-site AI-bots?",
            antwoord:
              "Grote kans van wel, zonder dat je het weet: veel beveiligings- en cacheplugins (en sommige hosters) blokkeren onbekende crawlers standaard, waaronder GPTBot en ClaudeBot. Ook laden veel WordPress-thema's inhoud pas via JavaScript, waardoor AI-bots een halflege pagina zien. Stuur je adres in, dan checken we het gratis.",
          },
          {
            vraag: "Wat kost het omzetten?",
            antwoord:
              "Eenmalig €150 voor een kleine site tot ± €650 voor een grote of complexe site, daarna €5 tot €20 per maand voor hosting én de AI-chat waarmee je wijzigingen doorgeeft. No cure no pay: je betaalt pas als je tevreden bent met de kopie.",
          },
          {
            vraag: "Verlies ik mijn Google-posities?",
            antwoord:
              "Nee — alle URL's, paginatitels en meta-omschrijvingen worden letterlijk overgenomen en de site wordt aangemeld bij Google Search Console. Omdat de site sneller wordt, is het effect eerder positief.",
          },
        ],
      }}
    />
  );
}
