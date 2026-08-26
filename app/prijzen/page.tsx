import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Prijzen",
  description:
    "Eenmalig €250 tot €750 voor de overstap van WordPress (afhankelijk van de grootte van je site), daarna €5 tot €20 per maand voor de AI-koppeling, afgestemd op je gebruik. Geen lock-in: opzeggen of overstappen kan altijd.",
};

const overstap = [
  "Complete migratie van je WordPress-site: omzetten, SEO-structuur controleren en domein koppelen",
  "Je design blijft zoals je het kent",
  "E-mailmigratie mogelijk als aanvulling (meerprijs; het e-mailabonnement zelf, vanaf ± €8 p/m, sluit je af bij een Nederlandse provider)",
  "Behoud van je vindbaarheid in Google: doorverwijzingen, sitemap en aanmelding bij Google Search Console",
  "Contactformulier standaard inbegrepen",
  "Oplevering pas als jij tevreden bent",
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
            bedrag vooraf — geen verrassingen achteraf.
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
            e-mailabonnement (vanaf ± €8 p/m) loopt apart bij je
            e-mailprovider.
          </p>
        </div>
      </div>

      {/* Maatwerk */}
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="font-display text-3xl font-semibold tracking-tight">
          Maatwerk
        </h2>
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
              "Wil je de overstap aangrijpen voor een frisse uitstraling? Een nieuw design kan vanaf €1000, inclusief overleg en revisierondes.",
            ],
          ].map(([kop, tekst]) => (
            <div
              key={kop}
              className="reveal rounded-3xl border border-stone-200 bg-white p-7 shadow-sm"
            >
              <h3 className="font-display text-lg font-semibold">{kop}</h3>
              <p className="mt-2 text-stone-600 leading-relaxed text-sm">
                {tekst}
              </p>
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
