import type { Metadata } from "next";
import Link from "next/link";
import LeesOok from "../LeesOok";
import { SEO_PAGINAS, datumNl, paginaJsonLd } from "@/lib/seo-paginas";

/**
 * Gids "zelf een website maken en bijhouden met ChatGPT of Claude" (wens Jos
 * 16-10-2026): los van WordSwap, als echte uitleg met GitHub, hosting en
 * domein. Vangt de doe-het-zelf-zoekers; WordSwap komt alleen kort aan het
 * eind voor wie het liever niet zelf doet. Feiten over prijzen bewust globaal
 * ("rond de 20 per maand"): die veranderen vaak.
 */
export const metadata: Metadata = {
  title: "Website maken met ChatGPT of Claude: de gids",
  description:
    "Zelf een website maken en bijhouden met ChatGPT of Claude: welke tools, GitHub en hosting koppelen, wat het kost en waar het in de praktijk misgaat.",
  alternates: { canonical: "/website-maken-met-chatgpt-of-claude" },
};

const PAD = "/website-maken-met-chatgpt-of-claude";

const nodig = [
  ["Een AI-assistent", "ChatGPT of Claude. De gratis versies zijn genoeg om te proberen; voor een hele site wil je een betaald abonnement, rond de 20 euro per maand."],
  ["Een GitHub-account", "Gratis. GitHub bewaart je websitebestanden met de volledige geschiedenis, zodat je elke stap kunt terugdraaien."],
  ["Hosting", "Cloudflare Pages, Netlify of Vercel. Voor een kleine site is een gratis pakket vaak genoeg; let bij Vercel op dat het gratis pakket alleen voor niet-commercieel gebruik is."],
  ["Een domeinnaam", "Bij een registrar zoals TransIP of Hostnet, meestal 10 tot 15 euro per jaar."],
  ["Optioneel: een AI-codetool", "Claude Code, OpenAI Codex of Cursor. Die werken rechtstreeks in je bestanden in plaats van via kopiëren en plakken."],
];

const manieren: [string, string, string][] = [
  ["Chat in de browser", "Je vraagt ChatGPT of Claude om de code en kopieert die naar bestanden op je computer.", "Makkelijk om mee te beginnen; onhandig zodra je site meer dan een paar pagina's heeft."],
  ["AI-codetool", "Claude Code, Codex of Cursor werkt in de map met je websitebestanden, maakt en wijzigt bestanden en zet ze desgewenst in GitHub.", "De beste route voor een echte site; je moet wel wennen aan een terminal of code-editor."],
  ["AI-sitebouwer", "Diensten als Lovable, Bolt of v0 maken een site op basis van een beschrijving en zetten hem ook online.", "Snel resultaat; je zit wel aan hun omgeving en prijzen vast, al kun je vaak exporteren naar GitHub."],
];

const stappen = [
  ["Bepaal eerst wat je wilt", "Schrijf op welke pagina's je nodig hebt, voor wie de site is en wat bezoekers moeten doen (bellen, mailen, een formulier invullen). Verzamel je teksten en foto's. Hoe concreter je bent, hoe beter het resultaat."],
  ["Laat de AI een opzet maken", "Vraag om een statische website: gewone HTML en CSS, of een framework als Astro. Geef je kleuren, je logo en een voorbeeldsite die je mooi vindt mee. Vraag om een duidelijke mappenstructuur."],
  ["Bekijk hem op je eigen computer", "Open de site lokaal in je browser. Loop elke pagina door op computer en telefoon, en vraag de AI om aanpassingen tot het klopt."],
  ["Zet de bestanden in GitHub", "Maak een repository aan en zet je bestanden erin, met GitHub Desktop of via de terminal. Een AI-codetool kan dit voor je doen. Vanaf nu wordt elke wijziging bewaard."],
  ["Koppel GitHub aan je hosting", "Kies bij Cloudflare Pages, Netlify of Vercel je repository. Vanaf dat moment wordt elke wijziging die je in GitHub zet automatisch gebouwd en online gezet. Je krijgt eerst een gratis testadres."],
  ["Koppel je domeinnaam", "Voeg je domein toe bij de hosting en zet de DNS-records die ze opgeven bij je registrar. Het SSL-certificaat (het slotje) regelt de hosting meestal vanzelf."],
  ["Regel formulieren, privacy en cookies", "Een statische site heeft geen eigen server, dus een contactformulier loopt via een dienst als Netlify Forms of Formspree. Gebruik je statistieken of advertentiepixels, dan heb je een cookiekeuze en een privacyverklaring nodig."],
  ["Maak hem vindbaar", "Zorg voor een unieke titel en omschrijving per pagina, alt-teksten bij foto's, een sitemap.xml en robots.txt. Meld je site aan in Google Search Console en Bing Webmaster Tools."],
];

