import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Prijzen",
  description:
    "Eenmalig vanaf €500 voor de overstap van WordPress, daarna €20 per maand voor de AI-koppeling. Geen lock-in: opzeggen of overstappen kan altijd.",
};

export default function Prijzen() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-20">
      <h1 className="text-4xl font-bold tracking-tight">Prijzen</h1>
      <p className="mt-4 text-zinc-600">
        Eén keer betalen voor de overstap, daarna een vast laag bedrag per
        maand. Geen verrassingen, geen lock-in.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200 p-6">
          <h2 className="font-semibold text-lg">De overstap</h2>
          <p className="mt-2 text-3xl font-bold">
            vanaf €500 <span className="text-base font-normal text-zinc-500">eenmalig</span>
          </p>
          <ul className="mt-4 space-y-2 text-zinc-600 text-sm">
            <li>Complete migratie van je WordPress-site (tot ± 10 pagina&apos;s)</li>
            <li>Design blijft zoals je het kent</li>
            <li>E-mailmigratie inbegrepen (het e-mailabonnement zelf, vanaf ± €8 p/m, sluit je af bij een Nederlandse provider)</li>
            <li>SEO-behoud: redirects, sitemap, Google Search Console</li>
            <li>Contactformulier standaard inbegrepen</li>
          </ul>
        </div>
        <div className="rounded-3xl border-2 border-violet-600 p-6">
          <h2 className="font-semibold text-lg">De AI-koppeling</h2>
          <p className="mt-2 text-3xl font-bold">
            €20 <span className="text-base font-normal text-zinc-500">per maand</span>
          </p>
          <ul className="mt-4 space-y-2 text-zinc-600 text-sm">
            <li>Wijzigingen aanvragen via chat, met preview vóór publicatie</li>
            <li>Via ons account (alles-inbegrepen, fair use) óf met je eigen AI-account</li>
            <li>Hosting, SSL en domeinkoppeling geregeld (bij uitzonderlijk veel verkeer maken we aparte afspraken)</li>
            <li>Maandelijks opzegbaar, overstappen kan altijd</li>
          </ul>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Maatwerk</h2>
        <p className="mt-2 text-zinc-600">
          Grotere sites, bijzondere functies (zoals boekingssystemen of
          ledenportalen) of een compleet nieuw design (vanaf €1000)? Daarvoor
          maken we een losse offerte.
        </p>
        <Link
          href="/contact"
          className="mt-6 inline-block rounded-lg bg-violet-600 px-6 py-3 text-white font-medium hover:bg-violet-700"
        >
          Vraag een offerte aan
        </Link>
      </section>
    </div>
  );
}
