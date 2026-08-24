import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hoe het werkt",
  description:
    "Van WordPress naar een onderhoudsvrije website: e-mail veiligstellen, content overnemen, SEO behouden, live zetten — en daarna alles aanpassen via chat.",
};

const stappen = [
  {
    titel: "We kijken samen naar je huidige site",
    tekst:
      "In een korte kennismaking lopen we door je website: welke pagina's heb je, wat moet er mee, wat mag weg? Je krijgt meteen duidelijkheid over de prijs — geen verrassingen achteraf.",
  },
  {
    titel: "E-mail checken en veiligstellen",
    tekst:
      "We checken eerst waar je e-mail draait. Zit die bij je oude WordPress-hosting in het pakket, dan verhuizen we die eerst naar een aparte e-mailprovider, zodat je mail blijft werken als de oude hosting stopt. Draait je mail al ergens anders (zoals Microsoft 365 of Google Workspace)? Dan hoeft hier niets te gebeuren.",
  },
  {
    titel: "We nemen al je content over",
    tekst:
      "Alle teksten, pagina's en afbeeldingen halen we uit je WordPress-site. Jij hoeft niets aan te leveren — het staat er immers al. Ook je contactformulier bouwen we mee, dat zit gewoon in de prijs.",
  },
  {
    titel: "Je vindbaarheid in Google blijft behouden",
    tekst:
      "We leggen je huidige adressen (URL's) vast en zorgen dat ze blijven werken of netjes doorverwijzen. Je sitemap, paginatitels en beschrijvingen nemen we mee. Zo raak je je positie in Google niet kwijt — vaak word je zelfs beter vindbaar, omdat de nieuwe site veel sneller laadt.",
  },
  {
    titel: "We bouwen je site opnieuw — sneller en veiliger",
    tekst:
      "Je site wordt opnieuw opgebouwd als moderne, razendsnelle website. Het design blijft zoals je het kent (tenzij je juist iets nieuws wilt). Het grote verschil zit onder de motorkap: geen plugins, geen database, niets dat gehackt of geüpdatet moet worden.",
  },
  {
    titel: "Live zetten en nauwkeurig controleren",
    tekst:
      "We zetten je domeinnaam om, dienen de nieuwe sitemap in bij Google en houden de eerste weken in de gaten of alles goed doorkomt. Pas als alles klopt, zeggen we de oude hosting op.",
  },
  {
    titel: "Vanaf nu: aanpassen via chat",
    tekst:
      "Je krijgt toegang tot je eigen omgeving met een chat. Typ wat je wilt — “zet ons nieuwe telefoonnummer op de contactpagina”, “vervang de foto op de homepage” — en de AI zet het voor je klaar.",
  },
];

const faq = [
  [
    "Kan de AI mijn site per ongeluk slopen?",
    "Nee. De AI werkt altijd eerst in een concept-versie. Jij ziet het resultaat vóórdat het live gaat, en alleen jij kunt publiceren. Bovendien bewaren we de complete geschiedenis van je site — elke eerdere versie kan altijd worden teruggezet.",
  ],
  [
    "Wat gebeurt er met mijn positie in Google?",
    "Die nemen we serieus mee in de overstap: alle bestaande adressen blijven werken of verwijzen netjes door, en we melden de nieuwe site aan bij Google. Doordat je site veel sneller wordt, verbetert je vindbaarheid vaak juist.",
  ],
  [
    "Ik heb een formulier / boekingssysteem / webshop op mijn site",
    "Een contactformulier zit standaard in de overstap. Voor bijzondere functies zoals boekingssystemen of ledenportalen maken we een aparte offerte. Webshops zetten we op dit moment nog niet over.",
  ],
  [
    "Kan ik nog zelf bij mijn site?",
    "Ja. Alles van jouw site staat in je eigen omgeving, en op verzoek krijg je daar rechtstreeks toegang toe. Stap je ooit over naar een andere partij, dan neem je gewoon alles mee.",
  ],
  [
    "Hoe snel staat een wijziging live?",
    "De AI zet je wijziging meestal binnen een minuut klaar als concept. Na jouw akkoord duurt het nog één tot twee minuten voordat het op je echte site staat.",
  ],
];

const previewStappen = [
  ["Jij vraagt", "“Zet de openingstijden op de contactpagina: ma-vr 9:00-17:00.”"],
  ["De AI zet het klaar", "Je krijgt binnen een minuut een link naar een concept-versie van je site — je echte site blijft onaangeroerd."],
  ["Jij beoordeelt", "Goed zo? Eén klik op Publiceer. Niet goed? Typ gewoon wat er anders moet, het concept wordt bijgewerkt."],
  ["Het staat live", "Na jouw akkoord staat de wijziging binnen twee minuten op je echte website."],
];

export default function HoeHetWerkt() {
  return (
    <>
      <div className="mx-auto max-w-3xl px-6 pt-20 pb-4">
        <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
          Hoe het werkt
        </h1>
        <p className="mt-5 text-lg text-stone-600 leading-relaxed">
          Eén zorgvuldige overstap, daarna nooit meer onderhoud. We nemen je
          hele site over — inclusief e-mail en je vindbaarheid in Google — en
          jij houdt de regie. Zo pakken we het aan:
        </p>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-12">
        <ol className="space-y-10">
          {stappen.map((stap, i) => (
            <li key={stap.titel} className="reveal flex gap-5">
              <span className="font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-700 text-white font-semibold text-lg">
                {i + 1}
              </span>
              <div>
                <h2 className="font-display text-xl font-semibold">
                  {stap.titel}
                </h2>
                <p className="mt-2 text-stone-600 leading-relaxed">
                  {stap.tekst}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="bg-[#f6f1e7] border-y border-stone-200">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Eerst zien, dan live
          </h2>
          <p className="mt-4 text-stone-600 leading-relaxed">
            Dit is misschien wel het belangrijkste om te weten: er verandert{" "}
            <strong className="text-stone-800">nooit</strong> iets op je site
            zonder jouw akkoord. Vraag je een wijziging aan via de chat, dan
            gebeurt er dit:
          </p>
          <div className="mt-8 space-y-4">
            {previewStappen.map(([kop, tekst], i) => (
              <div
                key={kop}
                className="reveal flex gap-4 rounded-2xl bg-white border border-stone-200 p-5"
              >
                <span className="font-display text-violet-700 font-semibold shrink-0">
                  {i + 1}.
                </span>
                <p className="text-stone-700">
                  <strong className="text-stone-900">{kop}.</strong> {tekst}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="font-display text-3xl font-semibold tracking-tight">
          Veelgestelde vragen
        </h2>
        <div className="mt-8 space-y-8">
          {faq.map(([vraag, antwoord]) => (
            <div key={vraag} className="reveal">
              <h3 className="font-display text-lg font-semibold">{vraag}</h3>
              <p className="mt-2 text-stone-600 leading-relaxed">{antwoord}</p>
            </div>
          ))}
        </div>
        <div className="mt-12">
          <Link
            href="/contact"
            className="lift inline-block rounded-full bg-violet-700 px-7 py-3.5 font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-600"
          >
            Vrijblijvend kennismaken
          </Link>
        </div>
      </div>
    </>
  );
}
