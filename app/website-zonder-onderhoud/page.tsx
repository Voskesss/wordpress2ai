import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
import { aanbod } from "@/lib/aanbod";

export const metadata: Metadata = {
  title: "Een website zonder onderhoud — bestaat dat?",
  description:
    "Geen WordPress- of plugin-updates meer. Houd je bestaande website en werk teksten en foto’s bij met AI. Wat WordSwap regelt en wat aandacht blijft vragen.",
  alternates: {
    canonical: "/website-zonder-onderhoud",
  },
};

export default function Pagina() {
  return (
    <SeoLanding
      data={{
        slug: "website-zonder-onderhoud",
        label: "Website zonder onderhoud",
        titel: "Een website zonder WordPress-onderhoud. Wel zelf bijhouden.",
        intro:
          "Je bent tevreden met je website, maar minder met updates en kleine beheerklusjes. WordSwap neemt je bestaande ontwerp en inhoud zorgvuldig over naar een website zonder WordPress (of een ander CMS). Daarna pas je de inhoud aan met AI. Het WordPress-onderhoud verdwijnt; je bedrijf en website blijven zich ontwikkelen.",
        blokken: [
          {
            kop: "Welke updates vervallen?",
            tekst:
              "De publieke website bestaat uit kant-en-klare webpagina’s. Daarop draaien geen WordPress (of ander CMS), PHP, thema’s of plugins meer. Je hoeft die onderdelen dus ook niet meer bij te werken. De hosting en SSL zijn inbegrepen in WordSwap.",
          },
          {
            kop: "Wat moet je dan nog zelf doen?",
            tekst:
              "Eigenlijk alleen je eigen inhoud actueel houden: kloppen je prijzen, openingstijden en contactgegevens nog? Dat pas je zelf aan door het in de chat te typen. De techniek erachter, zoals hosting, beveiliging en je contactformulier, houden wij in de gaten. Je domeinnaam en e-mail blijven wel aparte abonnementen op jouw naam, bij je eigen provider.",
          },
          {
            kop: "Een kleine wijziging regel je zelf",
            tekst:
              "Vraag bijvoorbeeld: “Zet onze vakantieperiode op de contactpagina.” Je bekijkt het voorstel op je website, vraagt zo nodig een correctie en publiceert zelf. Een eerdere versie kun je terugzetten. Bij vragen helpt Jos je op weg.",
          },
          {
            kop: "Vergelijk de volledige kosten",
            tekst:
              "Vergelijk je huidige hosting, eventuele pluginlicenties en onderhoud met het afgesproken WordSwap-bedrag. Domein, e-mail en maatwerk tel je aan beide kanten mee. Of je bespaart, hangt van je huidige afspraken af.",
          },
        ],
        faq: [
          {
            vraag: "Is de website dan onkwetsbaar?",
            antwoord: aanbod.veiligheid,
          },
          {
            vraag: "Werkt mijn contactformulier nog?",
            antwoord:
              "We zetten je contactformulier over en testen het voordat je domein naar de nieuwe site gaat. Inzendingen zijn zichtbaar in je portaal en worden per e-mail doorgestuurd. Bijzondere formulierfuncties bespreken we vooraf.",
          },
          { vraag: "Voor welke sites past dit?", antwoord: aanbod.geschikt },
          { vraag: "Wat kost het?", antwoord: aanbod.prijs },
        ],
      }}
    />
  );
}
