import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Handleiding",
  robots: { index: false, follow: false },
};

const secties: { kop: string; blokken: { titel: string; tekst: string }[] }[] = [
  {
    kop: "Handmatige stappen: domein en e-mail",
    blokken: [
      {
        titel: "Domein koppelen (na 'Zet site online')",
        tekst:
          "De site draait dan op <naam>.wordswap.workers.dev; het echte domein koppel je zo:\n1. Cloudflare-dashboard → Add a site → domein van de klant invoeren (Free-plan). Cloudflare leest de bestaande DNS-records automatisch in — controleer of ze er allemaal staan, vóóral de MX-records (e-mail!).\n2. Cloudflare toont twee nameservers. De klant (of jij, met inlog van de registrar zoals TransIP/Vimexx) zet die bij de registrar bij 'Nameservers'. Doorlooptijd: minuten tot 24 uur.\n3. Zodra de zone actief is: Workers & Pages → de worker van de klant → Settings → Domains & Routes → Add → Custom Domain → domein (en www) toevoegen. SSL gaat automatisch.\n4. Check: domein opent de nieuwe site, https werkt, www én zonder www. Zet daarna het domein op de admin-klantpagina in het veld Domein, zodat portaal en 'Open live site' kloppen.",
      },
      {
        titel: "E-mail: eerst kijken waar het staat",
        tekst:
          "LET OP: e-mail is de plek waar migraties misgaan. Check vóór elke domeinwissel waar de mail draait: MX-records opzoeken (mxtoolbox.com of 'dig MX domein.nl'). Twee situaties:\n1. Mail draait bij een aparte partij (Microsoft 365, Google Workspace, aparte mailhoster): niets aan de hand — zolang de MX-records in Cloudflare exact hetzelfde blijven, blijft de mail gewoon werken. Controleer na de nameserver-wissel of mail nog binnenkomt.\n2. Mail draait bij de oude WordPress-hoster: dan mag die hosting NIET opgezegd worden vóór de mail verhuisd is. Verkoop de e-mailmigratie als aanvulling: nieuw mailabonnement bij een Nederlandse provider (vanaf ± €8 p/m), mailboxen overzetten (IMAP-kopie), MX-records omzetten, en pas dáárna de oude hosting opzeggen.\nVergeet ook SPF/DKIM/DMARC-records niet mee te nemen — anders belandt verzonden mail in spam.",
      },
      {
        titel: "Opzeg-checklist oude hosting",
        tekst:
          "Pas opzeggen als: het domein via Cloudflare naar de nieuwe site wijst, de mail aantoonbaar ergens anders draait, en de klant akkoord is met de opgeleverde site. Bewaar de WordPress-export (staat al in onze systemen) — daarna mag het oude pakket weg en stopt de klant met betalen voor hosting en plugins.",
      },
    ],
  },
  {
    kop: "Hoe het systeem in elkaar zit",
    blokken: [
      {
        titel: "De onderdelen",
        tekst:
          "Elke klantsite is een eigen GitHub-repo in de organisatie wordpress2ai met platte HTML/CSS. De site draait als Cloudflare Worker op twee adressen: de live site (<naam>.wordswap.workers.dev of eigen domein) en de werkversie (wv-<naam>...) waar concepten op getoond worden. Het portaal en de admin draaien op Vercel; de database (klanten, chats, concepten, kosten) is Neon Postgres; inloggen gaat via Clerk.",
      },
      {
        titel: "Centrale onderdelen (delen/)",
        tekst:
          "Alles wat op meerdere pagina's terugkomt (menu, footer, topbalk, referenties-blok) staat één keer in de map delen/ van de repo. Op de pagina's staat alleen een marker <!--invoeg:naam-->. Bij elke deploy worden die markers vervangen door de echte inhoud. Wijzig gedeelde blokken dus altijd in delen/, nooit in losse pagina's.",
      },
      {
        titel: "Concept → publiceer",
        tekst:
          "Elke chat-wijziging komt eerst op een aparte branch met een pull request, en is direct te zien op de werkversie. Pas als de klant (of jij) op Publiceer klikt wordt de branch samengevoegd en gaat de live site mee. Verwijderen gooit branch en PR weg zonder gevolgen. Elke gepubliceerde versie blijft in de git-geschiedenis staan en kan teruggezet worden.",
      },
    ],
  },
  {
    kop: "Migratie van een WordPress-site",
    blokken: [
      {
        titel: "Stappen (actuele flow: via Claude Code)",
        tekst:
          "1) Klant maakt een export (WordPress → Extra → Exporteren → Alle inhoud); zet de XML bijv. in ~/Downloads. 2) Terminal: cd ~/wordpress2ai, check 'gh auth status' (ingelogd als Voskesss), start 'claude'. 3) Typ: \"migreer klant <naam>, xml staat in <pad>, repo <kebab-naam>\" — plus eventuele aanwijzingen ('laat Actueel weg'). Claude draait het voorwerk-script (geen AI-kosten), bouwt de site met alle kwaliteitsregels, toont screenshots ter controle en registreert de klant automatisch in deze admin. 4) Hier afronden: klantaccount koppelen, richtlijnen invullen, domein + e-mail (zie bovenaan). Het exacte stappenplan staat ook op de Migraties-pagina. De oude uploadknop daar is de API-pijplijn — alleen als terugvaloptie (duurder).",
      },
      {
        titel: "Wat de bouw-AI doet",
        tekst:
          "Hij leest de export, haalt het echte ontwerp van de live site op (HTML, CSS, screenshots desktop + mobiel, computed styles), downloadt de afbeeldingen (formaat-duplicaten worden gegroepeerd, max 250 unieke), en bouwt de site na: zelfde kleuren, lettertypen, kolommen, hoekradius, embeds (video's, kaarten), sliders en decoratie. Daarna volgt een vergelijk-en-verbeter-ronde met screenshots naast elkaar. Menu en footer komen in delen/.",
      },
      {
        titel: "Checkpoints en opnieuw proberen",
        tekst:
          "De bouw slaat op vier momenten alles op in de klant-repo: na het downloaden van de afbeeldingen, na elke AI-bouwronde (max 3 bij grote sites), bij elke fout (noodcheckpoint) en aan het eind. Mislukt een job, dan staat er een rode foutmelding in de wachtrij en een knop 'Probeer opnieuw' — die hervat vanaf het laatste checkpoint zonder dubbele AI-kosten. GitHub-limieten (rate limits) worden automatisch opgevangen met wachten en opnieuw proberen.",
      },
      {
        titel: "Kwaliteitscontrole vóór oplevering",
        tekst:
          "Loop na een bouw altijd de site door: kloppen alle pagina's, staan de echte foto's erop (geen nagemaakte iconen of initialen), werken de formulieren, zijn er geen dode links? Ontbrekende beelden staan in ontbrekende-media.txt in de repo. Kleine correcties kun je via 'Beheer via chat' op de klantpagina doen, of rechtstreeks via git.",
      },
    ],
  },
  {
    kop: "De klant-chat",
    blokken: [
      {
        titel: "Hoe een wijziging loopt",
        tekst:
          "Klant typt een verzoek (of klikt een suggestie, of wijst met 'Wijs aan' een onderdeel aan in het voorbeeld). De AI krijgt vooraf een plattegrond van de site mee en gaat direct naar het juiste bestand. Het resultaat komt als concept in de werkversie, het voorbeeld ververst automatisch op de pagina waar de klant kijkt, en met Publiceer gaat het live (±2 min). De rode stopknop breekt een lopende opdracht af zonder iets te wijzigen.",
      },
      {
        titel: "Afbeeldingen in de chat",
        tekst:
          "Een meegestuurde afbeelding kan twee dingen zijn: een foto om te plaatsen (komt geoptimaliseerd als webp op de site) of een vóórbeeld van hoe iets eruit moet zien (schets of screenshot) — dan bouwt de AI het na en plaatst hij het plaatje niet. De AI bepaalt dit uit het bericht.",
      },
      {
        titel: "Geheugen en richtlijnen",
        tekst:
          "De chat onthoudt het wijzigingslogboek (voor 'zet dat weer terug zoals vóór de feestdagen'), en lange gesprekken worden automatisch samengevat. Per klant kun je op de klantpagina vaste richtlijnen instellen (bv. 'spreek bezoekers aan met u') die de AI altijd naleeft, bovenop de algemene huisregels (SEO-behoud, geen gevoelige formuliervelden, analytics behouden, nooit afbeeldingen verzinnen).",
      },
      {
        titel: "Formulieren",
        tekst:
          "Klanten kunnen via de chat extra formulieren vragen (offerte, bestelling, aanmelding). Elk formulier krijgt een eigen naam; inzendingen verschijnen met dat label bij Formulier-inzendingen in het klantportaal en op de admin-klantpagina. Het notificatie-e-mailadres stelt de klant zelf in het portaal in. Let op: het daadwerkelijke doormailen per e-mail vereist nog een maildienst (Resend/Postmark) — staat op de roadmap.",
      },
    ],
  },
  {
    kop: "De probeer-demo",
    blokken: [
      {
        titel: "Hoe hij werkt",
        tekst:
          "Prospects melden zich aan via /demo (leadregistratie via Clerk) en krijgen de demo-bakkerij in hun portaal: eigen chatgeschiedenis per bezoeker, max 10 opdrachten per dag, snelle Haiku-AI, en strenge regels (geen ongepaste inhoud, geen persoonsgegevens, geen externe links, geen uploads). De demo-site wordt elk uur automatisch teruggezet naar het sjabloon. Iedereen die de demo gebruikt verschijnt onderaan de admin-klantenlijst als Demo-lead, met e-mailadres — warme leads om na te bellen.",
      },
    ],
  },
  {
    kop: "Rechtstreeks werken via git / Claude Code",
    blokken: [
      {
        titel: "Push = live",
        tekst:
          "Elke push naar main van een klant-repo wordt automatisch gedeployed (live + werkversie) via de webhook /api/github-push. Workflow: gh repo clone wordpress2ai/<repo>, aanpassen in Claude Code (met screenshots als referentie), git push — binnen een minuut live. Vangnet: npx tsx --env-file=.env.local scripts/deploy-klant.mts <repo>. Expert-klanten met eigen AI-tools krijgen collaborator-toegang op hun repo en dezelfde flow.",
      },
    ],
  },
  {
    kop: "Kosten en prijzen",
    blokken: [
      {
        titel: "AI-kosten per klant",
        tekst:
          "Van elke chat-opdracht en elke bouw worden de echte tokens en dollarkosten geregistreerd, per site per maand (chat en bouw apart). Je ziet ze als chip in de klantenlijst en als tegel op de klantpagina. Dit is de basis om het prijsmodel te kiezen: vast bedrag, strippenkaart of betalen per wijziging. De fair-use-teller (30 wijzigingen/maand) staat er los naast.",
      },
      {
        titel: "Vaste lasten",
        tekst:
          "Hosting van klantsites via Cloudflare Workers is gratis (ruime free tier). De bouw-worker draait op GitHub Actions (gratis minuten). Vercel host portaal + marketing. De grootste variabele kostenpost is de AI zelf — daarom meten we die per klant.",
      },
    ],
  },
  {
    kop: "Als er iets misgaat",
    blokken: [
      {
        titel: "Snelle checklist",
        tekst:
          "Bouw mislukt → volledige foutmelding staat in de wachtrij, knop 'Probeer opnieuw' hervat vanaf het checkpoint. Wijziging niet zichtbaar → Ververs-knop (voorbeeldbalk, naast het invoerveld, of onder het chatbericht); live site loopt na publicatie ±2 min achter. Chat-opdracht te groot → het af deel staat als concept klaar, vervolg gewoon in de chat. Demo stuk → uurlijkse reset lost het op, of draai /api/demo-reset handmatig. Klant verwijderen → danger zone op de klantpagina (naam typen ter bevestiging; wist ook repo en Cloudflare).",
      },
      {
        titel: "Opruimen",
        tekst:
          "De knop Opruimen (klantenlijst) en de wekelijkse cron ruimen oude bouwdata en branches op. Afgeronde of mislukte jobs kun je zelf uit de bouwwachtrij verwijderen.",
      },
    ],
  },
];

export default async function Handleiding() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/admin" className="text-sm text-stone-500 hover:text-violet-700">
        ← Alle klanten
      </Link>
      <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">
        Handleiding
      </h1>
      <p className="mt-3 text-stone-600 leading-relaxed">
        Hoe WordSwap onder de kap werkt — van migratie tot klant-chat. Voor
        onszelf en voor wie er later bij komt.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {secties.map((s) => (
          <a
            key={s.kop}
            href={`#${s.kop.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            className="rounded-full border border-stone-300 px-3.5 py-1.5 text-sm text-stone-600 hover:border-violet-400 hover:text-violet-700"
          >
            {s.kop}
          </a>
        ))}
      </nav>

      <div className="mt-10 space-y-12">
        {secties.map((s) => (
          <section key={s.kop} id={s.kop.toLowerCase().replace(/[^a-z0-9]+/g, "-")}>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {s.kop}
            </h2>
            <div className="mt-4 space-y-4">
              {s.blokken.map((b) => (
                <div
                  key={b.titel}
                  className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="font-semibold">{b.titel}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-stone-600 whitespace-pre-line">
                    {b.tekst}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
