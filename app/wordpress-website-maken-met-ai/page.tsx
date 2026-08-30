import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";

export const metadata: Metadata = {
  title: "WordPress-website maken met AI? Dit werkt beter",
  description:
    "Een website laten maken met AI in plaats van WordPress: AI-ontwerp vanaf €750, geen onderhoud, wijzigen via chat. No cure no pay.",
  alternates: { canonical: "/wordpress-website-maken-met-ai" },
};

export default function Pagina() {
  return (
    <SeoLanding
      data={{
        slug: "wordpress-website-maken-met-ai",
        label: "Website maken met AI",
        titel: "Een WordPress-website maken met AI? Sla WordPress gewoon over",
        intro:
          "Wie in 2026 een website wil, hoeft niet meer bij WordPress te beginnen. Met WordSwap maakt AI je complete website — ontwerp, teksten, pagina's — en beheer je hem daarna óók met AI: je typt gewoon wat er anders moet. Geen thema's, geen plugins, geen updates. Alleen een site die doet wat je zegt.",
        blokken: [
          {
            kop: "Waarom AI + WordPress een omweg is",
            tekst:
              "Er zijn genoeg AI-plugins en -builders vóór WordPress, maar die stapelen slimmigheid op een systeem dat zelf onderhoud, hosting en beveiliging blijft eisen. Je krijgt dan AI én plugin-updates én een tragere site. Wij draaien het om: de AI bouwt een kant-en-klare, razendsnelle website zonder systeem eronder — er valt simpelweg niets te onderhouden.",
          },
          {
            kop: "Zo maakt de AI je website",
            tekst:
              "Je vertelt wat je bedrijf doet, wat je mooi vindt (voorbeelden van sites die je aanspreken helpen) en welke pagina's je wilt. De AI ontwerpt en bouwt de complete site; jij kijkt mee en stuurt bij in gewone taal — \"maak de kop wat rustiger\", \"andere foto bovenaan\". Wil je liever een menselijke ontwerper aan het roer met AI als bouwer, dan kan dat ook.",
          },
          {
            kop: "En daarna wijzig je alles via chat",
            tekst:
              "Dit is het echte verschil: na de oplevering blijf je de AI gewoon opdrachten geven. Nieuwe pagina, andere openingstijden, een actiebanner — je typt het, bekijkt het voorbeeld en keurt het goed. Elke wijziging wordt als versie bewaard, dus terugdraaien kan altijd.",
          },
          {
            kop: "Heb je al een WordPress-site?",
            tekst:
              "Dan hoef je niet opnieuw te beginnen: we kunnen je bestaande site ook 1-op-1 overzetten naar dezelfde techniek, mét behoud van je vindbaarheid in Google. Zie de pagina over WordPress overzetten — of vraag de gratis check aan, dan adviseren we wat in jouw geval slimmer is: overzetten of opnieuw ontwerpen.",
          },
        ],
        faq: [
          {
            vraag: "Wat kost een website laten maken met AI?",
            antwoord:
              "Een compleet AI-ontwerp vanaf €750, of vanaf €1.750 met een designer erbij. Daarna €5 tot €20 per maand voor hosting én de AI-koppeling waarmee je alles wijzigt. Geen verdere kosten: geen thema's, plugins of onderhoudscontracten.",
          },
          {
            vraag: "Is een AI-website wel goed voor Google?",
            antwoord:
              "Ja — juist. De site wordt opgeleverd als pure, snelle HTML met nette paginatitels, meta-omschrijvingen en structured data. Snelheid is een rankingfactor, en statische sites zijn het snelste dat er bestaat.",
          },
          {
            vraag: "Kan ik zelf nog dingen aanpassen zonder technische kennis?",
            antwoord:
              "Dat is precies het idee. Je typt in gewone taal wat er anders moet, de AI voert het uit en jij keurt het resultaat goed. Je hoeft nooit in code of een beheeromgeving te duiken.",
          },
          {
            vraag: "Wat als ik een webshop wil?",
            antwoord:
              "Webshops en ledenportalen met inlog bouwen we niet — daarvoor ben je bij gespecialiseerde platforms beter af. Een boekings- of afsprakensysteem van een externe dienst nemen we wél gewoon op in je site, en maatwerk is altijd bespreekbaar. Gewone bedrijfssites, ook met blog en formulieren, zijn onze specialiteit.",
          },
        ],
      }}
    />
  );
}
