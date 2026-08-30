import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Algemene voorwaarden",
  description:
    "De algemene voorwaarden van WordSwap: wat we leveren, no cure no pay, aansprakelijkheid en opzegging.",
};

const bijgewerkt = "28 augustus 2026";

function Artikel({ nr, kop, children }: { nr: number; kop: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-semibold tracking-tight">
        {nr}. {kop}
      </h2>
      <div className="mt-3 space-y-3 text-stone-600 leading-relaxed">{children}</div>
    </section>
  );
}

export default function Voorwaarden() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
        Algemene voorwaarden
      </h1>
      <p className="mt-4 text-stone-500 text-sm">Laatst bijgewerkt: {bijgewerkt}</p>
      <p className="mt-6 text-lg text-stone-600 leading-relaxed">
        Dit zijn de voorwaarden waaronder WordSwap (&ldquo;wij&rdquo;) werkt
        voor opdrachtgevers (&ldquo;jij&rdquo;). Door een opdracht te geven of
        onze diensten te gebruiken, ga je hiermee akkoord.
      </p>
      <p className="mt-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
        WordSwap is een dienst van <strong>AI Backoffice</strong>, handelsnaam
        van J.K. Klijnhout Holding B.V. · KvK 09190650 ·
        vestigingsnr. 000013799665 · Lebretweg 72, 6861 ZZ Oosterbeek ·{" "}
        <a href="mailto:info@aibackoffice.nl" className="text-violet-700 underline underline-offset-2">info@aibackoffice.nl</a>
      </p>

      <Artikel nr={1} kop="Wat we leveren">
        <p>
          Wij zetten bestaande websites om naar een snelle, statische website en
          bieden daarna een AI-koppeling waarmee je wijzigingen in gewone taal
          doorgeeft. De omzetting is gericht op een zo getrouw mogelijke kopie
          van de zichtbare inhoud en vormgeving; kleine afwijkingen kunnen
          voorkomen. Webshops, ledenportalen met inlog en vergelijkbare
          dynamische systemen vallen buiten de dienst — dat melden we vooraf
          bij de gratis check. Inbedding van externe diensten (zoals een
          boekingssysteem) en ander maatwerk kan in overleg.
        </p>
      </Artikel>

      <Artikel nr={2} kop="No cure, no pay">
        <p>
          Voor de omzetting betaal je pas nadat je de kopie van je website hebt
          gezien en akkoord hebt gegeven. Geef je geen akkoord, dan betaal je
          voor de omzetting niets en verwijderen we de kopie. Na jouw akkoord is
          het afgesproken bedrag voor de omzetting verschuldigd.
        </p>
      </Artikel>

      <Artikel nr={3} kop="Prijzen en betaling">
        <p>
          Prijzen worden vooraf schriftelijk (per e-mail of offerte) afgesproken
          en zijn exclusief btw, tenzij anders vermeld. De AI-koppeling is een
          maandelijks abonnement, afgestemd op het gebruik. Facturen betaal je
          binnen 14 dagen. Bij uitblijvende betaling kunnen we de AI-koppeling
          pauzeren nadat we je daarover hebben geïnformeerd; de website zelf
          blijft dan gewoon online zolang de overeenkomst loopt.
        </p>
      </Artikel>

      <Artikel nr={4} kop="Jouw verantwoordelijkheden">
        <p>
          Jij staat ervoor in dat je de rechten hebt op de inhoud van je website
          (teksten, beelden, logo&rsquo;s) en dat die inhoud niet onrechtmatig
          is. Wijzigingen die je via de AI-chat doorgeeft, keur je zelf goed
          voordat ze gepubliceerd worden; jij blijft verantwoordelijk voor de
          inhoud van je website. Je domeinnaam blijft van jou en staat op jouw
          naam.
        </p>
      </Artikel>

      <Artikel nr={5} kop="E-mail">
        <p>
          Wij zijn geen e-mailprovider en leveren geen doorlopende
          e-maildiensten of e-mailsupport. Desgewenst helpen we eenmalig en
          tegen meerprijs bij het verhuizen van e-mail naar een externe
          provider; daarna is die provider je aanspreekpunt voor alles rond
          e-mail.
        </p>
      </Artikel>

      <Artikel nr={6} kop="Beschikbaarheid en onderhoud">
        <p>
          We spannen ons in voor een goede beschikbaarheid van de websites die
          we hosten, maar garanderen geen ononderbroken werking. We maken
          gebruik van gerenommeerde externe leveranciers (zie onze{" "}
          <Link href="/privacy" className="text-violet-700 underline underline-offset-2">
            privacyverklaring
          </Link>{" "}
          voor het overzicht); storingen bij die leveranciers, internetstoringen
          en andere overmacht vallen buiten onze invloed. Van elke gepubliceerde
          wijziging bewaren we versies, zodat een eerdere versie teruggezet kan
          worden.
        </p>
      </Artikel>

      <Artikel nr={7} kop="Aansprakelijkheid">
        <p>
          Onze aansprakelijkheid is beperkt tot directe schade en tot maximaal
          het bedrag dat je in de drie maanden voorafgaand aan de gebeurtenis
          aan ons hebt betaald voor de betreffende dienst. We zijn nooit
          aansprakelijk voor indirecte schade, waaronder gederfde winst of
          omzet, verlies van gegevens die buiten onze systemen staan, gemiste
          besparingen, reputatieschade of bedrijfsstagnatie. Ook zijn we niet
          aansprakelijk voor schade door onjuiste of onvolledige inhoud die door
          jou is aangeleverd of door jou is goedgekeurd, door storingen bij
          externe leveranciers, of door zaken rondom e-mail en domeinregistratie
          bij derden. Deze beperkingen gelden niet bij opzet of bewuste
          roekeloosheid van onze kant.
        </p>
      </Artikel>

      <Artikel nr={8} kop="Duur en opzegging">
        <p>
          De AI-koppeling is maandelijks opzegbaar, zonder opzegtermijn langer
          dan één maand. Na beëindiging krijg je op verzoek de bestanden van je
          website mee (die zijn en blijven van jou) en halen we de website
          binnen een maand offline. Wij kunnen de overeenkomst beëindigen met
          een opzegtermijn van drie maanden, zodat je ruim de tijd hebt om te
          verhuizen.
        </p>
      </Artikel>

      <Artikel nr={9} kop="Toepasselijk recht">
        <p>
          Op alle overeenkomsten is Nederlands recht van toepassing. Geschillen
          leggen we eerst aan elkaar voor om samen op te lossen; lukt dat niet,
          dan is de Nederlandse rechter bevoegd.
        </p>
      </Artikel>

      <Artikel nr={10} kop="Wijzigingen">
        <p>
          We kunnen deze voorwaarden wijzigen. Wezenlijke wijzigingen kondigen
          we minimaal een maand vooraf aan; ben je het er niet mee eens, dan kun
          je tot de ingangsdatum kosteloos opzeggen.
        </p>
      </Artikel>
    </div>
  );
}
