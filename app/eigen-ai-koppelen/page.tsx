import type { Metadata } from "next";
import LeesOok from "../LeesOok";
import Link from "next/link";
import { SEO_PAGINAS, datumNl, paginaJsonLd } from "@/lib/seo-paginas";

/**
 * Tegenhanger van de "WordPress AI"-uitleg elders (15-10-2026, wens Jos): daar
 * gaat het om AI ín WordPress (API-sleutel, betalen per gebruik, losse
 * knopjes). Hier: je eigen ChatGPT of Claude gebruiken om je hele website
 * te beheren. Eerlijk over wat er nu al kan; de rechtstreekse koppeling
 * (MCP) is nog niet gebouwd en staat er als "komt eraan".
 */
export const metadata: Metadata = {
  title: "Je website beheren met ChatGPT of Claude",
  description:
    "Je eigen ChatGPT of Claude gebruiken voor je website, zonder API-sleutel of plug-ins: zo werkt het vandaag, wat het kost en wat eraan komt.",
  alternates: { canonical: "/eigen-ai-koppelen" },
};

const PAD = "/eigen-ai-koppelen";

const vergelijking: [string, string, string][] = [
  ["Wat de AI doet", "Losse taken: een titel, samenvatting of alt-tekst voorstellen", "Je hele website: teksten, foto’s, nieuwe pagina’s, menu’s en formulieren"],
  ["Koppelen", "API-sleutel bij OpenAI, Anthropic of Google aanmaken en invullen", "Niets: de AI-chat zit in je WordSwap-omgeving"],
  ["Kosten", "Betalen per gebruik bij de AI-aanbieder, los van je abonnement", "Inbegrepen in je maandbedrag (fair use)"],
  ["Onderhoud", "WordPress, thema en plug-ins blijven updates nodig hebben", "Geen updates of plug-ins: hosting en beveiliging regelen wij"],
  ["Controle", "Je accepteert AI-tekst in de editor", "Voorbeeld eerst, jij publiceert, eerdere versie altijd terug te zetten"],
];

const prompts = [
  {
    kop: "Een nieuwe dienstpagina",
    tekst: "Schrijf een korte pagina over onze nieuwe dienst dakisolatie: wat het is, voor wie, wat het oplevert en een oproep om contact op te nemen. Toon: vriendelijk en zakelijk, maximaal 250 woorden.",
  },
  {
    kop: "Een blog uit je aantekeningen",
    tekst: "Maak van deze aantekeningen een blogbericht van ongeveer 400 woorden met tussenkopjes. Verzin niets wat er niet in staat. [plak je aantekeningen]",
  },
  {
    kop: "Je teksten nalopen",
    tekst: "Lees deze tekst van mijn website en geef drie concrete verbeteringen: duidelijker, korter en beter vindbaar. [plak de tekst]",
  },
  {
    kop: "Een vakantiemelding",
    tekst: "Schrijf een korte, vriendelijke melding dat we van 24 t/m 26 december gesloten zijn en daarna weer bereikbaar.",
  },
];

const routes = [
  {
    kop: "De ingebouwde AI-chat",
    label: "Voor iedereen",
    tekst: "Je typt of spreekt in wat er anders moet en de AI voert het uit op je eigen site. Je ziet eerst een voorbeeld en publiceert zelf. Foto’s vervangen en je Google-teksten aanpassen kan ook zonder AI, met een paar klikken.",
  },
  {
    kop: "Je eigen ChatGPT of Claude laten meeschrijven",
    label: "Vandaag al",
    tekst: "Laat je eigen assistent teksten bedenken, nalopen of herschrijven, en plak het resultaat in de WordSwap-chat. Onze AI zet het op de juiste plek in de stijl van je site, met hetzelfde voorbeeld-eerst-vangnet.",
  },
  {
    kop: "Experts: AI-codetools op de bestanden",
    label: "Op afspraak",
    tekst: "Een WordSwap-site is een map met gewone webbestanden. Werk je zelf met Claude Code, Cursor of een vergelijkbare tool, dan kun je op afspraak rechtstreeks toegang krijgen. Wat je doorzet, zetten wij live, en elke stap blijft terug te draaien. Let op: deze route gaat buiten het voorbeeld-eerst-vangnet om.",
  },
];

