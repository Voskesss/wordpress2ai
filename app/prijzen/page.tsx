import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Prijzen",
  description:
    "Eenmalig €250 tot €750 voor de overstap van WordPress (afhankelijk van de grootte van je site), daarna €5 tot €20 per maand voor de AI-koppeling, afgestemd op je gebruik. Geen lock-in: opzeggen of overstappen kan altijd.",
};

const overstap = [
  "Complete migratie van je WordPress-site: omzetten, SEO-structuur controleren en domein koppelen",
  "Een 95%-kopie van je huidige site: in 2 van de 3 gevallen zetten we álles exact over. Speciale plugins, hero-video's of sliders zijn soms lastiger — maar ook die zetten we zo identiek mogelijk over",
  "E-mailmigratie mogelijk als aanvulling (meerprijs; het e-mailabonnement zelf, vanaf ± €4 p/m per mailbox, sluit je af bij een Nederlandse provider — daarna is die provider ook je aanspreekpunt voor mailvragen)",
  "Optioneel: formulier-bevestigingen verstuurd vanaf je éigen domein (bijv. info@jouwbedrijf.nl) — eenmalig €49",
  "Behoud van je vindbaarheid in Google: doorverwijzingen, sitemap en aanmelding bij Google Search Console",
  "Contactformulier standaard inbegrepen",
  "No cure, no pay: eerst zie je de complete kopie van je site — niet tevreden, dan zie je er kosteloos vanaf en betaal je niets",
];

const koppeling = [
  "Onbeperkt vragen stellen in de chat; wijzigingen met preview vóór publicatie (fair use: 30 wijzigingen per maand)",
  "Drie smaken: via ons account (alles-inbegrepen), met je eigen AI-account, of volledig zelfstandig met je eigen AI-tools op je eigen site (expert-optie) — wisselen kan altijd",
  "Hosting, SSL-certificaat en domeinkoppeling geregeld (bij uitzonderlijk veel verkeer maken we aparte afspraken)",
  "Complete versiegeschiedenis: elke eerdere versie van je site kan teruggezet worden",
  "Maandelijks opzegbaar — geen lock-in, je neemt alles mee",
];

const vergelijk = [
  ["Hosting", "€10 – €25 p/m", "Inbegrepen"],
  ["Premium plugins & thema's", "€5 – €30 p/m", "Niet nodig"],
  ["Onderhoud / updates", "Je eigen tijd, of €30+ p/m", "Niet nodig"],
  ["Kleine aanpassing laten doen", "€50 – €90 per keer", "Inbegrepen (via chat)"],
  ["Beveiligingsrisico", "Doorlopend", "Vrijwel geen"],
];

