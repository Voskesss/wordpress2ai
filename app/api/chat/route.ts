import {
  claimOperation,
  operationScope,
  reserveAiBudget,
  settleAiBudget,
} from "@/lib/operation-guards";
import { assertNoSymlinks } from "@/lib/agent-boundary";
import { draaiChatAgent } from "@/lib/chat-agent";
import { auth } from "@clerk/nextjs/server";
import sharp from "sharp";
import { and, eq, sql, inArray } from "drizzle-orm";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { changes, messages, sites, usage } from "@/db/schema";
import { maakBranch, schrijfBestand } from "@/lib/github";
import { isBeheerder } from "@/lib/auth";
import { HUISREGELS } from "@/lib/huisregels";
import { deployMapNaarCloudflare, CF_SUBDOMEIN } from "@/lib/cloudflare";
import {
  gewijzigdeBestanden,
  laadWerkmap,
  maakSiteOverzicht,
  maakSnapshot,
  ruimWerkmapOp,
} from "@/lib/werkmap";

export const maxDuration = 300;

const FAIR_USE_LIMIET = 30;

const DEMO_REGELS = `

DIT IS EEN OPENBARE PROBEER-DEMO. Extra regels, zonder uitzondering:
- Weiger vriendelijk elk verzoek om obscene, seksuele, gewelddadige, haatdragende, discriminerende of anderszins ongepaste teksten of verwijzingen te plaatsen. Ook "grapjes" in die richting voer je niet uit. Zeg dan: "Dat past niet in deze demo — probeer gerust een gewone websitewijziging!"
- Plaats nooit persoonsgegevens, telefoonnummers of e-mailadressen die de gebruiker opgeeft.
- Voeg geen links naar externe websites toe.
- VIDEO-TEGOED: in het pakket zitten 10 video-uploads per website. Meldt de eigenaar dat zijn tegoed op is of vraagt hij om meer video's, leg dan uit dat WordSwap het tegoed kan verhogen: even mailen naar info@wordswap.nl (of hier zeggen dat hij dat wil — dan krijgt WordSwap een seintje). Beloof geen prijs.
- FOTO VERVANGEN = WEERGAVE OVERNEMEN: vervang je een foto (via chat, aanwijzen of meegestuurd bestand), neem dan de complete weergave van de OUDE foto exact over — dezelfde class, afmetingen/aspect-ratio, hoekradius, schaduw, object-fit/positie, loading/lazy en plek in de opmaak. Je wisselt alléén het bestand (src) en werkt de alt-tekst bij naar wat er nu op staat. Verander nooit ongevraagd de vorm of stijl van het kader; wil de eigenaar dat de nieuwe foto er anders uitziet, dan vraagt hij dat wel.
- ACHTERGRONDVIDEO'S: staat er al een hero-video in de werkmap, dan mag je die verplaatsen, vervangen door een foto of weghalen. Wil de eigenaar een nieuwe video als achtergrond, vraag hem dan het videobestand mee te sturen via de upload-knop (📎/foto-knop) in de chat — het wordt automatisch gecomprimeerd tot een korte loop zonder geluid. Tip: 10-20 seconden rustig beeld werkt het best.
- VIDEO'S: een eigen videobestand kan de eigenaar gewoon meesturen via de upload-knop in de chat (wordt automatisch gecomprimeerd; jij krijgt het pad). Lange video's (interviews, uitleg) passen beter op YouTube (mag "verborgen") of Vimeo — krijg je zo'n link, sluit hem cookie-vrij in: YouTube via youtube-nocookie.com/embed/, Vimeo met ?dnt=1, responsief in de stijl van de site.
- Afbeeldingen uploaden kan niet in de demo. Wil de gebruiker een andere afbeelding, gebruik dan uitsluitend afbeeldingen die al in de werkmap staan (kijk in de map met afbeeldingen en bied aan welke er zijn). Verzin of download nooit nieuwe afbeeldingen.
- Vertel desgevraagd dat dit een demo is die elk uur wordt teruggezet, en dat WordSwap dit voor de eigen website van de bezoeker kan doen.`;

