import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { changes, messages, sites, usage } from "@/db/schema";
import {
  leesBestand,
  lijstBestanden,
  maakBranch,
  maakPullRequest,
  schrijfBestand,
} from "@/lib/github";

export const maxDuration = 300;

const FAIR_USE_LIMIET = 30;

const tools: Anthropic.Tool[] = [
  {
    name: "lijst_bestanden",
    description:
      "Geeft alle bestandspaden in de website-repository terug. Gebruik dit om te ontdekken welke pagina's en bestanden er zijn.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "lees_bestand",
    description: "Leest de inhoud van een bestand uit de website-repository.",
    input_schema: {
      type: "object",
      properties: {
        pad: { type: "string", description: "Pad van het bestand, bv. index.html" },
      },
      required: ["pad"],
    },
  },
  {
    name: "schrijf_bestand",
    description:
      "Schrijft de volledige nieuwe inhoud van een bestand naar de concept-versie van de website. Geef altijd de complete bestandsinhoud, niet alleen het gewijzigde stuk.",
    input_schema: {
      type: "object",
      properties: {
        pad: { type: "string" },
        inhoud: { type: "string", description: "Volledige nieuwe bestandsinhoud" },
      },
      required: ["pad", "inhoud"],
    },
  },
];

function systeemPrompt(siteNaam: string) {
  return `Je bent de AI-websitebeheerder van "${siteNaam}" voor WordPressToAI. Je praat met de eigenaar van de website — een ondernemer zonder technische kennis.

Werkwijze:
- Voer de gevraagde wijziging uit met de tools. Zoek zelf uit in welk bestand iets staat (lijst_bestanden, lees_bestand).
- Wijzig alleen wat er gevraagd is. Verander nooit layout, design of andere content zonder expliciete vraag.
- Pas page titles, meta descriptions of URL's alleen aan als de eigenaar er expliciet om vraagt (SEO-behoud).
- Schrijfwijzigingen komen in een concept-versie terecht; de eigenaar keurt ze daarna goed. Vertel na afloop kort en in gewone taal wat je hebt aangepast en dat het concept klaarstaat om te bekijken.
- Kun je iets niet (bv. het verzoek is onduidelijk of raakt iets dat niet in de site zit), zeg dat dan eerlijk en stel een vervolgvraag.
- Antwoord altijd in het Nederlands, kort en vriendelijk, zonder technisch jargon (geen woorden als repository, branch, commit of HTML in je antwoord).`;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { siteId, bericht, huidigePagina } = (await req.json()) as {
    siteId: number;
    bericht: string;
    huidigePagina?: string;
  };
  if (!bericht?.trim()) {
    return NextResponse.json({ error: "Leeg bericht" }, { status: 400 });
  }

  const [site] = await db
    .select()
    .from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.clerkUserId, userId)));
  if (!site) return NextResponse.json({ error: "Site niet gevonden" }, { status: 404 });

  // Fair use check
  const maand = new Date().toISOString().slice(0, 7);
  const [verbruik] = await db
    .select()
    .from(usage)
    .where(and(eq(usage.siteId, site.id), eq(usage.maand, maand)));
  if ((verbruik?.wijzigingen ?? 0) >= FAIR_USE_LIMIET) {
    return NextResponse.json({
      reply:
        "Je hebt deze maand het maximale aantal wijzigingen bereikt. Neem contact met ons op als je meer nodig hebt.",
    });
  }

  await db.insert(messages).values({ siteId: site.id, rol: "klant", tekst: bericht });

  // Recente geschiedenis als context
  const historie = await db
    .select()
    .from(messages)
    .where(eq(messages.siteId, site.id))
    .orderBy(messages.id)
    .then((rows) => rows.slice(-20));

  const conversatie: Anthropic.MessageParam[] = historie.map((m) => ({
    role: m.rol === "klant" ? "user" : "assistant",
    content: m.tekst,
  }));

  if (huidigePagina && conversatie.length > 0) {
    const laatste = conversatie[conversatie.length - 1];
    laatste.content = `[De eigenaar bekijkt op dit moment de pagina ${huidigePagina} — "deze pagina" verwijst daarnaar.]\n\n${laatste.content}`;
  }

  const client = new Anthropic();
  const repo = site.githubRepo;
  const changeId = Date.now();
  const branch = `wijziging-${changeId}`;
  let branchGemaakt = false;
  const gewijzigd: string[] = [];

  let response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 16000,
    system: systeemPrompt(site.naam),
    tools,
    messages: conversatie,
  });

  while (response.stop_reason === "tool_use") {
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      let result: string;
      try {
        if (block.name === "lijst_bestanden") {
          result = (await lijstBestanden(repo, branchGemaakt ? branch : undefined)).join("\n");
        } else if (block.name === "lees_bestand") {
          const { pad } = block.input as { pad: string };
          result = await leesBestand(repo, pad, branchGemaakt ? branch : undefined);
        } else if (block.name === "schrijf_bestand") {
          const { pad, inhoud } = block.input as { pad: string; inhoud: string };
          if (!branchGemaakt) {
            await maakBranch(repo, branch);
            branchGemaakt = true;
          }
          await schrijfBestand(repo, pad, inhoud, `Wijziging via chat: ${pad}`, branch);
          gewijzigd.push(pad);
          result = `Opgeslagen: ${pad}`;
        } else {
          result = "Onbekende tool";
        }
      } catch (e) {
        result = `Fout: ${e instanceof Error ? e.message : String(e)}`;
      }
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result,
      });
    }
    conversatie.push({ role: "assistant", content: response.content });
    conversatie.push({ role: "user", content: toolResults });
    response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      system: systeemPrompt(site.naam),
      tools,
      messages: conversatie,
    });
  }

  const reply = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  let previewUrl: string | null = null;
  let changeRowId: number | null = null;

  if (branchGemaakt) {
    const pr = (await maakPullRequest(
      repo,
      branch,
      `Wijziging via chat`,
      `Gevraagd: ${bericht}\n\nGewijzigde bestanden:\n${gewijzigd.map((p) => `- ${p}`).join("\n")}`
    )) as { number: number; html_url: string };
    previewUrl = site.netlifySiteId
      ? `https://deploy-preview-${pr.number}--${site.netlifySiteId}.netlify.app`
      : pr.html_url;
    const [row] = await db
      .insert(changes)
      .values({
        siteId: site.id,
        branch,
        prNumber: pr.number,
        previewUrl,
        promptTekst: bericht,
      })
      .returning({ id: changes.id });
    changeRowId = row.id;

    if (verbruik) {
      await db
        .update(usage)
        .set({ wijzigingen: verbruik.wijzigingen + 1 })
        .where(eq(usage.id, verbruik.id));
    } else {
      await db.insert(usage).values({ siteId: site.id, maand, wijzigingen: 1 });
    }
  }

  await db.insert(messages).values({ siteId: site.id, rol: "assistent", tekst: reply });

  return NextResponse.json({ reply, previewUrl, changeId: changeRowId });
}