const prompts = [
  ["Een opzet", "Maak een statische website met HTML en CSS voor mijn schildersbedrijf in Arnhem: home, diensten, projecten en contact. Mobielvriendelijk, snel, kleuren donkergroen en wit. Geef een duidelijke mappenstructuur."],
  ["Een nieuwe pagina", "Voeg een pagina 'Dakgoten schilderen' toe in dezelfde stijl als de andere dienstpagina's, en zet hem in het menu onder Diensten. Gebruik alleen deze feiten: [plak je tekst]."],
  ["Een controle", "Loop alle pagina's na op kapotte links, ontbrekende alt-teksten en titels die langer zijn dan 60 tekens. Geef een lijst en repareer wat je vindt."],
  ["Een wijziging", "Verander op de contactpagina de openingstijden: vrijdag tot 16:00. Laat de rest ongemoeid en laat me de wijziging zien voordat je hem in GitHub zet."],
];

const kosten: [string, string][] = [
  ["AI-abonnement (ChatGPT of Claude)", "rond de 20 euro per maand"],
  ["GitHub", "gratis"],
  ["Hosting voor een kleine site", "gratis tot zo'n 20 euro per maand"],
  ["Domeinnaam", "10 tot 15 euro per jaar"],
  ["Formulierdienst", "gratis tot zo'n 10 euro per maand"],
  ["Je eigen tijd", "een paar dagen voor de eerste versie, daarna per wijziging"],
];

const misgaat = [
  "De AI past iets aan op de ene pagina en breekt ongemerkt iets op een andere. Bekijk na elke wijziging de hele site, niet alleen de pagina waar je aan werkte.",
  "Wachtwoorden of API-sleutels belanden per ongeluk in GitHub. Zet zulke gegevens nooit in je websitebestanden, en maak een openbare repository liever privé.",
  "De AI verzint feiten, zoals prijzen, certificaten of klantnamen. Geef zelf de feiten mee en lees alles na voordat het online gaat.",
  "Een contactformulier trekt spam, of de mails komen niet aan. Test het formulier en zet er een spamfilter op.",
  "Oude adressen verdwijnen als je een bestaande site vervangt, en daarmee je plek in Google. Zet bij een overstap doorverwijzingen van de oude naar de nieuwe adressen.",
  "Je bent je eigen beheerder. Gaat er iets mis met de hosting, het domein of de mail, dan zoek jij het uit.",
];

