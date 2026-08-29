import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";

export const metadata: Metadata = {
  title: "Je website aansturen met AI — verder dan WordPress",
  description:
    "WordPress aansturen met AI? Het kan slimmer: een website die je volledig via AI-chat beheert, zonder WordPress-onderhoud. Vanaf €250 overstappen.",
  alternates: { canonical: "/wordpress-aansturen-met-ai" },
};

export default function Pagina() {
  return (
    <SeoLanding
      data={{
        slug: "wordpress-aansturen-met-ai",
        label: "Website aansturen met AI",
        titel: "WordPress aansturen met AI? Wij gingen een stap verder",
        intro:
          "Steeds meer ondernemers zoeken naar manieren om hun WordPress-site met AI te beheren: teksten laten schrijven, wijzigingen laten doorvoeren, content plannen. Dat kan met plugins — maar dan blijft alle WordPress-ballast bestaan. Wij bouwden het andersom: een website die vólledig door AI wordt aangestuurd, zonder WordPress eronder.",
        blokken: [
          {
            kop: "AI-plugins vs. een AI-gestuurde website",
            tekst:
              "Een AI-plugin in WordPress helpt je met stukjes: een tekst hier, een afbeelding daar. Maar jij blijft degene die door het beheerscherm klikt, updates draait en hoopt dat de plugins elkaar niet bijten. Bij een AI-gestuurde website is de chat je complete beheeromgeving: de AI leest je site, voert elke wijziging door en zet hem pas live na jouw akkoord.",
          },
          {
            kop: "Wat je de AI zoal kunt vragen",
            tekst:
              "Alles wat je anders aan je webbouwer zou vragen: \"zet de openingstijden op zaterdag tot 17:00\", \"maak een pagina over onze nieuwe dienst\", \"schrijf een blog over de vakbeurs van volgende week\", \"maak de site wat frisser van kleur\". Je kunt zelfs een element op de pagina aanwijzen of een schets meesturen. De AI kent je hele site en het logboek van eerdere wijzigingen.",
          },
          {
            kop: "Jij houdt de regie",
            tekst:
              "De AI publiceert nooit zelf: elke wijziging zie je eerst als voorbeeld en gaat pas live als jij op Publiceer klikt. Elke publicatie wordt als versie bewaard, dus \"zet maar terug zoals het was\" is ook gewoon een opdracht die werkt.",
          },
          {
            kop: "De overstap vanaf WordPress",
            tekst:
              "Je huidige WordPress-site zetten we 1-op-1 over (95%-kopie, no cure no pay, vanaf €250) en vanaf dat moment stuur je hem aan via AI. Geen updates, geen hosting-gedoe, geen beheerschermen — alleen nog een chat die doet wat je zegt.",
          },
        ],
        faq: [
          {
            vraag: "Kan de AI ook teksten en blogs voor me schrijven?",
            antwoord:
              "Ja. Je geeft het onderwerp en eventueel wat steekwoorden, de AI schrijft het bericht in de stijl van je site en zet hem als concept klaar. Jij leest, stuurt bij en publiceert.",
          },
          {
            vraag: "Wat als de AI iets verkeerd doet?",
            antwoord:
              "Niets gaat live zonder jouw akkoord — je ziet elke wijziging eerst als voorbeeld. En elke gepubliceerde versie wordt bewaard, dus terugdraaien kan altijd, met één opdracht.",
          },
          {
            vraag: "Moet ik hiervoor mijn WordPress-site opgeven?",
            antwoord:
              "De site zelf blijft er exact zo uitzien — alleen de techniek eronder verandert. We zetten je site over als kopie, met behoud van design, teksten, URL's en vindbaarheid. WordPress zelf heb je daarna simpelweg niet meer nodig.",
          },
          {
            vraag: "Wat kost het aansturen met AI per maand?",
            antwoord:
              "€5 tot €20 per maand, afgestemd op hoe vaak je iets wijzigt — inclusief hosting en SSL. Wie zelden iets verandert, zit aan de onderkant. Geen lock-in: maandelijks opzegbaar en je bestanden zijn van jou.",
          },
        ],
      }}
    />
  );
}
