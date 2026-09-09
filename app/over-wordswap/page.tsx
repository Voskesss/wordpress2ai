import { aanbod } from "@/lib/aanbod";
import type { Metadata } from "next";
import Link from "next/link";
import PersoonlijkBlok from "../PersoonlijkBlok";

export const metadata: Metadata = {
  title: "Over WordSwap — wie, wat en waarom",
  description:
    "WordSwap is een Nederlandse dienst van AI Backoffice (Oosterbeek) die WordPress-websites omzet naar snelle websites zonder WordPress-beheer, die je daarna aanpast door het te typen. Opgericht door Jos Klijnhout.",
  alternates: { canonical: "/over-wordswap" },
};

const feiten: [string, string][] = [
  [
    "Wat",
    "WordSwap zet WordPress-websites om naar snelle, statische websites zonder WordPress-beheer. De eigenaar past de site daarna aan via een AI-chat: typen wat er anders moet, voorbeeld bekijken, publiceren.",
  ],
  [
    "Voor wie",
    "Nederlandse ondernemers en kleine teams met een bedrijfswebsite: schilders, administratiekantoren, fysiotherapeuten, adviseurs, bakkers — sites met pagina's, foto's, een blog en formulieren. Niet voor webshops of ledenportalen met inlog.",
  ],
  [
    "Wie",
    "Opgericht door Jos Klijnhout. WordSwap is een dienst van AI Backoffice, handelsnaam van J.K. Klijnhout Holding B.V., KvK 09190650, gevestigd aan de Lebretweg 72, 6861 ZZ Oosterbeek.",
  ],
  [
    "Sinds",
    "2026. WordSwap is ontstaan uit de ergernis van ondernemers die elke maand betaalden voor een website die vooral aandacht vroeg: updates, plugins, hosting en een webbouwer voor twee zinnen tekst.",
  ],
  ["Prijzen", aanbod.prijs],
  [
    "Techniek",
    "Sites worden gehost als statische bestanden op het wereldwijde netwerk van Cloudflare. Geen WordPress-database of plugins om bij te werken. We zorgen voor de SEO-structuur: titels, omschrijvingen, sitemap en oude adressen (301-redirects) gaan mee. Wijzigingen via de chat worden eerst als concept klaargezet.",
  ],
  [
    "Geen lock-in",
    "De site bestaat uit gewone web-bestanden die van de klant zijn. Maandelijks opzegbaar; de klant kan altijd weg met alles.",
  ],
  [
    "Transparantie",
    "WordSwap publiceert een complete handleiding om het zélf te doen (wordswap.nl/zelf-doen) en geeft gratis webinars.",
  ],
];

export default function OverWordSwap() {
  return (
    <div className="shell agency-about">
      <div className="agency-about-intro">
        <div>
          <p className="eyebrow">WORDSWAP · OOSTERBEEK</p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
            Je hoeft geen verstand van websites te hebben.
            <br />
            Je mag wel weten wie je helpt.
          </h1>
          <p className="mt-6 text-lg text-stone-600 leading-relaxed">
            Ik ben Jos Klijnhout, oprichter van WordSwap. Ik help je om je
            bestaande WordPress-website zorgvuldig over te zetten en het
            dagelijkse beheer eenvoudiger te maken.
          </p>
          <p className="mt-5 text-lg text-stone-600 leading-relaxed">
            We beginnen bij jouw bedrijf en de website die je al hebt. Wat moet
            behouden blijven? Wat werkt nu lastig? En wat wil je straks zelf
            kunnen aanpassen? Dat bespreken we voordat er iets verandert.
          </p>
          <Link href="/contact" className="button-primary mt-7">
            Bespreek je website met mij →
          </Link>
        </div>
        <PersoonlijkBlok hero />
      </div>
      <div className="agency-about-details">
        <h2>Wie je inschakelt, in gewone taal.</h2>
        <dl className="mt-10 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
          {feiten.map(([kop, tekst]) => (
            <div key={kop} className="grid gap-2 p-5 sm:grid-cols-[8rem_1fr]">
              <dt className="font-semibold text-violet-700">{kop}</dt>
              <dd className="text-stone-700 leading-relaxed">{tekst}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/hoe-het-werkt"
            className="rounded-lg bg-violet-700 px-6 py-3 font-semibold text-white hover:bg-violet-600"
          >
            Hoe het werkt
          </Link>
          <Link
            href="/wordswap-vs-wordpress"
            className="rounded-full border border-stone-300 px-6 py-3 font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700"
          >
            WordSwap vs. WordPress
          </Link>
          <Link
            href="/contact"
            className="rounded-full border border-stone-300 px-6 py-3 font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700"
          >
            Contact
          </Link>
        </div>
      </div>
    </div>
  );
}