const faq: [string, string][] = [
  [
    "Kan ChatGPT of Claude een complete website maken?",
    "Ja. Beide kunnen een complete statische website schrijven: de pagina's, de opmaak en kleine stukjes code. Voor een site met meerdere pagina's werkt een AI-codetool zoals Claude Code, Codex of Cursor beter dan de gewone chat, omdat die rechtstreeks in je bestanden werkt. Je teksten, foto's en de controle blijven jouw werk.",
  ],
  [
    "Heb ik programmeerkennis nodig?",
    "Niet veel, maar een beetje helpt. Je moet bestanden kunnen terugvinden, begrijpen wat GitHub doet en een foutmelding aan de AI kunnen voorleggen. Wie dat leuk vindt, leert het in een paar avonden. Wie dat niet leuk vindt, loopt vooral bij storingen vast.",
  ],
  [
    "Is Claude of ChatGPT beter voor het maken van een website?",
    "Allebei zijn geschikt. Claude wordt veel gebruikt om code te schrijven, onder meer via Claude Code; ChatGPT heeft met Codex een vergelijkbare tool. Kies de assistent waar je al mee werkt, en gebruik voor een site met meerdere pagina's de codetool van die aanbieder.",
  ],
  [
    "Waarom heb ik GitHub nodig?",
    "GitHub bewaart je websitebestanden met de volledige geschiedenis van elke wijziging. Gaat er iets mis, dan zet je een eerdere versie terug. En hostingdiensten als Cloudflare Pages, Netlify en Vercel halen je site uit GitHub: zet je een wijziging in GitHub, dan staat hij even later online.",
  ],
  [
    "Waar host ik een website die ik met AI heb gemaakt?",
    "Een statische website kun je hosten bij Cloudflare Pages, Netlify of Vercel. Voor een kleine site is het gratis pakket vaak genoeg. Gebruik je de site voor je bedrijf, kijk dan of het gratis pakket commercieel gebruik toestaat; bij Vercel is dat niet zo.",
  ],
  [
    "Wat kost een website maken met AI?",
    "Reken op een AI-abonnement van rond de 20 euro per maand, een domeinnaam van 10 tot 15 euro per jaar en hosting die voor een kleine site vaak gratis is. De grootste kostenpost is je eigen tijd: een paar dagen voor de eerste versie, en daarna het bijhouden en oplossen als er iets misgaat.",
  ],
  [
    "Kan ik mijn bestaande WordPress-site met AI ombouwen?",
    "Dat kan, maar het is meer werk dan een nieuwe site: je wilt dezelfde adressen, titels en inhoud behouden, anders verlies je je plek in Google. Laat de AI elke pagina overnemen, controleer alles en zet doorverwijzingen voor adressen die veranderen.",
  ],
];

