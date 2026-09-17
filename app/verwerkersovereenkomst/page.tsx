import type { Metadata } from "next";
import Link from "next/link";
import { VERWERKERS_VERSIE } from "@/lib/verwerkersovereenkomst";

export const metadata: Metadata = {
  title: "Verwerkersovereenkomst",
  description:
    "De verwerkersovereenkomst van WordSwap: hoe wij als verwerker omgaan met de bezoekersgegevens van jouw website.",
  alternates: { canonical: "/verwerkersovereenkomst" },
};

function Blok({ kop, children }: { kop: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-semibold tracking-tight">{kop}</h2>
      <div className="mt-2 space-y-3 text-stone-600 leading-relaxed">{children}</div>
    </section>
  );
}

export default function Verwerkersovereenkomst() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Verwerkersovereenkomst</h1>
      <p className="mt-4 text-sm text-stone-500">Versie {VERWERKERS_VERSIE} · onderdeel van de overeenkomst tussen jou en WordSwap</p>
      <p className="mt-6 text-lg leading-relaxed text-stone-600">
        Op jouw website laten bezoekers gegevens achter: formulierinzendingen, en straks mogelijk
        reacties of aanmeldingen. Voor die gegevens ben <strong>jij</strong> de
        verwerkingsverantwoordelijke en is <strong>WordSwap</strong> jouw verwerker. De AVG verplicht
        ons daar afspraken over te maken; die staan hieronder, in gewone taal.
      </p>

      <Blok kop="1. Partijen en reikwijdte">
        <p>
          Deze overeenkomst geldt tussen jou (de klant met een website bij WordSwap) en WordSwap,
          handelsnaam van J.K. Klijnhout Holding B.V., KvK 09190650, Lebretweg 72, 6861 ZZ Oosterbeek.
          Ze hoort bij je WordSwap-abonnement en geldt zolang dat loopt.
        </p>
      </Blok>

      <Blok kop="2. Welke gegevens wij voor jou verwerken">
        <p>
          Gegevens die bezoekers van jouw website achterlaten: formulierinzendingen (zoals naam,
          e-mailadres, telefoonnummer en berichttekst), en de bevestigingsmails daarover. Daarnaast
          jouw eigen chatberichten in het portaal, voor zover daar persoonsgegevens in staan. Wij
          bepalen niet wat er met deze gegevens gebeurt — dat doe jij; wij bewaren en versturen ze
          alleen in jouw opdracht.
        </p>
      </Blok>

      <Blok kop="3. Wat wij wel en niet doen">
        <p>
          We verwerken deze gegevens uitsluitend om de dienst te leveren: opslaan, aan jou tonen in
          het portaal, doormailen naar het door jou ingestelde adres en op jouw verzoek exporteren of
          verwijderen. We gebruiken ze nooit voor eigen doelen, verkopen ze nooit en sturen er nooit
          zelf berichten naar. Iedereen die er bij ons toegang toe heeft, is tot geheimhouding
          verplicht.
        </p>
      </Blok>

      <Blok kop="4. Subverwerkers">
        <p>
          Wij gebruiken leveranciers om de dienst te laten draaien: Vercel (portaal), Cloudflare
          (hosting van je website), Neon (database, in de EU), Clerk (inloggen), Resend (e-mail) en
          Anthropic (de AI die wijzigingen uitvoert; jouw gegevens worden niet gebruikt om
          AI-modellen te trainen). Gebruik je de WhatsApp-optie, dan komen daar Meta (het afleveren
          van WhatsApp-berichten) en OpenAI (het omzetten van spraakberichten naar tekst, zonder
          training van AI-modellen) bij. Met deze partijen hebben wij verwerkersafspraken. Voor partijen
          buiten de EU gelden het EU-VS Data Privacy Framework en/of EU-standaardcontractbepalingen.
          Wijzigt deze lijst, dan melden we dat vooraf; ben je het er niet mee eens, dan kun je
          maandelijks opzeggen.
        </p>
      </Blok>

      <Blok kop="5. Beveiliging">
        <p>
          Alle verbindingen zijn versleuteld (HTTPS), toegang is beperkt tot wat nodig is, formulieren
          hebben spam- en misbruikbescherming en jouw websitebestanden en gegevens zijn per klant
          gescheiden. Zie ook{" "}
          <Link href="/veiligheid" className="text-violet-700 underline underline-offset-2">
            wordswap.nl/veiligheid
          </Link>
          .
        </p>
      </Blok>

      <Blok kop="6. Datalekken">
        <p>
          Ontdekken wij een datalek dat jouw bezoekersgegevens raakt, dan informeren we je zo snel
          mogelijk en uiterlijk binnen 48 uur na ontdekking, met wat er bekend is en wat wij doen.
          Het is aan jou als verantwoordelijke om het lek zo nodig binnen 72 uur te melden bij de
          Autoriteit Persoonsgegevens; wij helpen daarbij met alle informatie die we hebben.
        </p>
      </Blok>

      <Blok kop="7. Hulp bij rechten van bezoekers">
        <p>
          Vraagt een bezoeker van jouw website om inzage, correctie of verwijdering van zijn
          gegevens, dan help je jezelf grotendeels via het portaal (inzendingen bekijken, exporteren
          en verwijderen). Lukt iets daar niet, dan helpen wij binnen vijf werkdagen.
        </p>
      </Blok>

      <Blok kop="8. Bewaren en teruggeven">
        <p>
          We bewaren de gegevens zolang je abonnement loopt. Stopt de overeenkomst, dan ontvang je op
          verzoek een export van al je gegevens (websitebestanden, inzendingen en chatgeschiedenis)
          en verwijderen we alles binnen drie maanden, behalve wat we wettelijk moeten bewaren
          (zoals facturen, zeven jaar).
        </p>
      </Blok>

      <Blok kop="9. Controle en aansprakelijkheid">
        <p>
          Je mag ons schriftelijk vragen aan te tonen dat we deze afspraken naleven; we beantwoorden
          zo&apos;n verzoek binnen een maand. Voor aansprakelijkheid gelden de{" "}
          <Link href="/voorwaarden" className="text-violet-700 underline underline-offset-2">
            algemene voorwaarden
          </Link>
          .
        </p>
      </Blok>

      <p className="mt-10 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
        Akkoord op deze overeenkomst geef je bij de eerste keer inloggen op je klantportaal, of door
        de eerste betaling aan WordSwap te doen; we leggen daarbij datum en account vast.
      </p>
    </div>
  );
}
