import { query } from "@anthropic-ai/claude-agent-sdk";
import { auth } from "@clerk/nextjs/server";
import sharp from "sharp";
import { and, eq } from "drizzle-orm";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { changes, messages, sites, usage } from "@/db/schema";
import { maakBranch, maakPullRequest, schrijfBestand } from "@/lib/github";
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
- Afbeeldingen uploaden kan niet in de demo. Wil de gebruiker een andere afbeelding, gebruik dan uitsluitend afbeeldingen die al in de werkmap staan (kijk in de map met afbeeldingen en bied aan welke er zijn). Verzin of download nooit nieuwe afbeeldingen.
- Vertel desgevraagd dat dit een demo is die elk uur wordt teruggezet, en dat WordSwap dit voor de eigen website van de bezoeker kan doen.`;

function systeemPrompt(
  siteNaam: string,
  richtlijnen?: string | null,
  isDemo = false,
  siteCode?: string
) {
  return `Je bent de AI-websitebeheerder van "${siteNaam}" voor WordSwap. Je praat met de eigenaar van de website — een ondernemer zonder technische kennis. De werkmap bevat de volledige website (statische HTML/CSS).

Werkwijze:
- Voer de gevraagde wijziging uit in de bestanden van de werkmap. Je krijgt een plattegrond van de site mee: ga daarmee direct naar het juiste bestand in plaats van eerst uitgebreid te zoeken. Alleen als de plattegrond geen uitsluitsel geeft, zoek je zelf met Grep.
- WERK SNEL: de eigenaar zit te wachten. Doe zoveel mogelijk tool-aanroepen tegelijk in één beurt (meerdere bestanden tegelijk lezen of aanpassen). Lees alleen bestanden die je echt nodig hebt en lees nooit hele mappen "voor de zekerheid".
- Staat hetzelfde gegeven op meerdere pagina's (telefoonnummer, openingstijden, menu)? Pas het overal aan — de plattegrond vertelt je waar. Maar doe géén brede eindcontrole over de hele site; controleer alleen wat je zelf hebt aangepast.
- Heeft de site een map delen/ (menu.html, footer.html, ...)? Dat zijn centrale onderdelen die via <!--invoeg:naam--> op pagina's worden ingevoegd. Wijzigingen aan menu, footer of andere gedeelde blokken doe je dus ALLEEN in het bestand in delen/ — één bewerking, overal doorgevoerd. Kopieer nooit de inhoud van een deel naar losse pagina's.
- Wijzig alleen wat er gevraagd is. Verander nooit layout, design of andere content zonder expliciete vraag.
- Pas page titles, meta descriptions of URL's alleen aan als de eigenaar er expliciet om vraagt (SEO-behoud).
- Wijzigingen komen in een concept-versie; de eigenaar keurt ze daarna goed. Sluit af met een korte samenvatting in gewone taal van wat je hebt aangepast.
- Kun je iets niet, zeg dat eerlijk en stel een vervolgvraag.
- Antwoord altijd in het Nederlands, kort en vriendelijk, zonder technisch jargon (geen woorden als repository, branch, commit, bestand of HTML in je antwoord — zeg "de contactpagina", niet "contact.html"). Ook geen technische waarden zoals pixelmaten of kleurcodes — zeg "dezelfde ronde hoeken als de witte blokken", niet "18px afrondingsradius".
- Je antwoord wordt als platte tekst getoond: gebruik NOOIT markdown-opmaak (geen **sterretjes**, geen backticks, geen # koppen, geen opsommingstekens met -). Gewone zinnen.

${HUISREGELS}${siteCode ? `\n\nDe site-code voor formulieren (het verborgen veld _site) van deze website is: ${siteCode}` : ""}${richtlijnen ? `\n\nSpecifieke richtlijnen voor deze website (altijd naleven):\n${richtlijnen}` : ""}${isDemo ? DEMO_REGELS : ""}`;
}

const STATUS_PER_TOOL: Record<string, (input: Record<string, unknown>) => string> = {
  Read: (i) => `Ik lees ${paginaNaam(String(i.file_path ?? ""))}...`,
  Glob: () => "Ik kijk welke pagina's je site heeft...",
  Grep: () => "Ik zoek waar het staat...",
  Edit: (i) => `Ik pas ${paginaNaam(String(i.file_path ?? ""))} aan...`,
  Write: (i) => `Ik werk ${paginaNaam(String(i.file_path ?? ""))} bij...`,
};

function paginaNaam(pad: string) {
  const naam = path.basename(pad);
  if (naam === "index.html") return "de homepage";
  if (naam.endsWith(".css") || naam.endsWith(".js")) return "de vormgeving";
  return `de pagina ${naam.replace(/\.html?$/, "")}`;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  let siteId: number;
  let bericht: string;
  let huidigePagina: string | undefined;
  let afbeelding: { naam: string; data: Buffer } | null = null;
  type Selectie = { pad?: string; tag?: string; tekst?: string; html?: string };
  let selectie: Selectie | null = null;
  let kleur: string | null = null;

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
    const file = form.get("afbeelding");
    if (file instanceof File && file.size > 0) {
      if (file.size > 8 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Afbeelding is te groot (max 8 MB)" },
          { status: 400 }
        );
      }
      const basisnaam = file.name
        .replace(/\.[^.]+$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "afbeelding";
      const data = await sharp(Buffer.from(await file.arrayBuffer()))
        .rotate()
        .resize({ width: 2000, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      afbeelding = { naam: `afbeeldingen/${basisnaam}.webp`, data };
    }
  } else {
    const body = (await req.json()) as {
      siteId: number;
      bericht: string;
      huidigePagina?: string;
      selectie?: Selectie;
      kleur?: string;
    };
    siteId = body.siteId;
    bericht = body.bericht;
    huidigePagina = body.huidigePagina;
    selectie = body.selectie ?? null;
    if (typeof body.kleur === "string" && /^#[0-9a-fA-F]{6}$/.test(body.kleur)) kleur = body.kleur;
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
  if ((site.status === "gepauzeerd" || site.status === "opgezegd") && !(await isBeheerder())) {
    return NextResponse.json(
      {
        error:
          site.status === "gepauzeerd"
            ? "Je AI-koppeling staat op dit moment gepauzeerd. Neem contact met ons op om hem weer te activeren."
            : "Je AI-koppeling is beëindigd. Je website blijft gewoon online; neem contact met ons op als je weer wijzigingen wilt kunnen doen.",
      },
      { status: 403 }
    );
  }

  // Demo: geen foto-uploads en een daglimiet per gebruiker
  if (site.isDemo) {
    afbeelding = null;
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
          gte(messages.aangemaakt, vandaag)
        )
      );
    if (vandaagBerichten.length >= 10) {
      return NextResponse.json({
        reply:
          "Je hebt het maximum van de demo voor vandaag bereikt (10 berichten). Enthousiast geworden? Neem contact op — dan zetten we jouw échte site over.",
      });
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
    });
  }

  await db
    .insert(messages)
    .values({ siteId: site.id, rol: "klant", tekst: bericht, clerkUserId: userId });

  const historie = await db
    .select()
    .from(messages)
    .where(
      site.isDemo
        ? and(eq(messages.siteId, site.id), eq(messages.clerkUserId, userId))
        : eq(messages.siteId, site.id)
    )
    .orderBy(messages.id)
    .then((rows) => rows.slice(-12));

  // Wijzigingslogboek: feitelijk geheugen van wat er eerder is gebeurd
  const logboek = await db
    .select()
    .from(changes)
    .where(eq(changes.siteId, site.id))
    .orderBy(changes.id)
    .then((rows) => rows.slice(-15));

  // Openstaand concept? Dan werken we daarin verder i.p.v. een nieuw te maken
  const openConcept = await db
    .select()
    .from(changes)
    .where(and(eq(changes.siteId, site.id), eq(changes.status, "concept")))
    .orderBy(changes.id)
    .then((rows) => rows.at(-1) ?? null);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const stuur = (data: object) =>
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));

      let werkmap: string | null = null;
      try {
        stuur({
          type: "status",
          tekst: openConcept
            ? "Ik werk verder op het openstaande concept..."
            : "Ik ga voor je aan de slag...",
        });
        werkmap = await laadWerkmap(site.githubRepo, openConcept?.branch);
        const snapshot = await maakSnapshot(werkmap);
        const siteOverzicht = await maakSiteOverzicht(werkmap);

        if (afbeelding) {
          const doel = path.join(werkmap, afbeelding.naam);
          await mkdir(path.dirname(doel), { recursive: true });
          await writeFile(doel, afbeelding.data);
        }

        const contextRegels = [
          siteOverzicht,
          site.chatGeheugen
            ? `Geheugen van eerdere gesprekken met deze eigenaar:\n${site.chatGeheugen}`
            : null,
          logboek.length > 0
            ? `Wijzigingslogboek van deze site (nieuwste onderaan):\n${logboek
                .map(
                  (c) =>
                    `- ${c.aangemaakt.toLocaleDateString("nl-NL")} [${c.status}] "${c.promptTekst.slice(0, 120)}" → ${(Array.isArray(c.bestanden) ? (c.bestanden as string[]) : []).join(", ")}`
                )
                .join("\n")}\nGebruik dit om verzoeken als "zet dat weer terug" of "zoals vóór de feestdagen" precies te begrijpen: je weet wat er wanneer veranderd is en in welke bestanden.`
            : null,
          historie.length > 1
            ? `Eerdere gespreksgeschiedenis:\n${historie
                .slice(0, -1)
                .map((m) => `${m.rol === "klant" ? "Eigenaar" : "Jij"}: ${m.tekst}`)
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
          afbeelding
            ? `De eigenaar heeft een afbeelding meegestuurd; die staat op het pad ${afbeelding.naam} (geoptimaliseerd, max 2000px breed). BEKIJK hem eerst met Read. Bepaal uit het bericht wat de bedoeling is: (a) een foto om op de site te plaatsen — zet hem dan op de gevraagde plek met een passende alt-tekst; (b) een VOORBEELD van hoe iets eruit moet zien (schets, screenshot van een andere site, gewenste stijl) — bouw na wat er te zien is en plaats de afbeelding zelf NIET op de site; of (c) een SCREENSHOT VAN DE EIGEN SITE waarop iets niet goed staat (scheve uitlijning, verkeerde kleur, kapotte sectie) — herken om welke pagina en welk onderdeel het gaat, zoek die plek op in de bestanden en los precies dát probleem op; ook hier de afbeelding NIET plaatsen.`
            : null,
          openConcept
            ? `Je werkt verder aan een openstaand concept. Eerder in dit concept gewijzigd: ${(Array.isArray(openConcept.bestanden) ? (openConcept.bestanden as string[]) : []).join(", ") || "(onbekend)"} — vervolgverzoeken over "de video", "die knop" e.d. slaan waarschijnlijk op die eerdere wijziging; kijk daar eerst.`
            : null,
          `Verzoek van de eigenaar: ${bericht}`,
        ].filter(Boolean);

        let reply = "";
        let limietBereikt = false;
        // Stoppen: als de eigenaar de chat afbreekt, stopt ook de agent
        const stopper = new AbortController();
        req.signal.addEventListener("abort", () => stopper.abort());
        try {
        for await (const message of query({
          prompt: contextRegels.join("\n\n"),
          options: {
            cwd: werkmap,
            abortController: stopper,
            // Demo: klein snel model — prospects moeten direct resultaat zien.
            // Klantsites: Sonnet voor de hoogste kwaliteit.
            model: site.isDemo ? "claude-haiku-4-5-20251001" : "claude-sonnet-5",
            systemPrompt: systeemPrompt(site.naam, site.richtlijnen, site.isDemo, site.githubRepo),
            allowedTools: ["Read", "Write", "Edit", "Glob", "Grep"],
            permissionMode: "bypassPermissions",
            maxTurns: 40,
            env: {
              ...process.env,
              // Op Vercel is alleen /tmp beschrijfbaar; de motor wil zijn
              // instellingen en cache ergens kwijt kunnen.
              HOME: "/tmp",
              XDG_CONFIG_HOME: "/tmp/.config",
              XDG_CACHE_HOME: "/tmp/.cache",
              CLAUDE_CONFIG_DIR: "/tmp/.claude",
            },
          },
        })) {
          if (message.type === "assistant") {
            for (const block of message.message.content) {
              if (block.type === "tool_use") {
                const maker = STATUS_PER_TOOL[block.name];
                if (maker) {
                  stuur({
                    type: "status",
                    tekst: maker(block.input as Record<string, unknown>),
                  });
                }
              }
            }
          }
          if (message.type === "result") {
            if (message.subtype === "success") reply = message.result;
            else limietBereikt = true;
            const u = (message as { usage?: { input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number } }).usage;
            const kosten = (message as { total_cost_usd?: number }).total_cost_usd;
            const { registreerAiKosten } = await import("@/lib/kosten");
            registreerAiKosten(site.id, "chat", {
              tokensIn:
                (u?.input_tokens ?? 0) +
                (u?.cache_creation_input_tokens ?? 0) +
                (u?.cache_read_input_tokens ?? 0),
              tokensUit: u?.output_tokens ?? 0,
              kostenUsd: kosten ?? 0,
            }).catch((e) => console.error("Kostenregistratie mislukt:", e));
          }
        }
        } catch (e) {
          if (stopper.signal.aborted) {
            // Gestopt door de eigenaar: niets opslaan, geen concept maken
            return;
          }
          // Bij de beurtlimiet gooien we het al gedane werk niet weg:
          // wat af is wordt hieronder gewoon als concept klaargezet.
          if (/maximum number of turns/i.test(String(e))) limietBereikt = true;
          else throw e;
        }
        if (stopper.signal.aborted) return;

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
          stuur({ type: "status", tekst: "Ik zet het concept voor je klaar..." });
          const bestanden = await Promise.all(
            gewijzigd.map(async (pad) => ({
              pad,
              inhoud: await readFile(path.join(werkmap!, pad)),
            }))
          );
          // Werkversie-deploy is onafhankelijk van GitHub — laat hem parallel meelopen
          const deployKlaar = site.netlifySiteId
            ? deployMapNaarCloudflare(werkmap!, `wv-${site.netlifySiteId}`, {
                subdomeinAanzetten: false,
              }).catch((e) => console.error("Werkversie-deploy mislukt:", e))
            : Promise.resolve();
          if (openConcept) {
            // Verder op het bestaande concept: zelfde branch en PR
            const { pushBestanden } = await import("@/lib/github");
            await pushBestanden(
              site.githubRepo,
              bestanden,
              `Vervolg via chat: ${bericht.slice(0, 60)}`,
              openConcept.branch
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
                promptTekst: `${openConcept.promptTekst} → ${bericht}`.slice(0, 500),
              })
              .where(eq(changes.id, openConcept.id));
            changeRowId = openConcept.id;
            previewUrl = openConcept.previewUrl ?? `/preview/${openConcept.id}/`;
          } else {
            const branch = `wijziging-${Date.now()}`;
            await maakBranch(site.githubRepo, branch);
            const { pushBestanden } = await import("@/lib/github");
            await pushBestanden(
              site.githubRepo,
              bestanden,
              `Wijziging via chat: ${bericht.slice(0, 60)}`,
              branch
            );
            const pr = (await maakPullRequest(
              site.githubRepo,
              branch,
              "Wijziging via chat",
              `Gevraagd: ${bericht}\n\nGewijzigde bestanden:\n${gewijzigd
                .map((p) => `- ${p}`)
                .join("\n")}`
            )) as { number: number };
            const [row] = await db
              .insert(changes)
              .values({
                siteId: site.id,
                branch,
                prNumber: pr.number,
                promptTekst: bericht,
                bestanden: gewijzigd,
              })
              .returning({ id: changes.id });
            changeRowId = row.id;
            previewUrl = `/preview/${row.id}/`;
            await db.update(changes).set({ previewUrl }).where(eq(changes.id, row.id));
          }

          if (openConcept || site.isDemo) {
            // vervolg binnen hetzelfde concept of demo: geen telling
          } else if (verbruik) {
            await db
              .update(usage)
              .set({ wijzigingen: verbruik.wijzigingen + 1 })
              .where(eq(usage.id, verbruik.id));
          } else {
            await db.insert(usage).values({ siteId: site.id, maand, wijzigingen: 1 });
          }

          stuur({ type: "status", tekst: "Werkversie bijwerken..." });
          await deployKlaar;
        }

        await db
          .insert(messages)
          .values({ siteId: site.id, rol: "assistent", tekst: reply, clerkUserId: userId });

        stuur({ type: "klaar", reply, previewUrl, changeId: changeRowId, bestanden: gewijzigd, prompt: bericht });

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
                    .join("\n")}\n\nGeef het volledige bijgewerkte geheugen terug (bestaand + nieuw samengevoegd, gededupliceerd).`,
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
                .where(and(eq(messages.siteId, site.id), lte(messages.id, grens)));
            }
          }
        } catch (e) {
          console.error("Geheugen-onderhoud mislukt:", e);
        }
      } catch (e) {
        console.error(e);
        stuur({
          type: "klaar",
          reply: "Er ging iets mis, probeer het opnieuw.",
          previewUrl: null,
          changeId: null,
        });
      } finally {
        if (werkmap) await ruimWerkmapOp(werkmap).catch(() => {});
        try {
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" },
  });
}