const faq: [string, string][] = [
  [
    "Kan ik mijn eigen ChatGPT of Claude gebruiken om mijn website te beheren?",
    "Ja. Vandaag laat je je eigen assistent de tekst of wijziging bedenken en plak je het resultaat in de WordSwap-chat; die zet het op je site, met eerst een voorbeeld. Een rechtstreekse koppeling, waarbij je assistent zelf een wijziging klaarzet die jij alleen nog goedkeurt, is in voorbereiding.",
  ],
  [
    "Heb ik een API-sleutel van OpenAI of Anthropic nodig?",
    "Nee. De AI-chat in WordSwap zit in je maandbedrag en werkt zonder eigen sleutel. Gebruik je daarnaast je eigen ChatGPT of Claude om teksten te schrijven, dan loopt dat via je eigen abonnement daar.",
  ],
  [
    "Wat is het verschil met AI in WordPress?",
    "In WordPress koppel je een AI-aanbieder met een API-sleutel, en plug-ins gebruiken die voor losse taken zoals een titel of alt-tekst; je betaalt per gebruik en het onderhoud aan WordPress blijft. Bij WordSwap vraag je de AI om je hele website aan te passen, zonder sleutel, plug-ins of updates.",
  ],
  [
    "Wat is MCP?",
    "MCP (Model Context Protocol) is een open standaard waarmee een AI-assistent zoals Claude of ChatGPT met andere systemen kan werken. Daarmee kan je assistent straks rechtstreeks een wijziging op je WordSwap-site klaarzetten. Publiceren blijft altijd jouw stap.",
  ],
  [
    "Is het veilig om AI mijn website te laten aanpassen?",
    "Elke wijziging via de chat komt eerst als voorbeeld; pas als jij op publiceren drukt, gaat hij live. Een eerdere versie terugzetten kan altijd. Een externe AI krijgt nooit zelf de knop om te publiceren.",
  ],
  [
    "Wat kost het?",
    "De AI-chat zit in het basispakket vanaf €19 per maand en in Optimaal ontzorgd (€39 per maand), allebei exclusief btw en maandelijks opzegbaar. Daar komt geen rekening per gebruik bij, binnen de ruime fair-use-grens voor normaal beheer.",
  ],
];

