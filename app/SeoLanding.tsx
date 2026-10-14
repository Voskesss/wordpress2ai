import VerhaalBeeld, { type Onderwerp } from "./VerhaalBeeld";
import OverstapVisual from "./OverstapVisual";
import Link from "next/link";
import { tekstDelen, zonderLinks } from "@/lib/tekst-links";
import LeesOok from "./LeesOok";
import Image from "next/image";
import { fotoVoor } from "@/lib/pagina-fotos";

/** Lopende tekst met interne links: [ankertekst](/pad) wordt een echte link. */
function MetLinks({ tekst }: { tekst: string }) {
  return (
    <>
      {tekstDelen(tekst).map((d, i) =>
        d.naar ? (
          <Link key={i} href={d.naar} className="font-medium text-violet-700 underline underline-offset-2 hover:text-violet-900">
            {d.tekst}
          </Link>
        ) : (
          d.tekst
        ),
      )}
    </>
  );
}

/** Een tekstblok, eventueel met stappen, een vinkjeslijst of een tabel
 * erbij. Die vormen breken de tekstmuur en worden door zoekmachines en
 * AI-assistenten graag letterlijk overgenomen. */
export type Blok = {
  kop: string;
  tekst: string;
  stappen?: string[];
  lijst?: string[];
  tabel?: { kop: string[]; rijen: string[][]; bron?: string };
};

export type LandingData = {
  nieuweWebsite?: boolean;
  slug: string;
  label: string; // korte naam voor menu's/footers
  titel: string; // H1 (of de regel onder de korte kop als `kort` er is)
  /** Korte kop van 4 tot 6 woorden; dan wordt `titel` de regel eronder. */
  kort?: string;
  intro: string;
  blokken: Blok[];
  /** Welk beeld bij deze pagina hoort. Stond hard op "ondernemer", waardoor
   *  alle landingspagina's dezelfde illustratie toonden: ook de pagina voor
   *  hoveniers liet een ondernemer in een atelier zien. */
  beeld?: Onderwerp;
  faq: { vraag: string; antwoord: string }[];
};

