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
import { HUISREGELS } from "@/lib/huisregels";
import {
  gewijzigdeBestanden,
  laadWerkmap,
  maakSnapshot,
  ruimWerkmapOp,
} from "@/lib/werkmap";

export const maxDuration = 300;

const FAIR_USE_LIMIET = 30;

function systeemPrompt(siteNaam: string, richtlijnen?: string | null) {
  return `Je bent de AI-websitebeheerder van "${siteNaam}" voor WordPressToAI. Je praat met de eigenaar van de website — een ondernemer zonder technische kennis. De werkmap bevat de volledige website (statische HTML/CSS).

Werkwijze:
- Voer de gevraagde wijziging uit in de bestanden van de werkmap. Zoek zelf uit waar iets staat.
- Controleer na je wijziging of het resultaat consistent is (bv. menu's die op elke pagina staan, dubbele vermeldingen van hetzelfde gegeven elders op de site) en meld het als je iets tegenstrijdigs ziet.
- Wijzig alleen wat er gevraagd is. Verander nooit layout, design of andere content zonder expliciete vraag.
- Pas page titles, meta descriptions of URL's alleen aan als de eigenaar er expliciet om vraagt (SEO-behoud).
- Wijzigingen komen in een concept-versie; de eigenaar keurt ze daarna goed. Sluit af met een korte samenvatting in gewone taal van wat je hebt aangepast.
- Kun je iets niet, zeg dat eerlijk en stel een vervolgvraag.
- Antwoord altijd in het Nederlands, kort en vriendelijk, zonder technisch jargon (geen woorden als repository, branch, commit, bestand of HTML in je antwoord — zeg "de contactpagina", niet "contact.html").

${HUISREGELS}${richtlijnen ? `\n\nSpecifieke richtlijnen voor deze website (altijd naleven):\n${richtlijnen}` : ""}`;
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

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    siteId = Number(form.get("siteId"));
    bericht = String(form.get("bericht") ?? "");
    huidigePagina = String(form.get("huidigePagina") ?? "") || undefined;
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
    };
    siteId = body.siteId;
    bericht = body.bericht;
    huidigePagina = body.huidigePagina;
  }
  if (!bericht?.trim()) {
    return NextResponse.json({ error: "Leeg bericht" }, { status: 400 });
  }

  const [site] = await db
    .select()
    .from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.clerkUserId, userId)));
  if (!site) return NextResponse.json({ error: "Site niet gevonden" }, { status: 404 });

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

  const historie = await db
    .select()
    .from(messages)
    .where(eq(messages.siteId, site.id))
    .orderBy(messages.id)
    .then((rows) => rows.slice(-12));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const stuur = (data: object) =>
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));

      let werkmap: string | null = null;
      try {
        stuur({ type: "status", tekst: "Ik pak je website erbij..." });
        werkmap = await laadWerkmap(site.githubRepo);
        const snapshot = await maakSnapshot(werkmap);

        if (afbeelding) {
          const doel = path.join(werkmap, afbeelding.naam);
          await mkdir(path.dirname(doel), { recursive: true });
          await writeFile(doel, afbeelding.data);
        }

        const contextRegels = [
          historie.length > 1
            ? `Eerdere gespreksgeschiedenis:\n${historie
                .slice(0, -1)
                .map((m) => `${m.rol === "klant" ? "Eigenaar" : "Jij"}: ${m.tekst}`)
                .join("\n")}`
            : null,
          huidigePagina && huidigePagina !== "/"
            ? `De eigenaar bekijkt op dit moment de pagina ${huidigePagina} — "deze pagina" verwijst daarnaar.`
            : null,
          afbeelding
            ? `De eigenaar heeft een afbeelding meegestuurd; die staat klaar op het pad ${afbeelding.naam} (geoptimaliseerd, max 2000px breed). Plaats hem waar de eigenaar vraagt, met een passende beschrijvende alt-tekst.`
            : null,
          `Verzoek van de eigenaar: ${bericht}`,
        ].filter(Boolean);

        let reply = "";
        for await (const message of query({
          prompt: contextRegels.join("\n\n"),
          options: {
            cwd: werkmap,
            model: "claude-sonnet-5",
            systemPrompt: systeemPrompt(site.naam, site.richtlijnen),
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
            reply =
              message.subtype === "success"
                ? message.result
                : "Er ging iets mis, probeer het opnieuw.";
          }
        }

        const gewijzigd = await gewijzigdeBestanden(werkmap, snapshot);
        let previewUrl: string | null = null;
        let changeRowId: number | null = null;

        if (gewijzigd.length > 0) {
          stuur({ type: "status", tekst: "Ik zet het concept voor je klaar..." });
          const branch = `wijziging-${Date.now()}`;
          await maakBranch(site.githubRepo, branch);
          for (const pad of gewijzigd) {
            const inhoud = await readFile(path.join(werkmap, pad));
            await schrijfBestand(
              site.githubRepo,
              pad,
              inhoud,
              `Wijziging via chat: ${pad}`,
              branch
            );
          }
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
            })
            .returning({ id: changes.id });
          changeRowId = row.id;
          previewUrl = `/preview/${row.id}/`;
          await db.update(changes).set({ previewUrl }).where(eq(changes.id, row.id));

          if (verbruik) {
            await db
              .update(usage)
              .set({ wijzigingen: verbruik.wijzigingen + 1 })
              .where(eq(usage.id, verbruik.id));
          } else {
            await db.insert(usage).values({ siteId: site.id, maand, wijzigingen: 1 });
          }
        }

        await db
          .insert(messages)
          .values({ siteId: site.id, rol: "assistent", tekst: reply });

        stuur({ type: "klaar", reply, previewUrl, changeId: changeRowId });
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
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" },
  });
}
