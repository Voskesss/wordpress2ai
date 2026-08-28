import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacyverklaring",
  description:
    "Hoe WordSwap omgaat met persoonsgegevens: wat we verzamelen, waarom, waar het staat en wat je rechten zijn.",
};

const bijgewerkt = "28 augustus 2026";

function Blok({ kop, children }: { kop: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-semibold tracking-tight">{kop}</h2>
      <div className="mt-3 space-y-3 text-stone-600 leading-relaxed">{children}</div>
    </section>
  );
}

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
        Privacyverklaring
      </h1>
      <p className="mt-4 text-stone-500 text-sm">Laatst bijgewerkt: {bijgewerkt}</p>
      <p className="mt-6 text-lg text-stone-600 leading-relaxed">
        WordSwap zet websites over en laat je die daarna beheren via AI-chat.
        Daarvoor verwerken we zo min mogelijk persoonsgegevens, en we vertellen
        hier precies welke, waarom en waar ze staan.
      </p>
      <p className="mt-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
        Verwerkingsverantwoordelijke: <strong>AI Backoffice</strong>, handelsnaam
        van J.K. Klijnhout Holding B.V. · KvK 09190650 · Lebretweg 72,
        6861 ZZ Oosterbeek ·{" "}
        <a href="mailto:info@aibackoffice.nl" className="text-violet-700 underline underline-offset-2">info@aibackoffice.nl</a>
      </p>

      <Blok kop="Welke gegevens we verwerken">
        <p>
          <strong>Contact- en aanvraagformulieren:</strong> naam, e-mailadres,
          websiteadres en je bericht. Deze gebruiken we alleen om je aanvraag te
          beantwoorden.
        </p>
        <p>
          <strong>Klantaccounts:</strong> naam en e-mailadres voor het inloggen
          op je klantportaal.
        </p>
        <p>
          <strong>Chatberichten in het portaal:</strong> de wijzigingen die je
          aan de AI doorgeeft bewaren we, zodat je geschiedenis en versies terug
          te vinden zijn.
        </p>
        <p>
          <strong>Formulieren op klantwebsites:</strong> vullen bezoekers een
          formulier in op een website die wij hosten, dan slaan we die inzending
          op en mailen we hem door aan de eigenaar van die website. De eigenaar
          is voor die gegevens de verwerkingsverantwoordelijke; wij verwerken ze
          alleen in opdracht.
        </p>
        <p>
          We verzamelen géén advertentie- of trackingprofielen en plaatsen geen
          marketingcookies. Er worden alleen functionele cookies gebruikt (voor
          het inloggen op het klantportaal).
        </p>
      </Blok>

      <Blok kop="Waarvoor en op welke grond">
        <p>
          We verwerken gegevens om onze dienst te leveren (uitvoering van de
          overeenkomst), om aanvragen te beantwoorden (gerechtvaardigd belang)
          en om aan wettelijke plichten te voldoen, zoals de administratie- en
          bewaarplicht voor facturen.
        </p>
      </Blok>

      <Blok kop="Waar je gegevens staan (onze leveranciers)">
        <p>
          We zijn transparant over de diensten waarop WordSwap draait. Met deze
          partijen zijn verwerkersovereenkomsten of gelijkwaardige afspraken van
          kracht:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Vercel</strong> — hosting van wordswap.nl en het klantportaal</li>
          <li><strong>Cloudflare</strong> — hosting van de klantwebsites</li>
          <li><strong>Neon</strong> — database (accounts, chatgeschiedenis, formulierinzendingen)</li>
          <li><strong>Clerk</strong> — inloggen en accountbeheer</li>
          <li><strong>Anthropic</strong> — de AI die wijzigingen aan websites uitvoert; chatberichten worden daarvoor aan Anthropic doorgegeven en niet gebruikt om AI-modellen te trainen</li>
          <li><strong>Resend</strong> — het versturen van e-mail (bevestigingen en meldingen)</li>
          <li><strong>GitHub</strong> — opslag van de websitebestanden (broncode, geen persoonsgegevens)</li>
        </ul>
        <p>
          Sommige van deze partijen verwerken gegevens buiten de EU (VS). Dat
          gebeurt op basis van het EU-VS Data Privacy Framework en/of
          EU-standaardcontractbepalingen.
        </p>
      </Blok>

      <Blok kop="Hoe lang we bewaren">
        <p>
          Aanvragen van niet-klanten verwijderen we uiterlijk één jaar na het
          laatste contact. Klantgegevens bewaren we zolang de overeenkomst
          loopt; na beëindiging verwijderen we account- en chatgegevens binnen
          drie maanden. Factuurgegevens bewaren we zeven jaar (wettelijke
          plicht).
        </p>
      </Blok>

      <Blok kop="Jouw rechten">
        <p>
          Je hebt recht op inzage, correctie, verwijdering, beperking,
          overdraagbaarheid en bezwaar. Stuur je verzoek via het{" "}
          <Link href="/contact" className="text-violet-700 underline underline-offset-2">
            contactformulier
          </Link>{" "}
          — we reageren binnen een maand. Niet tevreden met de afhandeling? Je
          kunt een klacht indienen bij de Autoriteit Persoonsgegevens.
        </p>
      </Blok>

      <Blok kop="Beveiliging">
        <p>
          Alle verbindingen zijn versleuteld (HTTPS), toegang tot systemen is
          beperkt tot wat nodig is en wachtwoorden worden nooit door ons
          opgeslagen (dat doet onze inlogdienst met moderne versleuteling).
        </p>
      </Blok>

      <Blok kop="Wijzigingen">
        <p>
          Wijzigt deze verklaring, dan zetten we de nieuwe versie op deze pagina
          met een nieuwe datum bovenaan.
        </p>
      </Blok>
    </div>
  );
}