/** Gedeelde opbouw voor SEO-landingspagina's: content, FAQ (+ structured data), CTA's. */
export default function SeoLanding({ data }: { data: LandingData }) {
  const foto = fotoVoor(data.slug);
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faq.map((f) => ({
      "@type": "Question",
      name: f.vraag,
      acceptedAnswer: { "@type": "Answer", text: zonderLinks(f.antwoord) },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {foto ? (
        <>
          {/* Hero over de volle breedte (wens Jos 14-10-2026): foto met
              witte tekst erover, de uitleg en prijzen eronder. */}
          <section className="landing-breed">
            <Image src={foto.src} alt={foto.alt} fill priority sizes="100vw" className="landing-breed-foto" />
            <div className="landing-breed-schaduw" aria-hidden />
            <div className="shell landing-breed-inhoud">
              <p className="landing-breed-label">{data.label}</p>
              <h1 className="font-display">{data.kort ?? data.titel}</h1>
              {data.kort && <p className="landing-breed-onder">{data.titel}</p>}
              <div className="landing-breed-knoppen">
                <Link href={data.nieuweWebsite ? "/nieuwe-website#intake" : "/contact"} className="lift landing-breed-hoofdknop">
                  {data.nieuweWebsite ? "Bespreek mijn nieuwe website →" : "Kan mijn website overgezet worden? →"}
                </Link>
                <Link href="/demo" className="lift landing-breed-tweede">
                  Probeer de demo
                </Link>
              </div>
            </div>
          </section>
          <div className="mx-auto max-w-3xl px-6 pt-10 pb-10">
            <p className="text-lg text-stone-600 leading-relaxed">{data.intro}</p>
            <ul className="prijs-labels" aria-label="Prijzen">
              {(data.nieuweWebsite
                ? ["Nieuw ontwerp vanaf €250", "daarna vanaf €19 per maand", "excl. btw"]
                : ["Overstap vanaf €150", "daarna vanaf €19 per maand", "excl. btw"]
              ).map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm font-semibold text-emerald-700">
              {data.nieuweWebsite
                ? "✓ Eerst het voorstel bekijken, dan beslissen."
                : "✓ Eerst de kopie bekijken. Zonder akkoord betaal je niet voor de omzetting."}
            </p>
          </div>
        </>
      ) : (
      <div className="shell agency-landing-hero">
        <div>
          <p className="eyebrow">{data.label} · WordSwap</p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
            {data.kort ?? data.titel}
          </h1>
          {data.kort && <p className="landing-onderkop">{data.titel}</p>}
          <p className="mt-5 text-lg text-stone-600 leading-relaxed">
            {data.intro}
          </p>
          <ul className="prijs-labels" aria-label="Prijzen">
            {(data.nieuweWebsite
              ? ["Nieuw ontwerp vanaf €250", "daarna vanaf €19 per maand", "excl. btw"]
              : ["Overstap vanaf €150", "daarna vanaf €19 per maand", "excl. btw"]
            ).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          {data.nieuweWebsite && (
            <p className="mt-2 text-sm text-stone-500">Heb je al een website? Die overzetten kan al vanaf €150.</p>
          )}
          <div className="mt-7 flex flex-wrap gap-4">
            <Link
              href={data.nieuweWebsite ? "/nieuwe-website#intake" : "/contact"}
              className="lift rounded-lg bg-violet-700 px-6 py-3 font-semibold text-white shadow-sm hover:bg-violet-600"
            >
              {data.nieuweWebsite
                ? "Bespreek mijn nieuwe website →"
                : "Kan mijn website overgezet worden? →"}
            </Link>
            <Link
              href="/demo"
              className="lift rounded-lg border-2 border-violet-300 bg-white px-6 py-3 font-semibold text-violet-700"
            >
              Probeer de demo
            </Link>
          </div>
          <p className="mt-4 text-sm font-semibold text-emerald-700">
            {data.nieuweWebsite
              ? "✓ Eerst het voorstel bekijken, dan beslissen."
              : "✓ Eerst de kopie bekijken. Zonder akkoord betaal je niet voor de omzetting."}
          </p>
        </div>
        {data.nieuweWebsite ? (
          <VerhaalBeeld onderwerp={data.beeld ?? "ondernemer"} />
        ) : (
          <OverstapVisual />
        )}
      </div>
      )}

      <div className="mx-auto max-w-3xl px-6 pb-6 space-y-8">
        {data.blokken.map((b) => (
          <section key={b.kop}>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {b.kop}
            </h2>
            <p className="mt-2.5 text-stone-600 leading-relaxed">
              <MetLinks tekst={b.tekst} />
            </p>
            {b.stappen && (
              <ol className="landing-stappen">
                {b.stappen.map((st) => (
                  <li key={st}>
                    <MetLinks tekst={st} />
                  </li>
                ))}
              </ol>
            )}
            {b.lijst && (
              <ul className="landing-vinkjes">
                {b.lijst.map((l) => (
                  <li key={l}>
                    <MetLinks tekst={l} />
                  </li>
                ))}
              </ul>
            )}
            {b.tabel && (
              <div className="landing-tabel">
                <table>
                  <thead>
                    <tr>
                      {b.tabel.kop.map((k) => (
                        <th key={k} scope="col">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.tabel.rijen.map((r) => (
                      <tr key={r.join("|")}>
                        {r.map((c, i) =>
                          i === 0 ? <th key={i} scope="row">{c}</th> : <td key={i}>{c}</td>,
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {b.tabel.bron && <p className="landing-tabel-bron">{b.tabel.bron}</p>}
              </div>
            )}
          </section>
        ))}
      </div>

      <LeesOok pad={`/${data.slug}`} />

      <div className="bg-[#eff3e8] border-y border-stone-200 mt-10">
        <div className="mx-auto max-w-3xl px-6 py-14">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Veelgestelde vragen
          </h2>
          <div className="mt-6 space-y-6">
            {data.faq.map((f) => (
              <div key={f.vraag}>
                <h3 className="font-semibold text-lg">{f.vraag}</h3>
                <p className="mt-1.5 text-stone-600 leading-relaxed">
                  <MetLinks tekst={f.antwoord} />
                </p>
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
          {data.nieuweWebsite
            ? "Vertel over je bedrijf en het ontwerp dat je zoekt. Je krijgt een voorstel om te beoordelen vóór je akkoord geeft."
            : "Stuur je websiteadres. Jos bekijkt binnen twee werkdagen wat er mee kan, wat aandacht vraagt en wat de overstap kost. Gratis en vrijblijvend."}
        </p>
        <div className="mt-6 flex justify-center flex-wrap gap-4">
          <Link
            href={data.nieuweWebsite ? "/nieuwe-website#intake" : "/contact"}
            className="lift rounded-lg bg-violet-700 px-7 py-3.5 font-semibold text-white shadow-sm hover:bg-violet-600"
          >
            {data.nieuweWebsite
              ? "Vertel over je nieuwe website →"
              : "Vraag de gratis check aan →"}
          </Link>
          <Link
            href="/prijzen"
            className="lift rounded-lg border-2 border-stone-200 bg-white px-7 py-3.5 font-semibold"
          >
            Bekijk de prijzen
          </Link>
        </div>
      </div>
    </>
  );
}