export default function EigenAiKoppelen() {
  const pagina = SEO_PAGINAS.find((p) => p.pad === PAD);
  const jsonLd = paginaJsonLd(PAD, "Je website beheren met ChatGPT of Claude");
  return (
    <div className="eai">
      {/* Hero */}
      <section className="eai-hero">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
          <div>
            <p className="eai-label">ChatGPT · Claude · Gemini</p>
            <h1 className="eai-h1">
              Je website beheren met ChatGPT of Claude.
              <em>Zonder API-sleutel, plug-ins of updates.</em>
            </h1>
            <p className="eai-intro">
              Met WordSwap gebruik je AI voor je hele website, niet voor één knopje in een editor. De AI-chat zit
              ingebouwd, en je eigen ChatGPT of Claude kan meeschrijven. Jij ziet elke wijziging eerst als voorbeeld en
              publiceert zelf.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact" className="lift eai-knop">
                Kan mijn website overgezet worden? ↗
              </Link>
              <Link href="/demo" className="eai-knop-twee">
                Probeer de chat in de demo
              </Link>
            </div>
          </div>

          {/* Zo ziet het eruit: eigen AI schrijft, WordSwap zet het neer */}
          <div className="eai-mock" aria-hidden>
            <div className="eai-venster">
              <p className="eai-venster-kop">Je eigen ChatGPT of Claude</p>
              <p className="eai-bel eai-bel-jij">Schrijf een korte pagina over onze nieuwe dienst dakisolatie.</p>
              <p className="eai-bel eai-bel-ai">
                <strong>Dakisolatie</strong>
                <br />
                Een goed geïsoleerd dak houdt de warmte binnen en je energierekening laag…
              </p>
            </div>
            <div className="eai-pijl">↓ plakken</div>
            <div className="eai-venster eai-venster-ws">
              <p className="eai-venster-kop">WordSwap-chat</p>
              <p className="eai-bel eai-bel-jij">Maak hier een nieuwe pagina Dakisolatie van, in het menu onder Diensten.</p>
              <p className="eai-bel eai-bel-ws">Voorbeeld staat klaar. Bekijken en publiceren?</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-6">
        {/* Vergelijking */}
        <section className="eai-sectie">
          <p className="eai-label-donker">AI in WordPress of AI bij WordSwap</p>
          <h2 className="eai-h2">Een AI-knopje in je editor is iets anders dan een AI die je website beheert.</h2>
          <p className="eai-tekst">
            Sinds WordPress 7.0 kun je in het dashboard ChatGPT, Claude of Gemini koppelen met een API-sleutel. Plug-ins
            gebruiken die koppeling voor losse taken. Handig, maar je blijft zelf in WordPress werken en het onderhoud
            blijft. Bij WordSwap vraag je gewoon wat er anders moet.
          </p>
          <div className="eai-tabel-rol">
            <table className="eai-tabel">
              <thead>
                <tr>
                  <th />
                  <th>AI in WordPress</th>
                  <th>AI bij WordSwap</th>
                </tr>
              </thead>
              <tbody>
                {vergelijking.map(([wat, wp, ws]) => (
                  <tr key={wat}>
                    <th scope="row">{wat}</th>
                    <td>{wp}</td>
                    <td>{ws}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="eai-klein">
            Blijf je liever op WordPress? Bij <Link href="/wordpress-koppelen-aan-ai">AI gebruiken in WordPress</Link>{" "}
            lees je wat die route kost aan werk en onderhoud. Wil je juist helemaal zelf een site bouwen met AI? Lees dan
            de gids <Link href="/website-maken-met-chatgpt-of-claude">website maken met ChatGPT of Claude</Link>.
          </p>
        </section>

        {/* Stappen vandaag */}
        <section className="eai-sectie">
          <p className="eai-label-donker">Vandaag al</p>
          <h2 className="eai-h2">Zo gebruik je je eigen ChatGPT of Claude voor je website.</h2>
          <ol className="eai-stappen">
            <li>
              <strong>Laat je assistent schrijven.</strong> Vraag ChatGPT of Claude om een tekst, een blog of
              verbeteringen. Geef je eigen feiten mee: de AI weet niet wat jij weet.
            </li>
            <li>
              <strong>Plak het in de WordSwap-chat.</strong> Zeg erbij waar het moet komen, bijvoorbeeld &ldquo;nieuwe
              pagina onder Diensten&rdquo;. De AI zet het neer in de stijl van je site.
            </li>
            <li>
              <strong>Bekijk het voorbeeld en publiceer.</strong> Klopt iets niet, vraag een correctie. Pas als jij op
              publiceren drukt, staat het live.
            </li>
          </ol>
          <h3 className="eai-h3">Vier opdrachten om mee te beginnen</h3>
          <div className="eai-prompts">
            {prompts.map((p) => (
              <figure key={p.kop} className="eai-prompt">
                <figcaption>{p.kop}</figcaption>
                <blockquote>{p.tekst}</blockquote>
              </figure>
            ))}
          </div>
        </section>

        {/* Drie routes */}
        <section className="eai-sectie">
          <p className="eai-label-donker">Drie manieren</p>
          <h2 className="eai-h2">Van makkelijk tot volledig zelf doen.</h2>
          <div className="eai-routes">
            {routes.map((r) => (
              <article key={r.kop} className="eai-route">
                <span className="eai-badge">{r.label}</span>
                <h3>{r.kop}</h3>
                <p>{r.tekst}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      {/* Komt eraan */}
      <section className="eai-komt">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <p className="eai-label">In voorbereiding</p>
          <h2 className="eai-h2 text-white">Straks rechtstreeks vanuit je eigen AI.</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-[#e5efe0]">
            Met een koppeling via MCP, de open standaard waarmee assistenten als Claude en ChatGPT met andere systemen
            werken, zeg je straks in je eigen assistent: &ldquo;zet onze nieuwe openingstijden op de site&rdquo;. Die zet de
            wijziging dan klaar op je WordSwap-site, en jij keurt hem goed. Publiceren blijft altijd jouw stap, en je
            kunt de koppeling op elk moment intrekken.
          </p>
          <p className="mt-4 max-w-2xl leading-relaxed text-[#e5efe0]">
            Werk je al dagelijks met Claude of ChatGPT en wil je dit als een van de eersten? Laat het weten, dan houden we
            je op de hoogte.
          </p>
          <Link href="/contact" className="lift eai-knop mt-7 inline-block">
            Ik wil dit als een van de eersten ↗
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-6">
        {/* FAQ */}
        <section className="eai-sectie">
          <h2 className="eai-h2">Veelgestelde vragen</h2>
          <div className="mt-6 space-y-3">
            {faq.map(([v, a]) => (
              <details key={v} className="eai-vraag">
                <summary>{v}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      {pagina && (
        <p className="landing-auteur">
          Bijgewerkt op {datumNl(pagina.bijgewerkt)} door <Link href="/over-wordswap">Jos Klijnhout</Link>, oprichter
          van WordSwap
        </p>
      )}
      <LeesOok pad={PAD} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map(([v, a]) => ({
              "@type": "Question",
              name: v,
              acceptedAnswer: { "@type": "Answer", text: a },
            })),
          }),
        }}
      />
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
    </div>
  );
}
