import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
import { aanbod } from "@/lib/aanbod";

export const metadata: Metadata = {
  title: "Je WordPress-website omzetten en via AI aanpassen",
  description:
    "Je WordPress-website omzetten zodat je hem via AI kunt aanpassen? WordSwap zet je bestaande site over (zelfde ontwerp en adressen) en daarna wijzig je alles door het gewoon te typen. Vanaf €150, eerst zien dan betalen.",
  alternates: {
    canonical: "/wordpress-aansturen-met-ai",
  },
};

export default function Pagina() {
  return (
    <SeoLanding
      data={{
        slug: "wordpress-aansturen-met-ai",
        label: "Omzetten en via AI aanpassen",
        titel: "Je WordPress-website omzetten om hem via AI aan te passen",
        intro:
          "Wil je je WordPress-website omzetten zodat je hem via AI kunt aanpassen? Dat kan op drie manieren: AI-plugins ín WordPress (je houdt het onderhoud), een AI-sitebouwer (je begint opnieuw), of de WordSwap-route: wij zetten je bestáánde site om naar een snelle website zonder WordPress — zelfde ontwerp, zelfde adressen — en daarna pas je hem aan door in gewone taal te typen wat er anders moet. Je ziet elk voorstel eerst en zet het zelf live.",
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
          {
            vraag: "Hoe zet ik mijn WordPress-website om zodat ik hem via AI kan aanpassen?",
            antwoord:
              "Je hoeft er zelf niets voor te doen: wij maken vanaf je live site een exacte kopie zonder WordPress, met behoud van ontwerp, teksten en pagina-adressen. Je beoordeelt de kopie gratis; pas als je tevreden bent stap je over. Daarna pas je alles aan via de ingebouwde AI-chat — typen wat er anders moet is genoeg.",
          },
          {
            vraag: "Kan ik mijn WordPress-site ook via AI aanpassen zónder over te stappen?",
            antwoord:
              "Ja, met AI-plugins zoals Jetpack AI krijg je schrijfhulp binnen WordPress — prima als je vooral veel blogt. Het WordPress-onderhoud (updates, plugins, hosting) houd je dan wel. Wil je juist van dat onderhoud af én via AI blijven aanpassen, dan is omzetten naar een statische site de completere route.",
          },
          { vraag: "Wat kost het?", antwoord: aanbod.prijs },
        ],
      }}
    />
  );
}
