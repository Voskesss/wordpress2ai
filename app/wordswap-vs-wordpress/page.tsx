import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "WordSwap vs. WordPress — de eerlijke vergelijking",
  description:
    "WordPress of WordSwap? Vergelijk onderhoud, snelheid, veiligheid, kosten en het aanpassen van je site. Inclusief wanneer WordPress wél de betere keuze is.",
  alternates: { canonical: "/wordswap-vs-wordpress" },
};

const rijen: [string, string, string][] = [
  ["Aanpassen van teksten en foto's", "Inloggen, beheerscherm, juiste blok vinden, opslaan", "Typen wat er anders moet in een chat; voorbeeld bekijken; publiceren"],
  ["Onderhoud", "Updates van WordPress, thema en plugins; back-ups; onderhoudscontract", "Geen — er draait niets dat bijgewerkt moet worden"],
  ["Snelheid", "Afhankelijk van hosting en plugins; vaak 2–5 seconden laadtijd", "Statische bestanden op het Cloudflare-netwerk; laadt vrijwel direct"],
  ["Veiligheid", "Inlogscherm, database en plugins zijn doelwit; gehackte sites komen veel voor", "Geen inlog, geen database, geen plugins: niets te hacken"],
  ["Kosten per maand", "Hosting €10–25, premium plugins €5–30, onderhoud €30+, webbouwer voor wijzigingen", "€5–€20 voor de AI-koppeling, verder niets"],
  ["Eenmalige kosten", "Bouw door een bureau €1.500–€5.000+", "Overstap €150–€650 (no cure no pay); nieuwe site vanaf €250"],
  ["Vindbaarheid (SEO)", "Goed, mits plugins en snelheid op orde", "Zelfde titels, omschrijvingen en adressen; sneller, dus vaak beter"],
  ["Webshop / ledenportaal", "Ja (WooCommerce, ledenplugins)", "Nee — daarvoor is een draaiend systeem nodig"],
  ["Eigendom en vertrek", "Site is van jou, maar verhuizen vraagt technische hulp", "Gewone web-bestanden die je zo meeneemt; maandelijks opzegbaar"],
  ["Wie doet het werk", "Jij, of je webbouwer per wijziging", "Jij typt, de AI voert uit; jij keurt goed"],
];

const faq: [string, string][] = [
  ["Wanneer is WordPress wél de betere keuze?", "Bij een webshop, een ledenomgeving met inlog, een boekingssysteem met live agenda of een cursusplatform. Die hebben een draaiend systeem nodig. Ook als je een team hebt dat dagelijks tientallen redactionele artikelen plaatst en gehecht is aan de WordPress-editor."],
  ["Verlies ik mijn Google-posities bij de overstap?", "Nee. WordSwap neemt paginatitels, meta-omschrijvingen en de sitemap letterlijk over, en elk oud adres verwijst met een 301 door naar de nieuwe plek. In de praktijk stijgen posities eerder, omdat de site veel sneller wordt."],
  ["Kan ik terug naar WordPress?", "Ja. Je site bestaat uit gewone web-bestanden en al je teksten en foto's blijven van jou. Er is geen lock-in en het abonnement is maandelijks opzegbaar."],
  ["Is een website zonder WordPress niet beperkt?", "Voor een bedrijfssite niet: pagina's, blog, foto's, formulieren en vindbaarheid werken allemaal. Het enige dat verdwijnt is het beheerscherm — en de updates."],
];

export default function Vergelijking() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(([v, a]) => ({ "@type": "Question", name: v, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">WordSwap vs. WordPress</h1>
      <p className="mt-5 max-w-2xl text-lg text-stone-600 leading-relaxed">
        Een eerlijke vergelijking — inclusief de gevallen waarin WordPress gewoon
        de betere keuze is. WordPress is een systeem dat je website bij elk
        bezoek opbouwt en dat jij onderhoudt; WordSwap maakt van je site platte,
        snelle bestanden en laat een AI het beheer doen op jouw aanwijzing.
      </p>

      <div className="mt-10 overflow-x-auto rounded-3xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left">
            <tr>
              <th className="p-4 font-semibold"> </th>
              <th className="p-4 font-semibold">WordPress</th>
              <th className="p-4 font-semibold text-violet-700">WordSwap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rijen.map(([k, wp, ws]) => (
              <tr key={k}>
                <th className="p-4 align-top text-left font-semibold text-stone-800">{k}</th>
                <td className="p-4 align-top text-stone-600">{wp}</td>
                <td className="p-4 align-top text-stone-800">{ws}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="font-display mt-14 text-3xl font-semibold tracking-tight">Veelgestelde vragen</h2>
      <div className="mt-6 space-y-4">
        {faq.map(([v, a]) => (
          <details key={v} className="rounded-2xl border border-stone-200 bg-white p-5">
            <summary className="cursor-pointer font-semibold">{v}</summary>
            <p className="mt-3 text-stone-600 leading-relaxed">{a}</p>
          </details>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/contact" className="rounded-full bg-violet-700 px-6 py-3 font-semibold text-white hover:bg-violet-600">Gratis site-check</Link>
        <Link href="/demo" className="rounded-full border border-stone-300 px-6 py-3 font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700">Probeer de demo</Link>
      </div>
    </div>
  );
}
