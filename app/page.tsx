import Link from "next/link";
import HeroIllustration from "./HeroIllustration";

const herkenbaar = [
  {
    kop: "Wéér een plugin-update",
    tekst:
      "Elke week meldingen: updaten, updaten, updaten. En durf je het niet? Dan ligt je site open voor hackers.",
  },
  {
    kop: "Betalen voor elke aanpassing",
    tekst:
      "Een tekstje wijzigen? Je webbouwer mailen, wachten, en een factuur ontvangen. Voor twee zinnen.",
  },
  {
    kop: "Dure hosting die maar doorloopt",
    tekst:
      "Elke maand betalen, of je site nu iets doet of stilstaat. Plus losse abonnementen voor plugins.",
  },
  {
    kop: "Zelf klooien in WordPress",
    tekst:
      "Inloggen, zoeken waar dat blokje ook alweer zat, per ongeluk iets slopen... en dan maar hopen.",
  },
];

const voordelen = [
  {
    kop: "Typ het, en het staat erop",
    tekst: "Wijziging nodig? Gewoon vragen in de chat. In 1 minuut geregeld.",
  },
  {
    kop: "Nooit meer updates",
    tekst: "Geen plugins, geen lekken, niets te onderhouden. Klaar is klaar.",
  },
  {
    kop: "Bloedsnel & goed voor Google",
    tekst: "Je nieuwe site laadt direct. Google beloont dat met betere posities.",
  },
  {
    kop: "Eerst zien, dan live",
    tekst: "Elke wijziging eerst als preview. Pas na jouw akkoord staat het erop.",
  },
  {
    kop: "Geen lock-in",
    tekst: "Maandelijks opzegbaar. Je site en je AI-account blijven van jou.",
  },
  {
    kop: "Bloggen vanaf je telefoon",
    tekst:
      "Nieuwtje delen? Typ het in de chat, foto erbij, klaar. Geen CMS meer nodig — de AI helpt zelfs met schrijven.",
  },
  {
    kop: "Beschermd tegen spam en hackers",
    tekst:
      "Niets te hacken, en je contactformulier is standaard beveiligd tegen spam-robots.",
  },
  {
    kop: "Eindelijk rust",
    tekst: "Je website is gewoon áf. Jij kunt weer ondernemen.",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 grid items-center gap-14 lg:grid-cols-2">
          <div>
            <h1 className="font-display text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.06]">
              Een website die{" "}
              <span className="text-violet-700">doet wat je zegt</span>
            </h1>
            <p className="font-display mt-5 text-xl sm:text-2xl font-semibold text-stone-800">
              Hét betere alternatief voor je WordPress-website — wij zetten hem
              over, jij hebt er geen onderhoud meer aan.
            </p>
            <p className="mt-6 text-lg text-stone-600 max-w-xl leading-relaxed">
              Nooit meer zelf in WordPress duiken of je webbouwer bellen. Vanaf
              nu geef je een wijziging gewoon dóór — &ldquo;nieuw
              telefoonnummer op de contactpagina&rdquo;, &ldquo;andere foto op
              de homepage&rdquo;, &ldquo;voeg een pagina toe over
              dakisolatie&rdquo; — en de AI voert het uit. Waar het ook staat,
              wat het ook is.
            </p>
            <p className="mt-4 text-lg text-stone-800 max-w-xl leading-relaxed font-medium">
              Jij hoeft niet te weten hoe je website werkt. De AI zet elke
              wijziging voor je klaar, jij bekijkt het resultaat — en als je
              tevreden bent zeg je &ldquo;ja&rdquo;. Meer is het niet.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/contact"
                className="lift rounded-full bg-violet-700 px-7 py-3.5 font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-600"
              >
                Ja, verlos me van het gedoe →
              </Link>
              <Link
                href="/hoe-het-werkt"
                className="lift rounded-full border-2 border-stone-200 bg-white px-7 py-3.5 font-semibold"
              >
                Eerst zien hoe het werkt
              </Link>
            </div>
          </div>
          <div className="float-card">
            <HeroIllustration />
          </div>
        </div>
      </section>

      {/* Van → naar */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="reveal grid items-stretch gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wider text-stone-400">
              Wat je nu hebt
            </p>
            <h2 className="font-display mt-2 text-2xl font-semibold">
              WordPress-website
            </h2>
            <p className="mt-3 text-stone-600 leading-relaxed">
              Zelf inloggen en klikken in een ingewikkeld systeem. Plugins en
              updates bijhouden. Hosting betalen. Of voor elke aanpassing je
              webbouwer inschakelen.
            </p>
          </div>
          <div className="flex items-center justify-center">
            <span className="font-display text-4xl text-violet-700 rotate-90 sm:rotate-0">
              →
            </span>
          </div>
          <div className="rounded-3xl border-2 border-violet-600 bg-violet-50/40 p-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">
              Wat je krijgt
            </p>
            <h2 className="font-display mt-2 text-2xl font-semibold">
              Een website met een eigen AI-beheerder
            </h2>
            <p className="mt-3 text-stone-600 leading-relaxed">
              Dezelfde site, maar zonder onderhoud. Wil je iets veranderd
              hebben? Je geeft het gewoon door, in gewone taal. De AI zoekt
              zelf uit waar het staat en past het aan. Jij bekijkt het
              resultaat en zegt &ldquo;ja&rdquo; — dan staat het live.
            </p>
          </div>
        </div>
      </section>

      {/* Het probleem */}
      <section className="bg-[#f6f1e7] border-y border-stone-200">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="font-display reveal text-center text-4xl sm:text-5xl font-semibold tracking-tight">
            Herken je dit?
          </h2>
          <p className="reveal mt-5 text-center text-lg text-stone-600 max-w-2xl mx-auto">
            Een WordPress-site is nooit af. Hij blijft tijd, geld en energie
            kosten zolang hij bestaat.
          </p>
          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {herkenbaar.map((item) => (
              <div
                key={item.kop}
                className="reveal lift rounded-3xl bg-white border border-stone-200 p-8 shadow-sm"
              >
                <h3 className="text-xl font-bold">{item.kop}</h3>
                <p className="mt-2 text-stone-600">{item.tekst}</p>
              </div>
            ))}
          </div>
          <p className="font-display reveal mt-14 text-center text-2xl sm:text-3xl font-semibold">
            Het kan anders. <span className="text-violet-700">Véél anders.</span>
          </p>
        </div>
      </section>

      {/* De oplossing */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="font-display reveal text-center text-4xl sm:text-5xl font-semibold tracking-tight">
          Zo werkt je website <span className="text-violet-700">vanaf nu</span>
        </h2>
        <p className="reveal mt-5 text-center text-lg text-stone-600 max-w-2xl mx-auto">
          We zetten je site één keer over naar een moderne, veilige omgeving.
          Daarna is aanpassen net zo makkelijk als een appje sturen.
        </p>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {voordelen.map((v) => (
            <div
              key={v.kop}
              className="reveal lift rounded-3xl border border-stone-200 bg-white p-8 shadow-sm"
            >
              <h3 className="text-lg font-bold">{v.kop}</h3>
              <p className="mt-2 text-stone-600 leading-relaxed">{v.tekst}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WordPress heeft toch ook AI? */}
      <section className="bg-[#f6f1e7] border-y border-stone-200">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <h2 className="font-display reveal text-3xl sm:text-4xl font-semibold tracking-tight">
            &ldquo;Maar WordPress heeft toch ook AI?&rdquo;
          </h2>
          <p className="reveal mt-5 text-stone-700 leading-relaxed text-lg">
            Klopt — en het wordt steeds beter. WordPress.com heeft sinds begin
            2026 een ingebouwde AI-assistent die teksten schrijft en je layout
            aanpast, Jetpack AI helpt in de editor, en sommige hosters hebben
            AI-hulpjes die zelfs plugins updaten.
          </p>
          <p className="reveal mt-4 text-stone-700 leading-relaxed text-lg">
            Maar al die AI&apos;s werken <em>ín</em> de WordPress-machine — en
            die machine zelf blijft draaien: updates, plugins, hosting,
            back-ups en beveiligingsrisico&apos;s verdwijnen er niet door.
            De slimste assistent van WordPress.com werkt bovendien alleen op
            wordpress.com-abonnementen, niet op de eigen hosting waar de
            meeste ondernemers zitten. En wijzigingen gaan er direct live —
            zonder concept dat jij eerst goedkeurt.
          </p>
          <p className="reveal mt-4 text-stone-800 leading-relaxed text-lg font-medium">
            Wij doen het andersom: wij halen de machine zelf weg. Geen
            onderhoud, geen updates, niets te hacken — en elke wijziging zie
            je eerst als concept voordat hij live gaat. De AI is niet een
            hulpje in je CMS; hij ís je websitebeheerder. De rust is het
            product.
          </p>
        </div>
      </section>

      {/* Persoonlijke noot */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <div className="reveal rounded-3xl border border-violet-100 bg-violet-50/60 p-10">
          <p className="font-display text-2xl leading-snug text-stone-800">
            &ldquo;Ik heb te veel ondernemers gezien die &apos;s avonds nog
            zaten te worstelen met hun website, die niet durfden te klikken uit
            angst iets kapot te maken, of elke maand betaalden voor iets dat
            stilstond. Dat kan zoveel simpeler. Jij runt je bedrijf — je
            website moet gewoon meewerken.&rdquo;
          </p>
          <p className="mt-6 font-semibold text-violet-700">
            — Jos, oprichter WordSwap
          </p>
          <p className="mt-6 text-stone-600 leading-relaxed">
            En gaat er tóch een keer iets fout? Dan geef je het gewoon door en
            zet de AI het weer goed. Van elke versie van je website wordt
            automatisch een back-up bewaard — je kunt altijd terug naar hoe het
            was.
          </p>
        </div>
      </section>

      {/* Prijs-teaser + CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="reveal rounded-[2.5rem] bg-violet-700 px-8 py-16 text-center text-white shadow-xl shadow-violet-200">
          <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
            Eén keer overstappen.
            <br />
            Voor altijd rust.
          </h2>
          <p className="mt-5 text-lg text-violet-100 max-w-xl mx-auto">
            Eenmalig vanaf €250 voor de overstap (omzetten, SEO-behoud en
            domeinkoppeling), daarna €20 per maand voor de AI-koppeling.
            E-mailmigratie kan er als aanvulling bij. Reken maar na: dat is al
            snel minder dan wat je nu kwijt bent aan hosting en plugins.
          </p>
          <div className="mt-9 flex justify-center flex-wrap gap-4">
            <Link
              href="/contact"
              className="lift rounded-full bg-white px-7 py-3.5 font-semibold text-violet-700"
            >
              Vrijblijvend kennismaken
            </Link>
            <Link
              href="/prijzen"
              className="lift rounded-full border-2 border-violet-400 px-7 py-3.5 font-semibold text-white hover:border-white"
            >
              Alle prijzen
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
