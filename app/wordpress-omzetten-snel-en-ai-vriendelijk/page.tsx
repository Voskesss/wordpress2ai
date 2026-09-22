import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
import { aanbod } from "@/lib/aanbod";

export const metadata: Metadata = {
  title: "WordPress omzetten naar een snelle, AI-vriendelijke website",
  description:
    "WordPress omzetten met aandacht voor laadtijd, bestaande adressen en SEO. Daarna zelf bijhouden met AI. Geen garantie op zoekposities.",
  alternates: {
    canonical: "/wordpress-omzetten-snel-en-ai-vriendelijk",
  },
};

export default function Pagina() {
  return (
    <SeoLanding
      data={{
        slug: "wordpress-omzetten-snel-en-ai-vriendelijk",
        label: "Snel & AI-vriendelijk",
        titel:
          "WordPress omzetten: snel voor bezoekers, begrijpelijk voor zoekmachines.",
        intro:
          "Een goede website vertelt duidelijk wat je bedrijf doet en maakt contact opnemen makkelijk. WordSwap zet je bestaande WordPress-site (of een site in een ander CMS) over naar statische webpagina’s, met je ontwerp en SEO-inrichting als uitgangspunt. Daarna houd je de inhoud zelf actueel met AI.",
        blokken: [
          {
            kop: "Wat kan er sneller worden?",
            tekst:
              "Statische pagina’s hoeven niet bij ieder bezoek door WordPress te worden opgebouwd. Dat kan de laadtijd verbeteren. Grote foto’s, video’s en externe scripts blijven invloed hebben. Een goed ingerichte WordPress-site kan ook snel zijn; daarom vergelijken we de oude en nieuwe pagina’s.",
          },
          {
            kop: "Wat helpt zoekmachines en AI je bedrijf begrijpen?",
            tekst:
              "Duidelijke teksten over je diensten, doelgroep, werkwijze en prijzen. Belangrijke informatie moet leesbaar in de pagina staan. We controleren pagina-adressen, titels, beschrijvingen en interne links. Gestructureerde gegevens moeten overeenkomen met de zichtbare inhoud.",
          },
          {
            kop: "Leesbaar zijn is nog geen aanbeveling",
            tekst:
              "Of Google of een AI-assistent je bedrijf noemt, hangt van meer af dan de techniek. Betrouwbare inhoud en aantoonbare ervaring blijven nodig. Voor de AI-functies van Google gelden de gewone SEO-uitgangspunten; er is geen speciaal bestand dat een vermelding afdwingt.",
          },
          {
            kop: "Van je bestaande site naar zelf bijhouden",
            tekst:
              "Stuur eerst je websiteadres. We beoordelen de functies en spreken de prijs af. Daarna bekijken we samen de kopie en de SEO-controle. Na jouw akkoord koppelen we je domein. Nieuwe teksten, foto’s en pagina’s vraag je voortaan aan via de WordSwap-chat.",
          },
        ],
        faq: [
          {
            vraag: "Wat is llms.txt?",
            antwoord:
              "Een tekstbestand waarin je het aanbod en belangrijke pagina’s samenvat voor systemen die het gebruiken. Zie het als aanvullende documentatie. Het is geen gegarandeerd ondersteunde zoekstandaard en Google vereist het niet voor AI Overviews of AI Mode.",
          },
          {
            vraag: "Blokkeert mijn huidige site AI-bots?",
            antwoord:
              "Dat moeten we per website controleren. Robots-regels, toegangsbeveiliging en de manier waarop inhoud laadt kunnen invloed hebben. WordPress gebruiken betekent op zichzelf niet dat bots worden geblokkeerd.",
          },
          {
            vraag: "Garandeert WordSwap mijn zoekposities?",
            antwoord: aanbod.seo,
          },
          { vraag: "Wat kost het omzetten?", antwoord: aanbod.prijs },
        ],
      }}
    />
  );
}
