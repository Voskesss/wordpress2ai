import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
import { aanbod } from "@/lib/aanbod";

export const metadata: Metadata = {
  title: "WordPress koppelen aan AI — blijven of overstappen?",
  description:
    "AI gebruiken binnen WordPress of je bestaande site overzetten naar WordSwap? Vergelijk de routes, het beheer en wat je behoudt.",
  alternates: {
    canonical: "/wordpress-koppelen-aan-ai",
  },
};

export default function Pagina() {
  return (
    <SeoLanding
      data={{
        slug: "wordpress-koppelen-aan-ai",
        label: "WordPress koppelen aan AI",
        titel: "AI gebruiken in WordPress, of WordPress achterlaten?",
        intro:
          "Wil je vooral hulp bij schrijven, of wil je ook af van het WordPress-beheer? Dat zijn twee verschillende wensen. WordSwap zet je bestaande website over naar een versie zonder WordPress. Je ontwerp en inhoud blijven het uitgangspunt; daarna geef je wijzigingen door via AI-chat.",
        blokken: [
          {
            kop: "Doorgaan met WordPress",
            tekst:
              "Als je tevreden bent met WordPress of afhankelijk bent van specifieke functies, kan AI binnen je huidige werkwijze passen. Wat een AI-tool kan aanpassen, hangt van de gekozen tool en inrichting af. Updates en beveiliging van WordPress blijven onderdeel van je beheer.",
          },
          { kop: "Overstappen naar WordSwap", tekst: aanbod.omschrijving },
          {
            kop: "Wat je daarna kunt vragen",
            tekst:
              "Bijvoorbeeld: “Vervang het telefoonnummer op de contactpagina” of “Voeg deze foto toe bij onze projecten.” De AI zet een voorstel klaar. Jij bekijkt de hele wijziging en publiceert als het klopt.",
          },
          { kop: "Eerst kijken of de functies passen", tekst: aanbod.geschikt },
        ],
        faq: [
          {
            vraag: "Is WordSwap een WordPress-plugin?",
            antwoord:
              "Nee. Je website wordt opnieuw opgebouwd als statische pagina’s. WordPress draait daarna niet meer onder je site. Je werkt voortaan in het WordSwap-portaal.",
          },
          {
            vraag: "Kan ik mijn eigen ChatGPT of Claude gebruiken?",
            antwoord: aanbod.eigenAi,
          },
          {
            vraag: "Wat gebeurt er met mijn Google-posities?",
            antwoord: aanbod.seo,
          },
          { vraag: "Wat kost de overstap?", antwoord: aanbod.prijs },
        ],
      }}
    />
  );
}
