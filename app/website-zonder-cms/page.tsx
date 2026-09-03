import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";

export const metadata: Metadata = {
  title: "Website zonder CMS — wel alles zelf kunnen aanpassen",
  description:
    "Een website zonder CMS: geen WordPress, geen beheerscherm, geen updates — maar wél zelf wijzigen, gewoon door het te typen. Wij zetten je site over vanaf €150, no cure no pay.",
  alternates: { canonical: "/website-zonder-cms" },
};

export default function Pagina() {
  return (
    <SeoLanding
      data={{
        slug: "website-zonder-cms",
        label: "Website zonder CMS",
        titel: "Een website zonder CMS — en toch alles zelf aanpassen",
        intro:
          "Een CMS zoals WordPress belooft dat je zelf je website kunt beheren. In de praktijk krijg je een beheerscherm met tientallen menu's, plugins die om updates vragen en een site die stilstaat omdat je bang bent iets kapot te maken. WordSwap draait het om: geen CMS, geen beheerscherm — je typt in gewone taal wat er anders moet, en het gebeurt. De site zelf bestaat uit platte, razendsnelle bestanden waar niets aan kapot kan.",
        blokken: [
          {
            kop: "Wat een CMS eigenlijk voor je doet — en wat het kost",
            tekst:
              "Een CMS (content management system) is een programma dat op je server draait en je pagina's bij elk bezoek opnieuw in elkaar zet uit een database. Dat maakt bewerken mogelijk via een beheerscherm, maar het betekent ook: een database die kan corrumperen, PHP dat bijgewerkt moet blijven, plugins die elkaar in de weg zitten, en een inlogscherm dat de hele dag door robots wordt geprobeerd. Je betaalt ervoor met hosting, onderhoud en aandacht — vaak voor een site die je een paar keer per jaar aanpast.",
          },
          {
            kop: "Zonder CMS: de site is gewoon áf",
            tekst:
              "Wij zetten je site om naar statische bestanden: de pagina's precies zoals de bezoeker ze ziet, zonder machine erachter. Die staan op het wereldwijde netwerk van Cloudflare, laden vrijwel direct en zijn niet te hacken — er draait immers niets. Geen updates, geen back-upstress, geen onderhoudscontract. Je contactformulier, statistieken en vindbaarheid blijven gewoon werken.",
          },
          {
            kop: "Maar hoe wijzig ik dan iets?",
            tekst:
              "Dat is precies het punt: makkelijker dan met een CMS. Je opent je portaal, typt \"zet de openingstijden op zaterdag tot 17:00\" of \"voeg een pagina toe over dakisolatie\", en de AI voert het uit in de stijl van je site. Je ziet elke wijziging eerst als voorbeeld, klikt op Publiceer als je tevreden bent — en kunt altijd terug naar een eerdere versie. Foto vervangen, kleur aanpassen of een titel voor Google veranderen kan zelfs zonder de AI, met één klik.",
          },
          {
            kop: "Voor wie een website zonder CMS ideaal is",
            tekst:
              "Ondernemers en kleine teams met een bedrijfssite: een paar pagina's, eventueel een blog en een contactformulier, die je een paar keer per maand of per jaar wilt bijwerken zonder er een hobby van te maken. Niet geschikt voor webshops of ledenportalen met inlog — die hebben wél een draaiend systeem nodig, en dat zeggen we eerlijk vooraf.",
          },
        ],
        faq: [
          {
            vraag: "Is een website zonder CMS niet beperkt?",
            antwoord:
              "Voor een bedrijfssite niet — alles wat je nu doet (teksten, foto's, pagina's toevoegen, formulieren, blog) kan gewoon. Het enige dat verdwijnt is het beheerscherm, en dat mis je na een week niet meer.",
          },
          {
            vraag: "Kan ik mijn WordPress-site omzetten naar een site zonder CMS?",
            antwoord:
              "Ja, dat is precies wat WordSwap doet: een 1-op-1 kopie van je huidige site, inclusief je vindbaarheid in Google (titels, omschrijvingen en oude adressen verwijzen netjes door). No cure, no pay: je ziet eerst de kopie, en betaalt alleen als je hem houdt (vanaf €150).",
          },
          {
            vraag: "Wat als ik later toch een CMS wil?",
            antwoord:
              "Er is geen lock-in. Je site bestaat uit gewone web-bestanden die van jou zijn en die je zo kunt meenemen — naar een CMS, een andere bouwer of je eigen server. Maandelijks opzegbaar.",
          },
          {
            vraag: "Hoe zit het met de kosten?",
            antwoord:
              "Eenmalig €150 tot €650 voor de overstap (afhankelijk van de grootte), daarna €5 tot €20 per maand voor de AI-koppeling. Reken dat af tegen hosting, plugins en onderhoud van een CMS-site en je bent vrijwel altijd goedkoper uit.",
          },
        ],
      }}
    />
  );
}