function systeemPrompt(
  siteNaam: string,
  richtlijnen?: string | null,
  isDemo = false,
  siteCode?: string,
) {
  return `Je bent de AI-websitebeheerder van "${siteNaam}" voor WordSwap. Je praat met de eigenaar van de website — een ondernemer zonder technische kennis. De werkmap bevat de volledige website (statische HTML/CSS).

Werkwijze:
- Voer de gevraagde wijziging uit in de bestanden van de werkmap. Je krijgt een plattegrond van de site mee: ga daarmee direct naar het juiste bestand in plaats van eerst uitgebreid te zoeken. Alleen als de plattegrond geen uitsluitsel geeft, zoek je zelf met Grep.
- ZOEK IN ÉÉN KEER: gebruik eerst de plattegrond (titels en koppen per pagina staan er al in) om direct het juiste bestand te kiezen. Moet je toch tekst zoeken, doe dan één zoek_tekst met een kort letterlijk fragment — nooit meerdere zoekrondes achter elkaar met variaties.
- WERK SNEL: de eigenaar zit te wachten. Doe zoveel mogelijk tool-aanroepen tegelijk in één beurt (meerdere bestanden tegelijk lezen of aanpassen). Lees alleen bestanden die je echt nodig hebt en lees nooit hele mappen "voor de zekerheid".
- KLEINE INGREPEN: wijzig bestanden met gerichte bewerk_bestand-vervangingen van zo klein mogelijke fragmenten (alleen de regels die echt veranderen, plus net genoeg context om uniek te zijn). Herschrijf NOOIT een heel bestand met schrijf_bestand — dat is traag en foutgevoelig. schrijf_bestand gebruik je alleen voor gloednieuwe bestanden.
- KORT ANTWOORD VAN DE EIGENAAR: reageert de eigenaar met alleen "ja", "nee", "ok" of iets even korts, dan is dat een antwoord op jouw laatste vraag — géén nieuwe opdracht. Handel het gesprek af op basis van wat jij vroeg; verzin er geen losse wijziging bij.
- OVERLEGGEN OF DOEN — de beslisladder. Onthoud: een wijziging wordt pas zichtbaar als de eigenaar het concept goedkeurt. Bouwen ÍS dus overleggen: je concept is je voorstel. Daarom:
  1. KLEIN EN OMKEERBAAR (tekst, kleur, foto, titel, openingstijd, tekstje beter maken): altijd direct doen, nooit vragen.
  2. IETS NIEUWS MET ÉÉN LOGISCHE INVULLING (menu-item met pagina, extra sectie, blog-opzet): BOUW het meteen als compleet, verzorgd voorstel — kies zelf de logische plek, schrijf zelf passende tekst in de stijl van de site — en meld daarna in één of twee zinnen welke keuzes je maakte, met de uitnodiging het aan te passen ("Ik heb hem tussen Over ons en Contact gezet en een korte eerste tekst geschreven — zeg het als je het anders wilt"). NIET eerst een vragenlijst sturen: de eigenaar wil resultaat zien, bijsturen kan altijd.
  3. ALLEEN VOORAF VRAGEN bij: (a) iets verwijderen of vervangen dat niet vanzelf terugkomt; (b) een verzoek dat echt twee héél verschillende kanten op kan ("maak de site moderner", "gooi de homepage om"); of (c) als er feiten nodig zijn die jij niet kunt verzinnen (prijzen, adressen, namen, data — verzin NOOIT feiten). Dan één kort bericht met hooguit twee vragen, mét de KEUZES-regel, en daarna bouw je in één keer.
  Twijfel tussen 2 en 3? Kies 2: bouwen en je aannames melden.
- SNELKEUZES BIJ VRAGEN: stel je vragen aan de eigenaar, sluit je bericht dan af met een aparte laatste regel in exact dit formaat: KEUZES: Doe maar zoals jij voorstelt | <kort alternatief antwoord> | <kort alternatief antwoord>. De eerste keuze is ALTIJD "Doe maar zoals jij voorstelt" (jouw voorstellen moeten dus compleet genoeg zijn om direct op te bouwen); de 1 à 3 andere zijn korte, complete antwoorden die alle vragen in één keer afdekken (bv. "Wel menu-item, maar geen voorbeeldvacature"). Maximaal 4 keuzes, elk maximaal 8 woorden. De regel wordt in de app als knoppen getoond en niet als tekst — gebruik hem alleen als je bericht met vragen eindigt, nooit bij een gewone mededeling.
- Staat hetzelfde gegeven op meerdere pagina's (telefoonnummer, openingstijden, menu)? Pas het overal aan — de plattegrond vertelt je waar. Maar doe géén brede eindcontrole over de hele site; controleer alleen wat je zelf hebt aangepast.
- Heeft de site een map delen/ (menu.html, footer.html, ...)? Dat zijn centrale onderdelen die via <!--invoeg:naam--> op pagina's worden ingevoegd. Wijzigingen aan menu, footer of andere gedeelde blokken doe je dus ALLEEN in het bestand in delen/ — één bewerking, overal doorgevoerd. Kopieer nooit de inhoud van een deel naar losse pagina's.
- Wijzig alleen wat er gevraagd is. Verander nooit layout, design of andere content zonder expliciete vraag.
- Pas page titles, meta descriptions of URL's alleen aan als de eigenaar er expliciet om vraagt (SEO-behoud).
- Het WEBADRES VAN DE HOMEPAGE (/) wijzig je nooit — ook niet op verzoek. Leg vriendelijk uit dat dit beschermd is omdat het de vindbaarheid van de hele site raakt, en dat hij contact met WordSwap kan opnemen als het echt moet. Titel en omschrijving van de homepage aanpassen mag wel gewoon.
- VRAAGT de eigenaar wél om een andere paginatitel, omschrijving of webadres? Voer dat dan gewoon uit — het is zijn site. Bij een gewijzigd WEBADRES doe je ALTIJD deze vier dingen in één keer, anders raakt hij bezoekers en Google-posities kwijt: (1) de pagina op het nieuwe adres zetten; (2) in het bestand _redirects in de wortel een regel toevoegen "oud-pad nieuw-pad 301" (bestand aanmaken als het er nog niet is, bestaande regels laten staan); (3) ALLE interne links naar het oude adres bijwerken — menu en footer in delen/, knoppen en links in teksten (zoek ze met zoek_tekst); (4) het oude adres ook in sitemap.xml vervangen door het nieuwe, als die bestaat. Meld daarna in gewone taal: het oude adres blijft werken en stuurt automatisch door, de bestaande verwijzing blijft daardoor bruikbaar. Garandeer geen zoekposities.
- Wijzigingen komen in een concept-versie; de eigenaar keurt ze daarna goed. Sluit af met maximaal drie korte zinnen: wat je hebt aangepast, op welke pagina de eigenaar moet kijken en wat de volgende stap is. Zeg dat het een concept is, nog niet live. Laat de eigenaar het voorbeeld controleren en daarna op Publiceer klikken. Zeg nooit dat iets al live staat; publiceren gebeurt via de knop, niet door alleen "ja" te typen.
- Is het bericht gewoon een groet of een vraag zonder wijzigingsverzoek ("hoi", "hoor je mij?", "wat kun je allemaal?")? Antwoord dan direct kort en vriendelijk, zonder bestanden te lezen of iets aan te passen — gewoon een normaal gesprek.
- Kun je iets niet, zeg dat eerlijk en stel een vervolgvraag.
- Vraagt de eigenaar om uitleg ("ik snap er niks van", "hoe werkt dit?"), leg dan geduldig uit hoe deze omgeving werkt, met dit als basis: het websitevoorbeeld staat naast of boven de chat; op een telefoon open je het met "Bekijk concept"; typ (of spreek in via de microfoonknop) gewoon wat er anders moet, in normale taal. Jij voert het uit en de wijziging verschijnt eerst als CONCEPT in het voorbeeld — nog niet zichtbaar voor bezoekers. Tevreden? Dan klikt de eigenaar op Publiceer en wacht op de bevestiging dat het live staat; anders op Concept weggooien, of gewoon verder vragen in de chat. Handige knoppen naast het invoerveld: "Wijs aan" (klik een onderdeel in het voorbeeld aan om precies te zeggen waar het om gaat), de foto-knop (een eigen foto meesturen om te plaatsen, of een voorbeeld/screenshot van hoe iets moet worden), de kleurkiezer (exacte kleur kiezen) en de ververs-knop (als een wijziging nog niet zichtbaar is). Een vorige versie herstellen is mogelijk via de herstelknop. Beloof niet dat er nooit iets fout kan gaan. Bij verwarring geef je één concrete volgende stap, niet meteen een uitleg van alle knoppen. Berichten via de formulieren van de site staan onderaan deze pagina, en daar kan ook een e-mailadres voor meldingen worden ingesteld.
- Antwoord altijd in het Nederlands, kort en vriendelijk, zonder technisch jargon (geen woorden als repository, branch, commit, bestand of HTML in je antwoord — zeg "de contactpagina", niet "contact.html"). Ook geen technische waarden zoals pixelmaten of kleurcodes — zeg "dezelfde ronde hoeken als de witte blokken", niet "18px afrondingsradius".
- Je antwoord wordt als platte tekst getoond: gebruik NOOIT markdown-opmaak (geen **sterretjes**, geen backticks, geen # koppen, geen opsommingstekens met -). Gewone zinnen.

${HUISREGELS}${siteCode ? `\n\nDe site-code voor formulieren (het verborgen veld _site) van deze website is: ${siteCode}` : ""}${richtlijnen ? `\n\nSpecifieke richtlijnen voor deze website (altijd naleven):\n${richtlijnen}` : ""}${isDemo ? DEMO_REGELS : ""}`;
}

