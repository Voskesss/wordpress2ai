import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
import { aanbod } from "@/lib/aanbod";

export const metadata: Metadata = {
  title: "Je website koppelen aan AI — zelf wijzigen via chat",
  description:
    "Je bestaande WordPress-site overzetten en daarna teksten, foto’s en pagina’s wijzigen met AI. Eerst een voorbeeld bekijken, daarna zelf publiceren.",
  alternates: {
    canonical: "/website-koppelen-aan-ai",
  },
};

export default function Pagina() {
  return (
    <SeoLanding
      data={{
        slug: "website-koppelen-aan-ai",
        label: "Website koppelen aan AI",
        titel: "Je website aanpassen door te vertellen wat je wilt.",
        intro:
          "Andere openingstijden, een nieuwe foto of een extra dienst? Bij WordSwap geef je het door in de chat. Eerst zetten we je bestaande WordPress-site (of een site in een ander CMS) zorgvuldig over naar een versie zonder beheersysteem. Daarna kun je zelf de inhoud bijhouden, met een voorbeeld vóór publicatie.",
        blokken: [
          {
            kop: "Een assistent voor jou als eigenaar",
            tekst:
              "Je geeft de AI een concrete wijziging en de juiste informatie. Je hoeft niet zelf in een WordPress-editor te zoeken. Bijvoorbeeld: “Zet op de contactpagina dat we op vrijdag tot 16 uur open zijn.”",
          },
          { kop: "Eerst overzetten, daarna aanpassen", tekst: aanbod.ontwerp },
          {
            kop: "Je ziet wat er verandert",
            tekst:
              "De AI werkt eerst aan een concept. Bekijk tekst, foto’s en de pagina als geheel. Klopt iets niet, vraag een correctie. Pas na jouw akkoord publiceer je de wijziging. Een eerdere versie terugzetten kan ook.",
          },
          { kop: "Wat is inbegrepen?", tekst: aanbod.inbegrepen },
        ],
        faq: [
          {
            vraag: "Is dit een chatbot voor bezoekers?",
            antwoord:
              "De ingebouwde chat is voor jou als eigenaar, om je site te wijzigen. Een chatbot voor bezoekersvragen is een andere functie en geen onderdeel van deze beheerchat.",
          },
          {
            vraag: "Heb ik een eigen AI-abonnement nodig?",
            antwoord: aanbod.eigenAi,
          },
          {
            vraag: "Kan elke website worden gekoppeld?",
            antwoord: aanbod.geschikt,
          },
          { vraag: "Wat kost het?", antwoord: aanbod.prijs },
        ],
      }}
    />
  );
}
