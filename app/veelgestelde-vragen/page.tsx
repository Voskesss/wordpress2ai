import type { Metadata } from "next";
import Link from "next/link";
import { aankoopVragen } from "@/lib/aanbod";

export const metadata: Metadata = {
  title: "Veelgestelde vragen over WordSwap",
  description:
    "Alle antwoorden op één plek: wat je via de chat kunt aanpassen, of je vastzit aan WordSwap, wat het kost, veiligheid, SEO en teruggaan naar WordPress.",
  alternates: { canonical: "/veelgestelde-vragen" },
};

export default function VeelgesteldeVragen() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: aankoopVragen.map(([v, a]) => ({
      "@type": "Question",
      name: v,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="eyebrow">ALLE ANTWOORDEN OP ÉÉN PLEK</p>
      <h1 className="font-display mt-4 text-4xl sm:text-5xl font-semibold tracking-tight">Veelgestelde vragen</h1>
      <p className="mt-6 text-lg leading-relaxed text-stone-600">
        Eerlijke antwoorden, ook als het antwoord &quot;nee&quot; is. Staat je vraag er niet bij? Stel hem via het{" "}
        <Link href="/contact" className="text-violet-700 underline underline-offset-2">
          contactformulier
        </Link>{" "}
        — je krijgt binnen één werkdag antwoord van Jos zelf.
      </p>
      <div className="mt-10 space-y-4">
        {aankoopVragen.map(([v, a]) => (
          <details key={v} className="rounded-2xl border border-stone-200 bg-white p-5">
            <summary className="cursor-pointer font-semibold">{v}</summary>
            <p className="mt-3 leading-relaxed text-stone-600">{a}</p>
          </details>
        ))}
      </div>
      <div className="button-row mt-12">
        <Link href="/contact" className="button-primary">
          Stel je vraag of vraag de gratis check aan ↗
        </Link>
        <Link href="/demo" className="button-text">
          Probeer eerst de demo →
        </Link>
      </div>
    </div>
  );
}
