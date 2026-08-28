import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Bedankt voor je bericht",
  description: "We hebben je bericht ontvangen en nemen binnen één werkdag contact op.",
  robots: { index: false, follow: true },
};

export default function Bedankt() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-28 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="font-display mt-8 text-4xl sm:text-5xl font-semibold tracking-tight">
        Bedankt voor je bericht!
      </h1>
      <p className="mt-5 text-lg text-stone-600 leading-relaxed">
        We hebben het goed ontvangen — je krijgt zo ook een bevestiging per
        e-mail. Binnen één werkdag hoor je van ons, met een eerlijk antwoord en
        een vaste prijs.
      </p>
      <p className="mt-3 text-sm font-semibold text-emerald-700">
        ✓ No cure, no pay: niet tevreden met de kopie van je site, dan betaal je niets.
      </p>
      <div className="mt-9 flex justify-center flex-wrap gap-4">
        <Link
          href="/demo"
          className="lift rounded-full bg-violet-700 px-7 py-3.5 font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-600"
        >
          Probeer alvast de demo
        </Link>
        <Link
          href="/hoe-het-werkt"
          className="lift rounded-full border-2 border-stone-200 bg-white px-7 py-3.5 font-semibold"
        >
          Zo werkt het
        </Link>
      </div>
    </div>
  );
}
