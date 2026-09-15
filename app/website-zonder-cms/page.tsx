import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
import { aanbod } from "@/lib/aanbod";

export const metadata: Metadata = {
  title: "Website zonder CMS — wel zelf kunnen aanpassen",
  description:
    "Je WordPress-site overzetten naar statische webpagina’s en daarna wijzigen via AI-chat. Behoud van ontwerp en SEO-inrichting als uitgangspunt.",
  alternates: {
    canonical: "/website-zonder-cms",
  },
};

export default function Pagina() {
  return (
    <SeoLanding
      data={{
        slug: "website-zonder-cms",
        label: "Website zonder CMS",
        titel: "Een website zonder WordPress. Een chat om hem bij te houden.",
        intro:
          "Je wilt geen nieuw beheersysteem leren om één foto te vervangen. WordSwap zet je bestaande site over naar statische webpagina’s. In het WordSwap-portaal geef je wijzigingen door in gewone taal: eerst zien, dan zelf publiceren.",
        blokken: [
          {
            kop: "Wat betekent zonder CMS?",
            tekst:
              "De publieke site heeft geen WordPress-database of WordPress-editor. Je bezoekers krijgen kant-en-klare pagina’s. Voor jou is er wel een beheeromgeving: het WordSwap-portaal met AI-chat, voorbeeld en versiegeschiedenis.",
          },
          { kop: "Je bestaande website vormt de basis", tekst: aanbod.ontwerp },
          {
            kop: "Zo werk je de inhoud bij",
            tekst:
              "Vraag bijvoorbeeld: “Maak een pagina over onze nieuwe dienst tuinonderhoud.” Geef de juiste bedrijfsinformatie mee. De AI maakt een voorstel in de stijl van je site; jij controleert tekst, vormgeving en links voordat je publiceert.",
          },
          { kop: "Welke functies kunnen mee?", tekst: aanbod.geschikt },
        ],
        faq: [
          { vraag: "Blijft mijn site vindbaar?", antwoord: aanbod.seo },
          {
            vraag: "Wat als ik later weer WordPress wil?",
            antwoord:
              "Dat kan. Vóór je je oude hosting opzegt, zetten we een complete kopie van je WordPress-site veilig. Wil je binnen een jaar terug, dan zetten we die voor je terug; je hebt dan alleen weer hosting nodig. Je bestanden blijven altijd van jou en het abonnement is maandelijks opzegbaar.",
          },
          {
            vraag: "Heeft de website nog beveiliging nodig?",
            antwoord: aanbod.veiligheid,
          },
          { vraag: "Wat kost de overstap?", antwoord: aanbod.prijs },
        ],
      }}
    />
  );
}
