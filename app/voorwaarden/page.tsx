import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Algemene voorwaarden",
  description:
    "De algemene voorwaarden van WordSwap: wat we leveren, no cure no pay, aansprakelijkheid en opzegging.",
};

const bijgewerkt = "17 september 2026";

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
        <strong>WordSwap</strong> is een handelsnaam van J.K. Klijnhout Holding
        B.V. · KvK 09190650 · vestigingsnr. 000013799665 · Lebretweg 72, 6861
        ZZ Oosterbeek ·{" "}
        <a href="mailto:info@wordswap.nl" className="text-violet-700 underline underline-offset-2">info@wordswap.nl</a>
      </p>

      <Artikel nr={1} kop="Wat we leveren">
        <p>
          Wij zetten bestaande websites om naar een snelle, statische website en
          bieden daarna een AI-koppeling waarmee je wijzigingen in gewone taal
          doorgeeft. De omzetting is gericht op een zo getrouw mogelijke kopie
          van de zichtbare inhoud en vormgeving; kleine afwijkingen kunnen
          voorkomen. Webshops, ledenportalen met inlog en vergelijkbare
          dynamische systemen vallen buiten de dienst; dat melden we vooraf
          bij de gratis check. Inbedding van externe diensten (zoals een
          boekingssysteem) en ander maatwerk kan in overleg.
        </p>
        <p>
          Bij al onze diensten hebben we een inspanningsverplichting: we doen
          wat je redelijkerwijs mag verwachten van een zorgvuldige
          dienstverlener, maar we garanderen geen bepaald resultaat. Dat geldt
          ook voor wat de AI voorstelt: dat is een voorstel, dat jij controleert
          voordat het live gaat.
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
          maandelijks abonnement, afgestemd op het gebruik. In het basispakket
          stel je vragen per e-mail. Werk dat wij op jouw verzoek voor je doen
          buiten je pakket (zoals een wijziging, advies of het regelen van een
          koppeling) rekenen we per begonnen kwartier tegen het afgesproken
          tarief, na overleg vooraf. Bij Optimaal ontzorgd krijg je voorrang bij
          je vragen en kun je je website bijhouden via WhatsApp. Storingen die
          aan ons te wijten zijn lossen we voor iedereen kosteloos op, in elk
          pakket. Facturen betaal je
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
          inhoud van je website. Je domeinnaam blijft van jou, waar hij ook
          geregistreerd is. Staat hij nog niet op jouw naam, dan helpen we je
          daarbij.
        </p>
        <p>
          Spreekt iemand anders ons aan op de inhoud van jouw website,
          bijvoorbeeld omdat een foto of tekst zonder toestemming is gebruikt,
          dan vrijwaar je ons daarvoor en vergoed je de redelijke kosten die we
          daardoor maken. Dat geldt niet voor inhoud die wij zonder jouw
          verzoek of goedkeuring hebben toegevoegd.
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
        <p>
          Gesprekken met de site-assistent worden opgeslagen. Jij ziet in het
          portaal alleen je eigen gesprek; WordSwap kan gesprekken inzien om de
          kwaliteit en veiligheid van de dienst te bewaken en te verbeteren.
          Zie ook onze privacyverklaring.
        </p>
        <p>
          Voor de gegevens die bezoekers op jouw website achterlaten
          (formulierinzendingen) is WordSwap jouw verwerker. Daarop is de{" "}
          <Link href="/verwerkersovereenkomst" className="text-violet-700 underline underline-offset-2">
            verwerkersovereenkomst
          </Link>{" "}
          van toepassing; die maakt deel uit van deze overeenkomst en je gaat
          ermee akkoord bij je eerste inlog op het portaal of bij je eerste
          betaling.
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
          bij derden.
        </p>
        <p>
          Is er toch schade waarvoor we aansprakelijk zijn, dan is die in elk
          geval beperkt tot het bedrag dat onze beroepsaansprakelijkheidsverzekering
          in dat geval uitkeert, vermeerderd met het eigen risico. Keert de
          verzekering niets uit, dan geldt het maximum van de eerste alinea.
        </p>
        <p>
          Deze beperkingen gelden ook voor iedereen die voor ons werkt of die we
          inschakelen bij de uitvoering. Ze gelden niet bij opzet of bewuste
          roekeloosheid van onze kant.
        </p>
      </Artikel>

      <Artikel nr={8} kop="Fouten melden en termijnen">
        <p>
          Zie je een fout of ben je ergens niet tevreden over, meld het ons dan
          zo snel mogelijk, uiterlijk binnen 30 dagen nadat je het ontdekte,
          per e-mail aan info@wordswap.nl. Geef ons eerst de kans om het binnen
          een redelijke termijn te herstellen. Lukt dat niet, dan kun je ons
          aanspreken op schade.
        </p>
        <p>
          Een vordering op ons vervalt als je die niet binnen twaalf maanden
          nadat je de schade ontdekte, of redelijkerwijs had kunnen ontdekken,
          schriftelijk bij ons hebt gemeld.
        </p>
      </Artikel>

      <Artikel nr={9} kop="Eigendom en geheimhouding">
        <p>
          De inhoud van je website (teksten, beelden, ontwerp en
          websitebestanden) is en blijft van jou. Het WordSwap-platform, de
          software, het portaal en de manier waarop we websites omzetten
          blijven van ons; je krijgt het recht ze te gebruiken zolang de
          overeenkomst loopt.
        </p>
        <p>
          We gaan vertrouwelijk om met wat je ons toevertrouwt en wat we bij
          het werk aan je website zien, en verwachten hetzelfde van jou over
          ons platform. Dat geldt niet voor wat al openbaar is, zoals je
          gepubliceerde website.
        </p>
      </Artikel>

      <Artikel nr={10} kop="Duur en opzegging">
        <p>
          De AI-koppeling is maandelijks opzegbaar, zonder opzegtermijn langer
          dan één maand; opzeggen kan rechtstreeks in je portaal. Bij opzegging
          stopt de automatische afschrijving direct en blijft je website online
          tot het einde van de periode waarvoor je betaald hebt, plus één maand
          extra, zodat je zonder tijdsdruk kunt verhuizen; daarna halen we hem
          offline. Je websitebestanden en gegevens (die zijn en blijven van
          jou) kun je op elk moment zelf downloaden in je portaal, ook na
          opzegging tot het moment van verwijdering. Staan je domeininstellingen bij
          ons, dan ontvang je daarvan een overzicht voor een soepele verhuizing. Wij
          kunnen de overeenkomst beëindigen met een opzegtermijn van drie
          maanden, zodat je ruim de tijd hebt om te verhuizen.
        </p>
      </Artikel>

      <Artikel nr={11} kop="Als je particulier bent">
        <p>
          Gebruik je WordSwap niet voor een bedrijf of beroep, maar als
          particulier, dan gelden de regels die de wet voor consumenten
          voorschrijft. Waar deze voorwaarden daarvan afwijken in jouw nadeel,
          zoals bij de beperking van onze aansprakelijkheid of de termijnen in
          artikel 8, gaan de wettelijke regels voor.
        </p>
      </Artikel>

      <Artikel nr={12} kop="Toepasselijk recht">
        <p>
          Op alle overeenkomsten is Nederlands recht van toepassing. Geschillen
          leggen we eerst aan elkaar voor om samen op te lossen; lukt dat niet,
          dan is de Nederlandse rechter bevoegd.
        </p>
      </Artikel>

      <Artikel nr={13} kop="Wijzigingen">
        <p>
          We kunnen deze voorwaarden wijzigen. Wezenlijke wijzigingen kondigen
          we minimaal een maand vooraf aan; ben je het er niet mee eens, dan kun
          je tot de ingangsdatum kosteloos opzeggen.
        </p>
      </Artikel>
    </div>
  );
}
