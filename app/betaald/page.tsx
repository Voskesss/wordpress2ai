import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Bedankt voor je betaling",
  robots: { index: false, follow: false },
};

export default function Betaald() {
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="eyebrow">JE BETALING</p>
      <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">Dank je wel!</h1>
      <p className="mt-5 text-lg leading-relaxed text-stone-600">
        Is je betaling gelukt, dan is je maandbedrag gestart. Vanaf volgende
        maand wordt het automatisch afgeschreven, dus je hoeft er verder niets
        voor te doen. Opzeggen kan altijd per maand.
      </p>
      <p className="mt-3 text-sm text-stone-500">
        Heb je de betaling afgebroken of ging er iets mis? Stuur dan even een
        mailtje naar jos@wordswap.nl, dan maak ik een nieuwe link voor je.
      </p>
      <Link href="/portal" className="button-primary mt-8">
        Naar mijn website →
      </Link>
    </div>
  );
}