export default function Prijzen() {
  return (
    <>
      <div className="mx-auto max-w-4xl px-6 pt-20">
        <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
          Prijzen
        </h1>
        <p className="mt-5 text-lg text-stone-600 leading-relaxed max-w-2xl">
          Eén keer betalen voor de overstap, daarna een laag maandbedrag dat
          past bij hoe je de AI gebruikt. Geen verrassingen, geen kleine
          lettertjes, geen lock-in.
        </p>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-12 grid gap-6 sm:grid-cols-2">
        <div className="reveal rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <h2 className="font-display text-xl font-semibold">De overstap</h2>
          <p className="mt-3 font-display text-4xl font-semibold">
            €250 – €750{" "}
            <span className="text-base font-normal text-stone-500">eenmalig</span>
          </p>
          <p className="mt-2 text-sm text-stone-500">
            €250 voor een kleine website, tot ± €750 voor een grote of complexe
            site (veel pagina&apos;s, blog, bijzondere functies). Je weet het
            bedrag vooraf — geen verrassingen achteraf. Let op: webshops en ledenportalen
            met inlog kunnen we niet overzetten — gewone bedrijfssites, ook
            met blog, juist wél; een bestaand boekings- of afsprakensysteem
            nemen we gewoon mee en maatwerk is bespreekbaar.
          </p>
          <ul className="mt-6 space-y-3 text-stone-600">
            {overstap.map((punt) => (
              <li key={punt} className="flex gap-3">
                <span className="mt-1 text-violet-600 shrink-0">✓</span>
                {punt}
              </li>
            ))}
          </ul>
          <Link
            href="/contact"
            className="lift mt-7 inline-block rounded-full bg-violet-700 px-6 py-3 font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-600"
          >
            Vraag een vrijblijvende offerte aan →
          </Link>
        </div>
        <div className="reveal rounded-3xl border-2 border-violet-600 bg-violet-50/40 p-8">
          <h2 className="font-display text-xl font-semibold">De AI-koppeling</h2>
          <p className="mt-3 font-display text-4xl font-semibold">
            vanaf €5{" "}
            <span className="text-base font-normal text-stone-500">per maand</span>
          </p>
          <p className="mt-2 text-sm text-stone-500">
            Afgestemd op je gebruik: vanaf €5 per maand als je zelden iets
            verandert, tot €20 als de AI veel voor je werkt. We kijken er
            samen naar — nooit betalen voor wat je niet gebruikt.
          </p>
          <ul className="mt-6 space-y-3 text-stone-600">
            {koppeling.map((punt) => (
              <li key={punt} className="flex gap-3">
                <span className="mt-1 text-violet-600 shrink-0">✓</span>
                {punt}
              </li>
            ))}
          </ul>
          <Link
            href="/demo"
            className="lift mt-7 inline-block rounded-full border-2 border-violet-600 px-6 py-3 font-semibold text-violet-700 hover:bg-violet-100"
          >
            Probeer de demo gratis →
          </Link>
        </div>
      </div>

      {/* Liever een nieuwe website */}
      <div className="mx-auto max-w-4xl px-6 pb-12">
        <div className="reveal rounded-3xl border border-stone-200 bg-white p-8 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-8">
          <div>
            <h2 className="font-display text-xl font-semibold">
              Toch liever een heel nieuwe website? Dat kan ook.
            </h2>
            <p className="mt-2 text-stone-600 leading-relaxed">
              Geen zin om je oude site mee te nemen? We ontwerpen een frisse
              nieuwe website — mét dezelfde AI-koppeling erachter. Vanaf{" "}
              <strong>€350</strong> voor een AI-ontwerp (tot 8 pagina&apos;s;
              grotere sites €500 – €750), of <strong>€1.750</strong> met een
              designer erbij.
            </p>
          </div>
          <Link
            href="/nieuwe-website"
            className="lift mt-5 sm:mt-0 inline-block shrink-0 rounded-full border-2 border-violet-300 bg-white px-6 py-3 font-semibold text-violet-700 hover:bg-violet-50"
          >
            Bekijk nieuwe website →
          </Link>
        </div>
      </div>

      {/* Vergelijking */}
      <div className="bg-[#f6f1e7] border-y border-stone-200">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Wat kost je WordPress-site je nu eigenlijk?
          </h2>
          <p className="mt-4 text-stone-600 leading-relaxed max-w-2xl">
            De meeste ondernemers zijn zich er niet van bewust wat er elke maand
            wegvloeit naar hun website. Zet het eens naast elkaar:
          </p>
          <div className="reveal mt-8 overflow-x-auto rounded-2xl border border-stone-200 bg-white">
            <table className="w-full text-left text-sm sm:text-base">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500">
                  <th className="p-4 font-medium"></th>
                  <th className="p-4 font-medium">Nu met WordPress</th>
                  <th className="p-4 font-medium text-violet-700">
                    Met WordSwap
                  </th>
                </tr>
              </thead>
              <tbody>
                {vergelijk.map(([wat, oud, nieuw]) => (
                  <tr key={wat} className="border-b border-stone-100 last:border-0">
                    <td className="p-4 font-semibold text-stone-800">{wat}</td>
                    <td className="p-4 text-stone-600">{oud}</td>
                    <td className="p-4 font-medium text-violet-700">{nieuw}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-stone-500">
            Bedragen zijn indicatief. Bij WordSwap betaal je €5 – €20 p/m voor
            de AI-koppeling (afgestemd op je gebruik); alleen je
            e-mailabonnement (vanaf ± €4 p/m per mailbox; aliassen zoals
            info@ en naam@ op één mailbox zijn meestal gratis) loopt apart
            bij je e-mailprovider. Wij helpen eenmalig bij de
            e-mailoverstap, maar zijn geen e-mailprovider: voor
            mailproblemen daarna is je e-mailprovider het aanspreekpunt.
          </p>
        </div>
      </div>

      {/* Maatwerk */}
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="flex items-center justify-between gap-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Maatwerk
          </h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mascotte/denkend.webp" alt="" aria-hidden className="hidden w-28 rounded-3xl sm:block" />
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            [
              "Grotere sites",
              "Kleine site ± €250, grote of complexe site tot ± €750. Nóg groter of heel bijzonder? Dan krijg je vooraf een eerlijke offerte.",
            ],
            [
              "Extra functies",
              "Een prijscalculator, offerte-aanvrager, boekingssysteem of specifiek formulier op je site? Altijd bespreekbaar. Doordat de AI het bouwwerk doet, kost dit een fractie van wat een webbouwer er vroeger voor rekende.",
            ],
            [
              "Nieuw design",
              "Wil je een frisse uitstraling of een compleet nieuwe site? AI-ontwerp vanaf €750, ontwerp door een designer vanaf €1750.",
              "/nieuwe-website",
              "Bekijk nieuwe website →",
            ],
          ].map(([kop, tekst, href, linkTekst]) => (
            <div
              key={kop}
              className="reveal rounded-3xl border border-stone-200 bg-white p-7 shadow-sm flex flex-col"
            >
              <h3 className="font-display text-lg font-semibold">{kop}</h3>
              <p className="mt-2 text-stone-600 leading-relaxed text-sm">
                {tekst}
              </p>
              {href && (
                <Link
                  href={href}
                  className="mt-auto pt-4 inline-block text-sm font-semibold text-violet-700 hover:text-violet-900"
                >
                  {linkTekst}
                </Link>
              )}
            </div>
          ))}
        </div>
        <div className="mt-12">
          <Link
            href="/contact"
            className="lift inline-block rounded-full bg-violet-700 px-7 py-3.5 font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-600"
          >
            Vraag een vrijblijvende offerte aan
          </Link>
        </div>
      </div>
    </>
  );
}
