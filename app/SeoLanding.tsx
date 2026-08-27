import Link from "next/link";

export type LandingData = {
  slug: string;
  label: string; // korte naam voor menu's/footers
  titel: string; // H1
  intro: string;
  blokken: { kop: string; tekst: string }[];
  faq: { vraag: string; antwoord: string }[];
};

/** Gedeelde opbouw voor SEO-landingspagina's: content, FAQ (+ structured data), CTA's. */
export default function SeoLanding({ data }: { data: LandingData }) {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faq.map((f) => ({
      "@type": "Question",
      name: f.vraag,
      acceptedAnswer: { "@type": "Answer", text: f.antwoord },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="mx-auto max-w-3xl px-6 pt-20 pb-10">
        <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
          {data.titel}
        </h1>
        <p className="mt-5 text-lg text-stone-600 leading-relaxed">{data.intro}</p>
        <div className="mt-7 flex flex-wrap gap-4">
          <Link
            href="/contact"
            className="lift rounded-full bg-violet-700 px-6 py-3 font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-600"
          >
            Gratis site-check aanvragen →
          </Link>
          <Link
            href="/demo"
            className="lift rounded-full border-2 border-violet-300 bg-white px-6 py-3 font-semibold text-violet-700"
          >
            Probeer de demo
          </Link>
        </div>
        <p className="mt-4 text-sm font-semibold text-emerald-700">
          ✓ No cure, no pay: niet tevreden met de kopie van je site, dan betaal je niets.
        </p>
      </div>

      <div className="mx-auto max-w-3xl px-6 pb-6 space-y-8">
        {data.blokken.map((b) => (
          <section key={b.kop}>
            <h2 className="font-display text-2xl font-semibold tracking-tight">{b.kop}</h2>
            <p className="mt-2.5 text-stone-600 leading-relaxed">{b.tekst}</p>
          </section>
        ))}
      </div>

      <div className="bg-[#f6f1e7] border-y border-stone-200 mt-10">
        <div className="mx-auto max-w-3xl px-6 py-14">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Veelgestelde vragen
          </h2>
          <div className="mt-6 space-y-6">
            {data.faq.map((f) => (
              <div key={f.vraag}>
                <h3 className="font-semibold text-lg">{f.vraag}</h3>
                <p className="mt-1.5 text-stone-600 leading-relaxed">{f.antwoord}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-14 text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold">
          Benieuwd wat het voor jouw site betekent?
        </h2>
        <p className="mt-3 text-stone-600">
          Stuur je websiteadres en je krijgt binnen één werkdag een eerlijk antwoord
          en een vaste prijs — vrijblijvend.
        </p>
        <div className="mt-6 flex justify-center flex-wrap gap-4">
          <Link
            href="/contact"
            className="lift rounded-full bg-violet-700 px-7 py-3.5 font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-600"
          >
            Vraag de gratis check aan →
          </Link>
          <Link
            href="/prijzen"
            className="lift rounded-full border-2 border-stone-200 bg-white px-7 py-3.5 font-semibold"
          >
            Bekijk de prijzen
          </Link>
        </div>
      </div>
    </>
  );
}