export default function WebsiteMakenMetAi() {
  const pagina = SEO_PAGINAS.find((p) => p.pad === PAD);
  const jsonLd = paginaJsonLd(PAD, "Website maken met ChatGPT of Claude: de gids");
  return (
    <div className="eai">
      <section className="eai-hero">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.1fr_.9fr] lg:py-24">
          <div>
            <p className="eai-label">Gids · zelf doen</p>
            <h1 className="eai-h1">
              Zelf een website maken en bijhouden met ChatGPT of Claude.
              <em>Van eerste opzet tot online, stap voor stap.</em>
            </h1>
            <p className="eai-intro">
              Ja, je kunt met ChatGPT of Claude zelf een complete website maken, zonder WordPress. De AI schrijft de
              pagina&rsquo;s, je bewaart de bestanden in GitHub, en een hostingdienst als Cloudflare Pages, Netlify of Vercel
              zet elke wijziging automatisch online. In deze gids lees je hoe dat werkt, wat het kost en waar het in de
              praktijk misgaat.
            </p>
          </div>
          {/* De keten in één beeld */}
          <ol className="eai-keten" aria-label="De route in vier stappen">
            <li>
              <strong>ChatGPT of Claude</strong>
              <span>schrijft de pagina&rsquo;s</span>
            </li>
            <li>
              <strong>GitHub</strong>
              <span>bewaart elke versie</span>
            </li>
            <li>
              <strong>Cloudflare Pages, Netlify of Vercel</strong>
              <span>zet het automatisch online</span>
            </li>
            <li>
              <strong>jouwbedrijf.nl</strong>
              <span>je eigen domeinnaam</span>
            </li>
          </ol>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-6">
        <section className="eai-sectie">
          <p className="eai-label-donker">Wat je nodig hebt</p>
          <h2 className="eai-h2">Vijf dingen, waarvan de meeste gratis.</h2>
          <dl className="eai-nodig">
            {nodig.map(([wat, uitleg]) => (
              <div key={wat}>
                <dt>{wat}</dt>
                <dd>{uitleg}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="eai-sectie">
          <p className="eai-label-donker">Drie manieren</p>
          <h2 className="eai-h2">Kopiëren en plakken, een AI-codetool of een AI-sitebouwer.</h2>
          <div className="eai-tabel-rol">
            <table className="eai-tabel eai-tabel-gelijk">
              <thead>
                <tr>
                  <th>Manier</th>
                  <th>Hoe het werkt</th>
                  <th>Voor wie</th>
                </tr>
              </thead>
              <tbody>
                {manieren.map(([m, hoe, wie]) => (
                  <tr key={m}>
                    <th scope="row">{m}</th>
                    <td>{hoe}</td>
                    <td>{wie}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="eai-sectie">
          <p className="eai-label-donker">Stappenplan</p>
          <h2 className="eai-h2">Van idee tot online in acht stappen.</h2>
          <ol className="eai-stappen">
            {stappen.map(([kop, tekst]) => (
              <li key={kop}>
                <strong>{kop}.</strong> {tekst}
              </li>
            ))}
          </ol>
        </section>

        <section className="eai-sectie">
          <p className="eai-label-donker">Bijhouden</p>
          <h2 className="eai-h2">Zo houd je de site daarna bij.</h2>
          <p className="eai-tekst">
            Open de map met je websitebestanden in je AI-codetool en vraag in gewone woorden wat er anders moet. Laat de
            wijziging eerst op een testadres zetten: Cloudflare Pages, Netlify en Vercel maken voor elke aparte versie
            (een &ldquo;branch&rdquo; in GitHub) automatisch een voorbeeld. Klopt het, dan voeg je hem samen en staat hij live.
            Klopt het later toch niet, dan zet je in GitHub de vorige versie terug.
          </p>
          <h3 className="eai-h3">Vier opdrachten om mee te beginnen</h3>
          <div className="eai-prompts">
            {prompts.map(([kop, tekst]) => (
              <figure key={kop} className="eai-prompt">
                <figcaption>{kop}</figcaption>
                <blockquote>{tekst}</blockquote>
              </figure>
            ))}
          </div>
        </section>

        <section className="eai-sectie">
          <p className="eai-label-donker">Kosten</p>
          <h2 className="eai-h2">Wat het kost.</h2>
          <div className="eai-tabel-rol">
            <table className="eai-tabel">
              <tbody>
                {kosten.map(([wat, bedrag]) => (
                  <tr key={wat}>
                    <th scope="row">{wat}</th>
                    <td>{bedrag}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="eai-klein">Bedragen bij benadering; aanbieders passen hun prijzen regelmatig aan.</p>
        </section>

        <section className="eai-sectie">
          <p className="eai-label-donker">Eerlijk is eerlijk</p>
          <h2 className="eai-h2">Waar het in de praktijk misgaat.</h2>
          <ul className="eai-lijst">
            {misgaat.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="eai-komt">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <p className="eai-label">Liever niet zelf?</p>
          <h2 className="eai-h2 text-white">Dezelfde snelle site, zonder dat je zelf GitHub en hosting regelt.</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-[#e5efe0]">
            WordSwap doet deze route voor je: we zetten je bestaande website over of bouwen een nieuwe, regelen hosting,
            domeinkoppeling en formulieren, en daarna typ je in een chat wat er anders moet. Je ziet eerst een voorbeeld
            en publiceert zelf. Vanaf €19 per maand, exclusief btw.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/hoe-het-werkt" className="lift eai-knop">
              Zo werkt WordSwap ↗
            </Link>
            <Link href="/eigen-ai-koppelen" className="eai-knop-twee">
              Je eigen ChatGPT of Claude bij WordSwap
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-6">
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
