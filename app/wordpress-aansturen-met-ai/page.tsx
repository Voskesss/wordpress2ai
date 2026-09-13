import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
import { aanbod } from "@/lib/aanbod";

export const metadata: Metadata = {
  title: "Je website aansturen met AI — verder dan WordPress",
  description:
    "Laat je bestaande WordPress-site overzetten. Daarna vraag je tekst- en fotowijzigingen aan via AI-chat en publiceer je na controle.",
  alternates: {
    canonical: "/wordpress-aansturen-met-ai",
  },
};

export default function Pagina() {
  return (
    <SeoLanding
      data={{
        slug: "wordpress-aansturen-met-ai",
        label: "Website aansturen met AI",
        titel: "WordPress achterlaten. Je website aansturen met AI.",
        intro:
          "Je bedrijf verandert. Je website moet mee kunnen veranderen. WordSwap neemt je bestaande ontwerp en inhoud zorgvuldig over naar een website zonder WordPress. Daarna vraag je een wijziging, bekijk je het voorstel en zet je het zelf live.",
        blokken: [
          {
            kop: "Begin met één duidelijke vraag",
            tekst:
              "“Zet de openingstijden op zaterdag op 9 tot 16 uur.” Benoem de pagina en wat er moet veranderen. Voor een nieuwe dienst geef je zelf de feiten mee; de AI helpt om er een pagina van te maken.",
          },
          {
            kop: "Controle hoort bij het aanpassen",
            tekst:
              "De AI kan je verkeerd begrijpen of informatie verkeerd formuleren. Daarom bekijk je ieder concept. Vraag een verbetering als het nog niet klopt. Je live website verandert pas wanneer je zelf publiceert.",
          },
          {
            kop: "Ook foto’s en nieuwe pagina’s",
            tekst:
              "Stuur een foto mee en vertel waar hij moet komen. Of vraag een pagina over een nieuw project. Je ziet het resultaat in de context van jouw website. Extra functies en maatwerk stemmen we apart af.",
          },
          { kop: "De overstap van je huidige site", tekst: aanbod.ontwerp },
        ],
        faq: [
          {
            vraag: "Kan de AI teksten en blogs schrijven?",
            antwoord:
              "Ja. Geef het onderwerp en de juiste bedrijfsinformatie mee. De AI maakt een concept. Jij controleert de inhoud, stuurt bij en publiceert.",
          },
          {
            vraag: "Blijft het een WordPress-site?",
            antwoord:
              "Nee. Je site wordt opnieuw opgebouwd zonder WordPress. Ontwerp, inhoud en bestaande pagina-adressen nemen we zo nauwkeurig mogelijk over. Bijzondere functies bespreken we vooraf.",
          },
          {
            vraag: "Wat als een wijziging verkeerd is?",
            antwoord:
              "Je kunt het concept laten aanpassen. Na publicatie kan een eerdere versie worden teruggezet. Controleer daarna ook of het herstel goed zichtbaar is.",
          },
          { vraag: "Wat kost het?", antwoord: aanbod.prijs },
        ],
      }}
    />
  );
}
