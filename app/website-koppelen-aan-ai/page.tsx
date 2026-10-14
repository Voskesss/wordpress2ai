import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
import { aanbod } from "@/lib/aanbod";

// Hoofdpagina van het cluster "website aanpassen met AI". De pagina
// wordpress-aansturen-met-ai is hierin opgegaan en stuurt door
// (next.config.ts). wordpress-koppelen-aan-ai (AI ín WordPress) en
// eigen-ai-koppelen (ChatGPT/Claude koppelen) blijven apart: andere vraag.
export const metadata: Metadata = {
  title: "Website aanpassen met AI: typ wat er anders moet",
  description:
    "Je website aanpassen met AI zonder editor of plug-ins: typ wat er anders moet, bekijk het voorbeeld en publiceer zelf. Vanaf €19 per maand.",
  alternates: { canonical: "/website-koppelen-aan-ai" },
};

export default function Pagina() {
  return (
    <SeoLanding
      data={{
        slug: "website-koppelen-aan-ai",
        label: "Website aanpassen met AI",
        titel: "Je website aanpassen met AI, door te vertellen wat je wilt.",
        kort: "Website aanpassen met AI",
        intro:
          "Andere openingstijden, een nieuwe foto of een extra dienst? Bij WordSwap typ je het in de chat, of je appt het. De AI maakt een voorbeeld op je eigen site, jij bekijkt het en zet het zelf live. Je bestaande website gaat mee: we zetten hem eerst over naar een snelle versie zonder WordPress, met hetzelfde ontwerp en dezelfde adressen.",
        blokken: [
          {
            kop: "Drie manieren om je website met AI aan te passen",
            tekst:
              "Eén: AI-plug-ins ín WordPress. Handig als schrijfhulp, maar het onderhoud aan updates en plug-ins houd je; daarover gaat [AI gebruiken in WordPress](/wordpress-koppelen-aan-ai). Twee: een AI-sitebouwer, waarmee je opnieuw begint en zelf alles bouwt. Drie: de WordSwap-route. Je houdt je bestaande site, het onderhoud verdwijnt, en je past hem aan door te typen.",
          },
          {
            kop: "Begin met één duidelijke vraag",
            tekst:
              "\"Zet op de contactpagina dat we op vrijdag tot 16 uur open zijn.\" Noem de pagina en wat er moet veranderen. Voor een nieuwe dienst geef je zelf de feiten mee; de AI maakt er een pagina van in de stijl van je site. Je hoeft niet in een editor te zoeken.",
          },
          {
            kop: "Je ziet wat er verandert",
            tekst:
              "De AI werkt eerst aan een concept. Bekijk tekst, foto's en de pagina als geheel. Klopt iets niet, vraag een correctie. Pas na jouw akkoord publiceer je de wijziging, en een eerdere versie terugzetten kan altijd.",
          },
          {
            kop: "Ook foto's, nieuwe pagina's en via WhatsApp",
            tekst:
              "Stuur een foto mee en vertel waar hij moet komen, of vraag een pagina over een nieuw project. Onderweg? Met Optimaal ontzorgd [app je je wijziging](/appen) gewoon vanaf je telefoon. Extra functies en maatwerk stemmen we apart af.",
          },
          {
            kop: "Eerst overzetten, daarna aanpassen",
            tekst: `${aanbod.ontwerp} Hoe dat gaat lees je bij [WordPress overzetten](/wordpress-overzetten).`,
          },
          { kop: "Wat is inbegrepen?", tekst: aanbod.inbegrepen },
        ],
        faq: [
          {
            vraag: "Wat kan ik allemaal aanpassen via de chat? Kan ik ook zelf pagina's maken?",
            antwoord: aanbod.wijzigen,
          },
          {
            vraag: "Kan de AI teksten en blogs schrijven?",
            antwoord:
              "Ja. Geef het onderwerp en de juiste bedrijfsinformatie mee. De AI maakt een concept; jij controleert de inhoud, stuurt bij en publiceert.",
          },
          {
            vraag: "Hoe snel staat een wijziging op mijn site?",
            antwoord:
              "Je typt wat er anders moet en de AI bouwt het meestal binnen een paar minuten als voorbeeld. Jij bekijkt het, en met één klik op Publiceer staat het live. Niets gaat live zonder dat jij het gezien hebt.",
          },
          {
            vraag: "Wat als een wijziging verkeerd is?",
            antwoord:
              "Je kunt het concept laten aanpassen. Na publicatie zet je met één klik een eerdere versie terug.",
          },
          {
            vraag: "Kan ik mijn WordPress-site ook via AI aanpassen zonder over te stappen?",
            antwoord:
              "Ja, met AI-plug-ins zoals Jetpack AI krijg je schrijfhulp binnen WordPress. Prima als je vooral veel blogt. Het onderhoud aan updates, plug-ins en hosting houd je dan wel. Wil je juist van dat onderhoud af en toch via AI blijven aanpassen, dan is overstappen de completere route.",
          },
          {
            vraag: "Is dit een chatbot voor bezoekers?",
            antwoord:
              "Nee. De ingebouwde chat is voor jou als eigenaar, om je site te wijzigen. Een chatbot die vragen van bezoekers beantwoordt is een andere functie.",
          },
          {
            vraag: "Heb ik een eigen AI-abonnement nodig?",
            antwoord: aanbod.eigenAi,
          },
          {
            vraag: "Werkt dit ook als mijn site niet op WordPress draait?",
            antwoord:
              "Ja. We bouwen de kopie vanaf je live site, dus het maakt niet uit waar hij nu staat: WordPress, Wix, Squarespace, Joomla of ooit door een bureau op maat gemaakt.",
          },
          { vraag: "Wat kost het?", antwoord: aanbod.prijs },
        ],
      }}
    />
  );
}