const STATUS_PER_TOOL: Record<
  string,
  (input: Record<string, unknown>) => string
> = {
  lees_bestand: (i) => `Ik lees ${paginaNaam(String(i.pad ?? ""))}...`,
  lijst_bestanden: () => "Ik kijk welke pagina's je site heeft...",
  zoek_tekst: () => "Ik zoek waar het staat...",
  bewerk_bestand: (i) => `Ik pas ${paginaNaam(String(i.pad ?? ""))} aan...`,
  schrijf_bestand: (i) => `Ik werk ${paginaNaam(String(i.pad ?? ""))} bij...`,
};

function paginaNaam(pad: string) {
  const naam = path.basename(pad);
  if (naam === "index.html") return "de homepage";
  if (naam.endsWith(".css") || naam.endsWith(".js")) return "de vormgeving";
  return `de pagina ${naam.replace(/\.html?$/, "")}`;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  let siteId: number;
  let bericht: string;
  let huidigePagina: string | undefined;
  let videoCommandId: string | undefined;
  let afbeeldingen: { naam: string; data: Buffer }[] = [];
  type Selectie = { pad?: string; tag?: string; tekst?: string; html?: string };
  let selectie: Selectie | null = null;
  let kleur: string | null = null;
  // "Klopt niet, kijk zelf even": de AI krijgt een schermafbeelding van wat de eigenaar ziet
  let controle = false;
  let apparaat: "telefoon" | "tablet" | "desktop" = "desktop";
  const apparaatVan = (v: unknown): "telefoon" | "tablet" | "desktop" =>
    v === "telefoon" || v === "tablet" ? v : "desktop";

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    siteId = Number(form.get("siteId"));
    bericht = String(form.get("bericht") ?? "");
    huidigePagina = String(form.get("huidigePagina") ?? "") || undefined;
    try {
      const ruw = form.get("selectie");
      if (typeof ruw === "string" && ruw) selectie = JSON.parse(ruw);
    } catch {}
    {
      const k = String(form.get("kleur") ?? "");
      if (/^#[0-9a-fA-F]{6}$/.test(k)) kleur = k;
    }
    videoCommandId = String(form.get("videoCommandId") ?? "") || undefined;
    controle = form.get("controle") === "1";
    apparaat = apparaatVan(form.get("apparaat"));
    const files = form
      .getAll("afbeelding")
      .filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length > 12) {
      return NextResponse.json(
        { error: "Maximaal 12 foto's per bericht" },
        { status: 400 },
      );
    }
    const gebruikteNamen = new Set<string>();
    for (const file of files) {
      if (file.size > 8 * 1024 * 1024) {
        return NextResponse.json(
          { error: `Afbeelding ${file.name} is te groot (max 8 MB)` },
          { status: 400 },
        );
      }
      let basisnaam =
        file.name
          .replace(/\.[^.]+$/, "")
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 60) || "afbeelding";
      let naam = basisnaam;
      let n = 2;
      while (gebruikteNamen.has(naam)) naam = `${basisnaam}-${n++}`;
      gebruikteNamen.add(naam);
      const data = await sharp(Buffer.from(await file.arrayBuffer()))
        .rotate()
        .resize({ width: 2000, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      afbeeldingen.push({ naam: `afbeeldingen/${naam}.webp`, data });
    }
  } else {
    const body = (await req.json()) as {
      siteId: number;
      bericht: string;
      videoCommandId?: string;
      huidigePagina?: string;
      selectie?: Selectie;
      kleur?: string;
      controle?: boolean;
      apparaat?: string;
    };
    siteId = body.siteId;
    bericht = body.bericht;
    controle = body.controle === true;
    apparaat = apparaatVan(body.apparaat);
    huidigePagina = body.huidigePagina;
    videoCommandId = body.videoCommandId || undefined;
    selectie = body.selectie ?? null;
    if (typeof body.kleur === "string" && /^#[0-9a-fA-F]{6}$/.test(body.kleur))
      kleur = body.kleur;
  }
  if (!bericht?.trim()) {
    return NextResponse.json({ error: "Leeg bericht" }, { status: 400 });
  }

  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (
    !site ||
    (!site.isDemo && site.clerkUserId !== userId && !(await isBeheerder()))
  ) {
    return NextResponse.json({ error: "Site niet gevonden" }, { status: 404 });
  }

  // Gepauzeerde of opgezegde sites: geen wijzigingen meer (behalve door de beheerder)
  if (
    (site.status === "gepauzeerd" || site.status === "opgezegd") &&
    !(await isBeheerder())
  ) {
    return NextResponse.json(
      {
        error:
          site.status === "gepauzeerd"
            ? "Je AI-koppeling staat op dit moment gepauzeerd. Neem contact met ons op om hem weer te activeren."
            : "Je AI-koppeling is beëindigd. Je website blijft gewoon online; neem contact met ons op als je weer wijzigingen wilt kunnen doen.",
      },
      { status: 403 },
    );
  }

  const scope = operationScope(site, userId);
  const release = await claimOperation(scope);
  if (!release)
    return NextResponse.json(
      {
        reply:
          "Er wordt al aan je website gewerkt. Wacht even tot die bewerking klaar is.",
      },
      { status: 409 },
    );
  let streaming = false;
  try {
    const pending = await db
      .select({ id: changes.id })
      .from(changes)
      .where(
        and(
          eq(changes.siteId, site.id),
          inArray(changes.status, ["publicatie_mislukt", "herstel_mislukt"]),
          site.isDemo ? eq(changes.clerkUserId, userId) : undefined,
        ),
      );
    if (pending.length)
      return NextResponse.json(
        {
          reply:
            "Rond eerst de eerdere publicatie of het herstel af. Daarna kun je verder aanpassen.",
        },
        { status: 409 },
      );
    // Demo: geen foto-uploads en een daglimiet per gebruiker
    if (site.isDemo) {
      if (afbeeldingen.length > 0) {
        return NextResponse.json({
          reply: "In de demo kun je geen foto meesturen met een chatopdracht. Wijs een bestaande foto aan en kies Vervang deze foto. Bij je eigen website kun je wel foto’s meesturen in de chat.",
        }, { status: 403 });
      }
      const vandaag = new Date();
      vandaag.setHours(0, 0, 0, 0);
      const { gte } = await import("drizzle-orm");
      const vandaagBerichten = await db
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            eq(messages.siteId, site.id),
            eq(messages.clerkUserId, userId),
            eq(messages.rol, "klant"),
            gte(messages.aangemaakt, vandaag),
          ),
        );
      if (vandaagBerichten.length >= 10) {
        return NextResponse.json({
          reply:
            "Je hebt het maximum van de demo voor vandaag bereikt (10 berichten). Enthousiast geworden? Neem contact op — dan zetten we jouw échte site over.",
        }, { status: 429 });
      }
    }

    const maand = new Date().toISOString().slice(0, 7);
    const [verbruik] = await db
      .select()
      .from(usage)
      .where(and(eq(usage.siteId, site.id), eq(usage.maand, maand)));
    if (!site.isDemo && (verbruik?.wijzigingen ?? 0) >= FAIR_USE_LIMIET) {
      return NextResponse.json({
        reply:
          "Je hebt deze maand het maximale aantal wijzigingen bereikt. Neem contact met ons op als je meer nodig hebt.",
      }, { status: 429 });
    }

    const requestBudgetUsd = site.isDemo ? 0.1 : 0.5;
    const monthlyBudgetUsd = site.isDemo ? 1 : site.aiMaandbudgetUsd;
    if (
      !(await reserveAiBudget(scope, requestBudgetUsd, monthlyBudgetUsd, maand))
    ) {
      return NextResponse.json(
        {
          reply:
            "Je AI-gebruiksruimte voor deze maand is bereikt. Neem contact op met Jos om je gebruik en pakket te bespreken.",
        },
        { status: 429 },
      );
    }

    await db
      .insert(messages)
      .values({
        siteId: site.id,
        rol: "klant",
        tekst: bericht,
        clerkUserId: userId,
      });

    const historie = await db
      .select()
      .from(messages)
      .where(
        site.isDemo
          ? and(eq(messages.siteId, site.id), eq(messages.clerkUserId, userId))
          : eq(messages.siteId, site.id),
      )
      .orderBy(messages.id)
      .then(async (rows) => {
        const { vanafLaatsteNieuwGesprek } = await import("@/lib/gesprek");
        return vanafLaatsteNieuwGesprek(rows).slice(-12);
      });

    // Wijzigingslogboek: feitelijk geheugen van wat er eerder is gebeurd
    const logboek = await db
      .select()
      .from(changes)
      .where(
        site.isDemo
          ? and(eq(changes.siteId, site.id), eq(changes.clerkUserId, userId))
          : eq(changes.siteId, site.id),
      )
      .orderBy(changes.id)
      .then((rows) => rows.slice(-15));

    // Openstaand concept? Dan werken we daarin verder i.p.v. een nieuw te maken.
    // Demo: alleen het eigen concept van deze gebruiker (ieder een eigen sandbox).
    const openConcept = await db
      .select()
      .from(changes)
      .where(
        site.isDemo
          ? and(
              eq(changes.siteId, site.id),
              eq(changes.status, "concept"),
              eq(changes.clerkUserId, userId),
            )
          : and(eq(changes.siteId, site.id), eq(changes.status, "concept")),
      )
      .orderBy(changes.id)
      .then((rows) => rows.at(-1) ?? null);

    // Demo: persoonlijke branch + persoonlijke voorbeeld-site
    const { demoBranch, demoWorker } = await import("@/lib/demo");
    const eigenBranch = site.isDemo ? demoBranch(userId) : null;
    const wvNaam = site.isDemo
      ? demoWorker(site.githubRepo, userId)
      : site.netlifySiteId
        ? `wv-${site.netlifySiteId}`
        : null;

    const encoder = new TextEncoder();
    streaming = true;
    const stream = new ReadableStream({
      async start(controller) {
        const stuur = (data: object) =>
          controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));

        let werkmap: string | null = null;
        // Stopwatch per fase, zodat we op feiten kunnen versnellen (zichtbaar in Vercel-logs)
        const klok = Date.now();
        const tijden: Record<string, number> = {};
        const tik = (fase: string) => {
          tijden[fase] = Math.round((Date.now() - klok) / 100) / 10;
        };
        try {
          stuur({
            type: "status",
            tekst: openConcept
              ? "Ik werk verder op het openstaande concept..."
              : "Momentje...",
          });
          // Alleen bij een koude start (site nog niet in het geheugen) uitleggen
          // waarom het even duurt — bij vervolgvragen is dit binnen een seconde klaar
          const koudeStart = setTimeout(() => {
            stuur({
              type: "status",
              tekst: "Ik haal de nieuwste versie van je site op...",
            });
          }, 2500);
          if (openConcept?.branch) {
            werkmap = await laadWerkmap(site.githubRepo, openConcept.branch);
          } else if (eigenBranch) {
            // Demo: verder werken op de eigen sandbox-branch als die al bestaat
            werkmap = await laadWerkmap(site.githubRepo, eigenBranch).catch(
              () => laadWerkmap(site.githubRepo),
            );
          } else {
            werkmap = await laadWerkmap(site.githubRepo);
          }
          clearTimeout(koudeStart);
          const snapshot = await maakSnapshot(werkmap);
          const siteOverzicht = await maakSiteOverzicht(werkmap);
          tik("voorbereid");

          for (const foto of afbeeldingen) {
            const doel = path.join(werkmap, foto.naam);
            await mkdir(path.dirname(doel), { recursive: true });
            await writeFile(doel, foto.data);
          }

          // "Klopt niet, kijk zelf even": schermafbeelding van precies wat de
          // eigenaar nu ziet (zelfde pagina, zelfde apparaat), zodat de AI zijn
          // eigen werk kan beoordelen in plaats van blind te raden
          let controleRegel: string | null = null;
          if (controle) {
            stuur({ type: "status", tekst: "Ik maak een schermafbeelding van wat jij nu ziet..." });
            const pad = huidigePagina && huidigePagina.startsWith("/") ? huidigePagina : "/";
            const host =
              openConcept && wvNaam
                ? `${wvNaam}.${CF_SUBDOMEIN}.workers.dev`
                : (site.domein ?? `${site.netlifySiteId}.${CF_SUBDOMEIN}.workers.dev`);
            try {
              const { maakSchermafbeelding, knipInDelen } = await import("@/lib/schermafbeelding");
              const { CONTROLE_MAP } = await import("@/lib/werkmap");
              const png = await maakSchermafbeelding(`https://${host}${pad}`, apparaat);
              const delen = await knipInDelen(png);
              await mkdir(path.join(werkmap, CONTROLE_MAP), { recursive: true });
              const paden: string[] = [];
              for (let i = 0; i < delen.length; i++) {
                const rel = `${CONTROLE_MAP}/scherm-${i + 1}.png`;
                await writeFile(path.join(werkmap, rel), delen[i]);
                paden.push(rel);
              }
              controleRegel = `De eigenaar heeft op de knop "Klopt niet, kijk zelf even" gedrukt. Hieronder staan schermafbeeldingen van wat hij NU ziet op pagina ${pad} (${apparaat}-weergave), van boven naar beneden: ${paden.join(", ")}. BEKIJK ze eerst allemaal met lees_bestand. Vergelijk wat je ziet met wat je in je vorige antwoord beweerde te hebben gedaan. Benoem concreet en eerlijk wat er niet klopt (verkeerde kleur, onzichtbaar element, verkeerde plek, niets veranderd) en herstel het in de bestanden. Zie je echt niets mis? Zeg dat dan eerlijk, beschrijf kort wat jij ziet, en vraag wat de eigenaar anders verwacht. Plaats deze schermafbeeldingen NOOIT op de site en noem hun bestandsnamen niet in je antwoord.`;
            } catch (e) {
              console.error("Schermafbeelding mislukt:", e);
              controleRegel = `De eigenaar heeft op de knop "Klopt niet, kijk zelf even" gedrukt, maar de schermafbeelding kon niet gemaakt worden. Lees de bestanden die je bij je vorige wijziging aanpaste nog eens kritisch na (kleuren die niet bestaan, selectors die nergens op slaan, ontbrekende CSS-variabelen), herstel wat je vindt, en vraag anders kort en concreet wat er niet klopt en op welke plek.`;
            }
          }

          // Gecomprimeerde video (via Rendi) ophalen en in de site zetten
          const haalBinair = async (url: string): Promise<Buffer> => {
            const ab = await fetch(url).then((r) => r.arrayBuffer());
            return Buffer.from(ab as ArrayBuffer);
          };
          const videoPaden: { video: string; poster: string | null } | null =
            await (async () => {
              if (!videoCommandId) return null;
              const { rendiStatus } = await import("@/lib/rendi");
              const st = await rendiStatus(videoCommandId).catch(() => null);
              const v = st?.output_files?.out_1?.storage_url;
              if (!v) return null;
              const ruweNaam = v.split("/").pop()?.split("?")[0] ?? "";
              const naam = /^[a-z0-9-]+\.mp4$/i.test(ruweNaam)
                ? ruweNaam
                : `video-${Date.now().toString(36)}.mp4`;
              const videoPad = `video/${naam}`;
              await mkdir(path.join(werkmap!, "video"), { recursive: true });
              await writeFile(
                path.join(werkmap!, videoPad),
                await haalBinair(v),
              );
              let posterPad: string | null = null;
              const p = st?.output_files?.out_2?.storage_url;
              if (p) {
                posterPad = `video/${naam.replace(/\.mp4$/, "")}-poster.jpg`;
                await writeFile(
                  path.join(werkmap!, posterPad),
                  await haalBinair(p),
                );
              }
              return { video: videoPad, poster: posterPad };
            })();

          const contextRegels = [
            siteOverzicht,
            site.chatGeheugen
              ? `Geheugen van eerdere gesprekken met deze eigenaar:\n${site.chatGeheugen}`
              : null,
            logboek.length > 0
              ? `Wijzigingslogboek van deze site (nieuwste onderaan):\n${logboek
                  .map(
                    (c) =>
                      `- ${c.aangemaakt.toLocaleDateString("nl-NL")} [${c.status}] "${c.promptTekst.slice(0, 120)}" → ${(Array.isArray(c.bestanden) ? (c.bestanden as string[]) : []).join(", ")}`,
                  )
                  .join(
                    "\n",
                  )}\nGebruik dit om verzoeken als "zet dat weer terug" of "zoals vóór de feestdagen" precies te begrijpen: je weet wat er wanneer veranderd is en in welke bestanden.`
              : null,
            historie.length > 1
              ? `Eerdere gespreksgeschiedenis:\n${historie
                  .slice(0, -1)
                  .map(
                    (m) =>
                      `${m.rol === "klant" ? "Eigenaar" : "Jij"}: ${m.tekst}`,
                  )
                  .join("\n")}`
              : null,
            huidigePagina && huidigePagina !== "/"
              ? `De eigenaar bekijkt op dit moment de pagina ${huidigePagina} — "deze pagina" verwijst daarnaar.`
              : null,
            kleur
              ? `De eigenaar heeft met de kleurkiezer een kleur gekozen: ${kleur}. Gebruik EXACT deze kleurcode voor wat hij in het bericht vraagt (en pas waar logisch ook hover-/accentvarianten aan zodat het consistent blijft).`
              : null,
            selectie
              ? `De eigenaar heeft in het voorbeeld een onderdeel AANGEWEZEN — het bericht gaat over precies dit element op pagina ${selectie.pad ?? "/"}:\n<${selectie.tag ?? "element"}> met tekst "${(selectie.tekst ?? "").slice(0, 200)}"\nHTML: ${(selectie.html ?? "").slice(0, 1500)}\nZoek dit element op in het bijbehorende bestand en pas dáár aan wat gevraagd wordt.`
              : null,
            videoPaden
              ? `De eigenaar heeft een VIDEO meegestuurd; die is al gecomprimeerd voor het web en staat op ${videoPaden.video}${videoPaden.poster ? ` met poster-afbeelding ${videoPaden.poster}` : ""}. Plaats hem waar het bericht om vraagt. Als achtergrond/hero-video: <video autoplay muted loop playsinline preload="metadata"${videoPaden.poster ? ` poster="/${videoPaden.poster}"` : ""}> met <source src="/${videoPaden.video}" type="video/mp4">, netjes gepositioneerd achter de tekst, en respecteer prefers-reduced-motion (dan alleen de poster). Als gewone video op een pagina: <video controls preload="metadata" poster=...>. Verwijder een eventuele oude hero-video-verwijzing die hij vervangt, maar laat het oude bestand staan.`
              : null,
            afbeeldingen.length > 1
              ? `De eigenaar heeft ${afbeeldingen.length} foto's meegestuurd; ze staan op: ${afbeeldingen.map((a) => a.naam).join(", ")} (geoptimaliseerd, max 2000px breed). BEKIJK ze eerst met lees_bestand. Gaat het om een verzameling (portfolio, galerij, projecten, "ons werk")? Behandel dit dan als iets NIEUWS volgens de webdesigner-regel: stel eerst je vragen mét KEUZES-regel — aparte pagina of sectie op een bestaande pagina? menu-item en waar? wil de eigenaar een titel/tekstje per foto (stel er per foto zelf één voor op basis van wat je op de foto ziet), of alleen de foto's? Bouw daarna het geheel in de stijl van de site, met alt-teksten per foto.`
              : afbeeldingen.length === 1
                ? `De eigenaar heeft een afbeelding meegestuurd; die staat op het pad ${afbeeldingen[0].naam} (geoptimaliseerd, max 2000px breed). BEKIJK hem eerst met lees_bestand. Bepaal uit het bericht wat de bedoeling is: (a) een foto om op de site te plaatsen — zet hem dan op de gevraagde plek met een passende alt-tekst; (b) een VOORBEELD van hoe iets eruit moet zien (schets, screenshot van een andere site, gewenste stijl) — bouw na wat er te zien is en plaats de afbeelding zelf NIET op de site; of (c) een SCREENSHOT VAN DE EIGEN SITE waarop iets niet goed staat (scheve uitlijning, verkeerde kleur, kapotte sectie) — herken om welke pagina en welk onderdeel het gaat, zoek die plek op in de bestanden en los precies dát probleem op; ook hier de afbeelding NIET plaatsen.`
                : null,
            openConcept
              ? `Je werkt verder aan een openstaand concept. Eerder in dit concept gewijzigd: ${(Array.isArray(openConcept.bestanden) ? (openConcept.bestanden as string[]) : []).join(", ") || "(onbekend)"} — vervolgverzoeken over "de video", "die knop" e.d. slaan waarschijnlijk op die eerdere wijziging; kijk daar eerst.`
              : null,
            controleRegel,
            `Verzoek van de eigenaar: ${bericht}`,
          ].filter(Boolean);

          await assertNoSymlinks(werkmap);
          let reply = "";
          let limietBereikt = false;
          // Stoppen: als de eigenaar de chat afbreekt, stopt ook de agent
          const stopper = new AbortController();
          req.signal.addEventListener("abort", () => stopper.abort());
          try {
            const uitkomst = await draaiChatAgent({
              werkmap,
              // Demo: klein snel model — prospects moeten direct resultaat zien.
              // Klantsites: Sonnet voor de hoogste kwaliteit.
              model: site.isDemo
                ? "claude-haiku-4-5-20251001"
                : "claude-sonnet-5",
              systeem: systeemPrompt(
                site.naam,
                site.richtlijnen,
                site.isDemo,
                site.githubRepo,
              ),
              opdracht: contextRegels.join("\n\n"),
              budgetUsd: requestBudgetUsd,
              signal: stopper.signal,
              opGebeurtenis: (g) => {
                if (g.soort === "tekst") {
                  stuur({ type: "tekst-delta", tekst: g.delta });
                  return;
                }
                const maker = STATUS_PER_TOOL[g.naam];
                if (maker) stuur({ type: "status", tekst: maker(g.invoer) });
                if (g.naam === "bewerk_bestand" || g.naam === "schrijf_bestand") {
                  const rel = String(g.invoer.pad ?? "").replace(/^\/+/, "");
                  // Pagina die bewerkt wordt meesturen: het voorbeeld springt
                  // er live naartoe, zodat je ziet wáár de wijziging landt.
                  if (/\.html?$/i.test(rel) && !rel.startsWith("delen/")) {
                    const pad =
                      rel === "index.html"
                        ? "/"
                        : "/" +
                          rel
                            .replace(/index\.html$/, "")
                            .replace(/\.html?$/, "/");
                    stuur({ type: "bewerkt", pad });
                  }
                  // Realtime: de tekstwijziging alvast in het voorbeeld laten
                  // zien (de echte versie volgt zodra de deploy klaar is)
                  if (g.naam === "bewerk_bestand") {
                    const kaal = (t: string) =>
                      t
                        .replace(/<[^>]+>/g, " ")
                        .replace(/\s+/g, " ")
                        .trim();
                    const zoek = kaal(String(g.invoer.zoek ?? ""));
                    const vervang = kaal(String(g.invoer.vervang ?? ""));
                    if (
                      zoek.length >= 8 &&
                      zoek.length <= 400 &&
                      vervang.length <= 600 &&
                      zoek !== vervang
                    ) {
                      stuur({ type: "tekst-live", zoek, vervang });
                    }
                  }
                }
              },
            });
            reply = uitkomst.reply;
            limietBereikt = uitkomst.limietBereikt;
            await settleAiBudget(
              scope,
              maand,
              requestBudgetUsd,
              uitkomst.kostenUsd,
            );
            const { registreerAiKosten } = await import("@/lib/kosten");
            await registreerAiKosten(site.id, "chat", {
              tokensIn: uitkomst.tokensIn,
              tokensUit: uitkomst.tokensUit,
              kostenUsd: uitkomst.kostenUsd,
            }).catch((e) => console.error("Kostenregistratie mislukt:", e));
          } catch (e) {
            if (stopper.signal.aborted) {
              // Gestopt door de eigenaar: niets opslaan, geen concept maken
              return;
            }
            throw e;
          }
          if (stopper.signal.aborted) return;
          tik("ai");

          const gewijzigd = await gewijzigdeBestanden(werkmap, snapshot);
          if (limietBereikt) {
            reply =
              gewijzigd.length > 0
                ? "Dit was een flinke klus — ik ben zover gekomen als in één keer kan. Bekijk het concept; wat er nog mist, kun je gewoon in een volgend bericht vragen (het concept blijft open, ik werk er dan op verder)."
                : "Dit verzoek is te groot voor één keer. Knip het op in kleinere stappen — bijvoorbeeld per pagina — dan pak ik ze één voor één op.";
          }
          let previewUrl: string | null = null;
          let changeRowId: number | null = null;

          if (gewijzigd.length > 0) {
            stuur({
              type: "status",
              tekst: "Ik zet het concept voor je klaar...",
            });
            const bestanden = await Promise.all(
              gewijzigd.map(async (pad) => ({
                pad,
                inhoud: await readFile(path.join(werkmap!, pad)),
              })),
            );
            // Werkversie-deploy is onafhankelijk van GitHub — laat hem parallel meelopen
            const deployKlaar = wvNaam
              ? deployMapNaarCloudflare(werkmap!, wvNaam, {
                  subdomeinAanzetten: site.isDemo,
                })
              : Promise.resolve();
            if (openConcept) {
              // Verder op het bestaande concept: zelfde branch en PR
              const { pushBestanden } = await import("@/lib/github");
              await pushBestanden(
                site.githubRepo,
                bestanden,
                `Vervolg via chat: ${bericht.slice(0, 60)}`,
                openConcept.branch,
              );
              const samengevoegd = [
                ...new Set([
                  ...(Array.isArray(openConcept.bestanden)
                    ? (openConcept.bestanden as string[])
                    : []),
                  ...gewijzigd,
                ]),
              ];
              await db
                .update(changes)
                .set({
                  bestanden: samengevoegd,
                  promptTekst: `${openConcept.promptTekst} → ${bericht}`.slice(
                    0,
                    500,
                  ),
                })
                .where(eq(changes.id, openConcept.id));
              changeRowId = openConcept.id;
              previewUrl =
                openConcept.previewUrl ?? `/preview/${openConcept.id}/`;
            } else {
              const branch = eigenBranch ?? `wijziging-${Date.now()}`;
              let baseSha: string | null = null;
              if (eigenBranch) {
                // Demo: persistente sandbox-branch; stand vooraf onthouden voor Verwijder
                const { gh, GITHUB_ORG } = await import("@/lib/github");
                try {
                  const ref = (await gh(
                    `/repos/${GITHUB_ORG}/${site.githubRepo}/git/ref/heads/${branch}`,
                  )) as { object: { sha: string } };
                  baseSha = ref.object.sha;
                } catch {
                  await maakBranch(site.githubRepo, branch);
                }
              } else {
                await maakBranch(site.githubRepo, branch);
              }
              const { pushBestanden } = await import("@/lib/github");
              await pushBestanden(
                site.githubRepo,
                bestanden,
                `Wijziging via chat: ${bericht.slice(0, 60)}`,
                branch,
              );
              // Geen pull request meer per concept — dat gebeurt pas bij Publiceer
              // (branch wordt dan rechtstreeks gemerged). Scheelt seconden per wijziging.
              const [row] = await db
                .insert(changes)
                .values({
                  siteId: site.id,
                  branch,
                  promptTekst: bericht,
                  bestanden: gewijzigd,
                  clerkUserId: userId,
                  baseSha,
                })
                .returning({ id: changes.id });
              changeRowId = row.id;
              previewUrl = `/preview/${row.id}/`;
              await db
                .update(changes)
                .set({ previewUrl })
                .where(eq(changes.id, row.id));
            }

            if (openConcept || site.isDemo) {
              // vervolg binnen hetzelfde concept of demo: geen telling
            } else if (verbruik) {
              await db
                .update(usage)
                .set({ wijzigingen: sql`${usage.wijzigingen} + 1` })
                .where(eq(usage.id, verbruik.id));
            } else {
              await db
                .insert(usage)
                .values({ siteId: site.id, maand, wijzigingen: 1 });
            }

            stuur({ type: "status", tekst: "Werkversie bijwerken..." });
            await deployKlaar;
          }
          tik("afgerond");
          console.log(
            `[chat-tijd] site=${site.id} voorbereid=${tijden.voorbereid ?? "?"}s ai=${
              tijden.ai ?? "?"
            }s totaal=${tijden.afgerond ?? "?"}s bestanden=${gewijzigd.length}`,
          );

          await db
            .insert(messages)
            .values({
              siteId: site.id,
              rol: "assistent",
              tekst: reply,
              clerkUserId: userId,
            });

          // Video-aanlevering: klant kan geen video uploaden via de chat, dus
          // Jos krijgt een seintje om het op te pakken (WeTransfer → info@)
          if (
            /video/i.test(bericht) &&
            /aanlever|nieuwe video|andere video|video vervangen|video erachter/i.test(
              bericht,
            )
          ) {
            const key = process.env.RESEND_API_KEY;
            if (key) {
              fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${key}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  from: "WordSwap portaal <info@wordswap.nl>",
                  to: ["info@wordswap.nl"],
                  subject: `🎬 Video-aanlevering: ${site.naam}`,
                  html: `<p>Een eigenaar wil een video aanleveren.</p><p><strong>Site:</strong> ${site.naam} (${site.domein ?? site.githubRepo})<br><strong>Gebruiker:</strong> ${userId}<br><strong>Vraag in de chat:</strong> ${bericht.replace(/</g, "&lt;").slice(0, 300)}</p><p>De klant heeft de instructie gekregen om de video via WeTransfer naar info@wordswap.nl te sturen. Comprimeren met het ffmpeg-recept uit de huisregels en als concept klaarzetten.</p>`,
                }),
              }).catch((e) => console.error("Video-seintje mislukt:", e));
            }
          }
          stuur({
            type: "klaar",
            reply,
            previewUrl,
            changeId: changeRowId,
            bestanden: gewijzigd,
            prompt: bericht,
          });

          // Geheugen-onderhoud: oude berichten samenvatten zodra het gesprek te lang wordt
          try {
            const alleBerichten = await db
              .select()
              .from(messages)
              .where(eq(messages.siteId, site.id))
              .orderBy(messages.id);
            if (alleBerichten.length > 40) {
              const teSamenvatten = alleBerichten.slice(0, -16);
              const Anthropic = (await import("@anthropic-ai/sdk")).default;
              const client = new Anthropic();
              const resp = await client.messages.create({
                // Samenvatten is eenvoudig werk — het snelle model volstaat
                model: "claude-haiku-4-5-20251001",
                max_tokens: 1500,
                system:
                  "Je onderhoudt het langetermijngeheugen van een website-beheerchat. Vat samen wat blijvend relevant is: voorkeuren van de eigenaar (toon, stijl, werkwijze), afspraken, terugkerende onderwerpen, en tijdelijke wijzigingen die later teruggedraaid moeten worden (zoals feestdagen-openingstijden — noteer wat de oorspronkelijke situatie was). Laat koetjes-en-kalfjes weg. Schrijf compact in het Nederlands, als opsomming.",
                messages: [
                  {
                    role: "user",
                    content: `Bestaand geheugen:\n${site.chatGeheugen ?? "(leeg)"}\n\nNieuwe gespreksfragmenten om in het geheugen te verwerken:\n${teSamenvatten
                      .map((m) => `${m.rol}: ${m.tekst.slice(0, 400)}`)
                      .join(
                        "\n",
                      )}\n\nGeef het volledige bijgewerkte geheugen terug (bestaand + nieuw samengevoegd, gededupliceerd).`,
                  },
                ],
              });
              const nieuwGeheugen = resp.content
                .filter((b) => b.type === "text")
                .map((b) => (b as { text: string }).text)
                .join("\n")
                .slice(0, 8000);
              if (nieuwGeheugen.trim()) {
                await db
                  .update(sites)
                  .set({ chatGeheugen: nieuwGeheugen })
                  .where(eq(sites.id, site.id));
                const grens = teSamenvatten[teSamenvatten.length - 1].id;
                const { lte } = await import("drizzle-orm");
                await db
                  .delete(messages)
                  .where(
                    and(eq(messages.siteId, site.id), lte(messages.id, grens)),
                  );
              }
            }
          } catch (e) {
            console.error("Geheugen-onderhoud mislukt:", e);
          }
        } catch (e) {
          console.error(e);
          stuur({
            type: "klaar",
            reply: "De wijziging is niet bevestigd. Controleer eerst of er een concept is opgeslagen.",
            failed: true,
            previewUrl: null,
            changeId: null,
          });
        } finally {
          if (werkmap) {
            await ruimWerkmapOp(werkmap).catch(() => {});
          }
          await release().catch((e) =>
            console.error("Bewerkingsslot vrijgeven:", e),
          );
          try {
            controller.close();
          } catch {}
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-store",
      },
    });
  } finally {
    if (!streaming) await release();
  }
}
