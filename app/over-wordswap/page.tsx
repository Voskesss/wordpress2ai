import type { Metadata } from "next";
import Link from "next/link";
import { josFoto } from "@/lib/persoonlijk";

export const metadata: Metadata = {
  title: "Over WordSwap — wie, wat en waarom",
  description:
    "WordSwap is een Nederlandse dienst van AI Backoffice (Oosterbeek) die WordPress-websites omzet naar snelle websites zonder onderhoud, die je daarna aanpast door het te typen. Opgericht door Jos Klijnhout.",
  alternates: { canonical: "/over-wordswap" },
};

const feiten: [string, string][] = [
  ["Wat", "WordSwap zet WordPress-websites om naar snelle, statische websites zonder onderhoud. De eigenaar past de site daarna aan via een AI-chat: typen wat er anders moet, voorbeeld bekijken, publiceren."],
  ["Voor wie", "Nederlandse ondernemers en kleine teams met een bedrijfswebsite: schilders, administratiekantoren, fysiotherapeuten, adviseurs, bakkers — sites met pagina's, foto's, een blog en formulieren. Niet voor webshops of ledenportalen met inlog."],
  ["Wie", "Opgericht door Jos Klijnhout. WordSwap is een dienst van AI Backoffice, handelsnaam van J.K. Klijnhout Holding B.V., KvK 09190650, gevestigd aan de Lebretweg 72, 6861 ZZ Oosterbeek."],
  ["Sinds", "2026. WordSwap is ontstaan uit de ergernis van ondernemers die elke maand betaalden voor een website die vooral aandacht vroeg: updates, plugins, hosting en een webbouwer voor twee zinnen tekst."],
  ["Prijzen", "Overstap eenmalig €150 (kleine site) tot €650 (grote of complexe site), no cure no pay: je ziet eerst de complete kopie en betaalt alleen als je hem houdt. Daarna €5 tot €20 per maand voor de AI-koppeling, afgestemd op gebruik, maandelijks opzegbaar. Nieuwe website met AI-ontwerp vanaf €250, met designer vanaf €1750."],
  ["Techniek", "Sites worden gehost als statische bestanden op het wereldwijde netwerk van Cloudflare. Geen WordPress-database of plugins om bij te werken. We zorgen voor de SEO-structuur: titels, omschrijvingen, sitemap en oude adressen (301-redirects) gaan mee. De AI kan uitsluitend bij de bestanden van de eigen site."],
  ["Geen lock-in", "De site bestaat uit gewone web-bestanden die van de klant zijn. Maandelijks opzegbaar; de klant kan altijd weg met alles."],
  ["Transparantie", "WordSwap publiceert een complete handleiding om het zélf te doen (wordswap.nl/zelf-doen) en geeft gratis webinars."],
];

export default function OverWordSwap() {
  const foto = josFoto();
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">Achter WordSwap staat een mens.</h1>
      <p className="mt-5 text-lg text-stone-600 leading-relaxed">
        <strong>WordSwap</strong> is een Nederlandse dienst die WordPress-websites omzet naar
        snelle websites zonder onderhoud — en die je daarna aanpast door gewoon te
        typen wat er anders moet. Je hebt rechtstreeks contact met oprichter Jos Klijnhout, van je eerste vraag tot de overstap.
      </p>

      {foto && (
        <div className="mt-8 flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={foto} alt="Jos Klijnhout, oprichter van WordSwap" width={88} height={88} className="h-22 w-22 rounded-2xl object-cover" />
          <div>
            <p className="font-semibold">Jos Klijnhout</p>
            <p className="text-sm text-stone-600">Oprichter van WordSwap en eigenaar van AI Backoffice, Oosterbeek</p>
          </div>
        </div>
      )}

      <dl className="mt-10 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
        {feiten.map(([kop, tekst]) => (
          <div key={kop} className="grid gap-2 p-5 sm:grid-cols-[8rem_1fr]">
            <dt className="font-semibold text-violet-700">{kop}</dt>
            <dd className="text-stone-700 leading-relaxed">{tekst}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/hoe-het-werkt" className="rounded-lg bg-violet-700 px-6 py-3 font-semibold text-white hover:bg-violet-600">Hoe het werkt</Link>
        <Link href="/wordswap-vs-wordpress" className="rounded-full border border-stone-300 px-6 py-3 font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700">WordSwap vs. WordPress</Link>
        <Link href="/contact" className="rounded-full border border-stone-300 px-6 py-3 font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700">Contact</Link>
      </div>
    </div>
  );
}
