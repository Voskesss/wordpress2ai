import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
import { aanbod } from "@/lib/aanbod";

export const metadata: Metadata = {
  title: "WordPress-website maken met AI? Bouwen én blijven bijhouden",
  description:
    "Een nieuwe website zonder WordPress, vanaf €250 excl. btw. Daarna zelf bijhouden met AI-chat. Heb je al een site? Bekijk ook de overstap met bestaand ontwerp.",
  alternates: {
    canonical: "/wordpress-website-maken-met-ai",
  },
};

export default function Pagina() {
  return (
    <SeoLanding
      data={{
        nieuweWebsite: true,
        slug: "wordpress-website-maken-met-ai",
        label: "Website maken met AI",
        titel: "Een website maken met AI is het begin. Bijhouden hoort erbij.",
        intro:
          "Heb je nog geen website, of wil je een nieuw ontwerp? Dan bouwen we een website zonder WordPress op basis van jouw bedrijf, huisstijl en inhoud. Daarna blijf je teksten, foto’s en pagina’s aanpassen met de ingebouwde AI-chat.",
        blokken: [
          {
            kop: "Bouwen vanuit jouw bedrijf",
            tekst:
              "Vertel wie je helpt, wat je aanbiedt en welke actie bezoekers moeten kunnen uitvoeren. Lever je logo, foto’s en juiste bedrijfsinformatie aan. Wij bouwen een voorstel dat je kunt bekijken en waarop je feedback geeft.",
          },
          {
            kop: "Je hoeft daarna niet opnieuw te leren bouwen",
            tekst:
              "Een nieuw project, andere openingstijden of een extra dienst geef je door in de chat. De AI maakt een concept; jij controleert het en publiceert als het klopt. De ingebouwde chat, hosting en SSL vallen onder het maandbedrag.",
          },
          {
            kop: "Heb je al een goede WordPress-site?",
            tekst:
              "Dan kan zorgvuldig overzetten beter passen dan een nieuw ontwerp. Je huidige uitstraling, inhoud en SEO-inrichting vormen dan het uitgangspunt. Via de gratis websitecheck bekijken we welke route bij je site past.",
          },
          {
            kop: "Wat kost een nieuw ontwerp?",
            tekst:
              "Een AI-ontwerp kost €250 tot 8 pagina’s, €400 tot 20 pagina’s en €650 voor grotere sites. Een ontwerp door een designer begint bij €1.750. Daarna vanaf €19 per maand. Alle bedragen zijn excl. btw; domein, e-mail en maatwerk staan daar los van.",
          },
        ],
        faq: [
          {
            vraag: "Heeft AI gebruiken gevolgen voor Google?",
            antwoord:
              "De kwaliteit en juistheid van je inhoud blijven belangrijk. We letten op leesbare pagina’s, titels, beschrijvingen en interne links. Gebruik van AI of een bepaalde techniek garandeert geen zoekpositie.",
          },
          {
            vraag: "Kan ik zelf wijzigen zonder technische kennis?",
            antwoord:
              "Je geeft aan wat er anders moet en bekijkt het voorstel op je site. Voor de ingebouwde chat heb je geen eigen AI-abonnement nodig. Voor complexe nieuwe functies bespreken we eerst wat mogelijk is.",
          },
          {
            vraag: "Kan ik een webshop laten bouwen?",
            antwoord: aanbod.geschikt,
          },
          {
            vraag: "Welke extra kosten zijn er?",
            antwoord: aanbod.aanvullingen,
          },
        ],
      }}
    />
  );
}
