import VerhaalBeeld from "../VerhaalBeeld";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hoe het werkt",
  description:
    "Je bestaande WordPress-site zorgvuldig overzetten met URL’s, structuur en SEO-instellingen. Daarna zelf je website bijhouden met AI-chat.",
};

const stappen = [
  {
    titel: "Eerst kijken we of het past",
    tekst:
      "Stuur je websiteadres. Jos bekijkt je pagina’s en functies en geeft je een duidelijke prijs. Bedrijfssites, blogs en formulieren passen goed. Webshops en ledenportalen zetten we niet over; externe boekingswidgets beoordelen we vooraf.",
  },
  {
    titel: "We nemen je website zorgvuldig over",
    tekst:
      "Je teksten, afbeeldingen en bestaande ontwerp vormen het uitgangspunt. We controleren ook je domein, e-mail en de adressen van je pagina’s. Als e-mailmigratie nodig is, bespreken we de aanvullende kosten vooraf.",
  },
  {
    titel: "Je ziet het resultaat vóór je beslist",
    tekst:
      "Bekijk de kopie en geef je feedback. Bijzondere functies kunnen anders werken; dat bespreken we met je. Niet tevreden met de kopie? Dan zie je kosteloos af van de overstap.",
  },
  {
    titel: "Na jouw akkoord zetten we alles klaar",
    tekst:
      "We koppelen je domein, controleren formulieren en richten eventuele doorverwijzingen in. Je paginatitels, beschrijvingen en sitemap gaan mee. Posities in Google zijn afhankelijk van meer factoren en kunnen we niet garanderen.",
  },
  {
    titel: "Vanaf nu vraag je het gewoon",
    tekst:
      "Je krijgt toegang tot je website-assistent. Beschrijf je wijziging, bekijk het voorbeeld en publiceer wanneer jij tevreden bent. Een vorige versie terugzetten kan ook.",
  },
];

const faq = [
  [
    "Kan de AI mijn site per ongeluk slopen?",
    "De AI kan fouten maken. Daarom werkt die altijd eerst in een concept-versie. Jij ziet het resultaat vóórdat het live gaat, en alleen jij kunt publiceren. Bovendien bewaren we de complete geschiedenis van je site — elke eerdere versie kan altijd worden teruggezet.",
  ],
  [
    "Wat gebeurt er met mijn positie in Google?",
    "Die nemen we serieus mee in de overstap: alle bestaande adressen blijven werken of verwijzen netjes door, en we melden de nieuwe site aan bij Google. Je positie in Google kunnen we niet garanderen.",
  ],
  [
    "Ik heb een formulier / boekingssysteem / webshop op mijn site",
    "Een contactformulier zit standaard in de overstap, en externe boekingswidgets bekijken we per site. Voor ander maatwerk maken we een aparte offerte. Webshops en ledenportalen met inlog zetten we niet over.",
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
  [
    "Jij vraagt",
    "“Zet de openingstijden op de contactpagina: ma-vr 9:00-17:00.”",
  ],
  [
    "De AI zet het klaar",
    "Je krijgt binnen een minuut een link naar een concept-versie van je site — je echte site blijft onaangeroerd.",
  ],
  [
    "Jij beoordeelt",
    "Goed zo? Eén klik op Publiceer. Niet goed? Typ gewoon wat er anders moet, het concept wordt bijgewerkt.",
  ],
  [
    "Het staat live",
    "Na jouw akkoord staat de wijziging binnen twee minuten op je echte website.",
  ],
];

export default function HoeHetWerkt() {
  return (
    <>
      <div className="mx-auto max-w-3xl px-6 pt-20 pb-4 sm:flex sm:items-center sm:gap-8">
        <div className="min-w-0">
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
            Eerst je website behouden. Daarna bijhouden met AI.
          </h1>
          <p className="mt-5 text-lg text-stone-600 leading-relaxed">
            Je bestaande website is het uitgangspunt: ontwerp, pagina-adressen,
            structuur, titels en meta-informatie. Wij controleren de overname;
            jij bekijkt het resultaat. Daarna houd je teksten, foto’s en
            pagina’s zelf actueel met AI.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-12">
        <ol className="space-y-10">
          {stappen.map((stap, i) => (
            <li key={stap.titel} className="reveal flex gap-5">
              <span className="font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-700 text-white font-semibold text-lg">
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

      <section className="shell verhaal-section">
        <VerhaalBeeld onderwerp="ondernemer" />
        <div className="verhaal-copy">
          <p className="eyebrow">VAN EIGEN FOTO NAAR JE WEBSITE</p>
          <h2>Laat zien wat er nieuw is.</h2>
          <p>
            Maak een foto van je werk, stuur hem mee in de chat en vertel waar
            hij moet komen. Bijvoorbeeld: “Vervang de foto op de homepage door
            deze.” Bekijk het resultaat voordat je publiceert.
          </p>
          <Link href="/demo" className="button-primary">
            Probeer het aanpassen →
          </Link>
        </div>
      </section>
      <div className="bg-[#eff3e8] border-y border-stone-200">
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
            className="lift inline-block rounded-lg bg-violet-700 px-7 py-3.5 font-semibold text-white shadow-sm hover:bg-violet-600"
          >
            Laat mijn website gratis checken
          </Link>
        </div>
      </div>
    </>
  );
}
