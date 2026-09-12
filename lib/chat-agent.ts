/** In-proces chat-agent op de kale Anthropic-API (FacilityFinder-patroon):
 * directe streaming, eigen tools op de werkmap, geen subprocess-opstart.
 * Elke bestandsoperatie loopt door sitePathAllowed uit agent-boundary. */
import path from "node:path";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { sitePathAllowed } from "./agent-boundary";

/** Prijzen per miljoen tokens (USD): [invoer, uitvoer]. Cache: schrijven 1,25×
 * en lezen 0,1× de invoerprijs. */
const PRIJZEN: Record<string, [number, number]> = {
  "claude-sonnet-5": [2, 10],
  "claude-haiku-4-5-20251001": [1, 5],
};

export type AgentGebeurtenis =
  | { soort: "tekst"; delta: string }
  | { soort: "tool"; naam: string; invoer: Record<string, unknown> };

export type AgentUitkomst = {
  reply: string;
  limietBereikt: boolean;
  tokensIn: number;
  tokensUit: number;
  kostenUsd: number;
};

const MAX_LEES = 60_000; // tekens per bestand richting het model
const MAX_BEURTEN = 40;

function veiligPad(root: string, pad: string) {
  return sitePathAllowed(root, pad).then((ok) =>
    ok ? path.resolve(root, pad) : null,
  );
}

async function lijstAlleBestanden(root: string, sub = ""): Promise<string[]> {
  const uit: string[] = [];
  const map = path.join(root, sub);
  for (const entry of await readdir(map, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "wp2ai-controle") continue;
    const rel = sub ? `${sub}/${entry.name}` : entry.name;
    if (entry.isDirectory()) uit.push(...(await lijstAlleBestanden(root, rel)));
    else uit.push(rel);
  }
  return uit;
}

const BINAIR = /\.(png|jpe?g|gif|webp|avif|ico|mp4|mov|webm|woff2?|ttf|eot|pdf|zip)$/i;
const AFBEELDING: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export async function draaiChatAgent(opties: {
  werkmap: string;
  model: string;
  systeem: string;
  opdracht: string;
  budgetUsd: number;
  signal?: AbortSignal;
  opGebeurtenis: (g: AgentGebeurtenis) => void;
}): Promise<AgentUitkomst> {
  const { werkmap, opGebeurtenis } = opties;
  const client = new Anthropic();

  const fout = (t: string) => `FOUT: ${t}`;
  const buitenSite = fout(
    "dit pad valt buiten de sitebestanden en is niet toegestaan.",
  );

  const tools = [
    betaZodTool({
      name: "lijst_bestanden",
      description:
        "Geeft alle bestanden van de website (relatief pad per regel). Gebruik dit als je niet zeker weet waar iets staat.",
      inputSchema: z.object({}),
      run: async () => {
        opGebeurtenis({ soort: "tool", naam: "lijst_bestanden", invoer: {} });
        return (await lijstAlleBestanden(werkmap)).join("\n") || "(leeg)";
      },
    }),
    betaZodTool({
      name: "lees_bestand",
      description:
        "Leest een bestand van de website. Afbeeldingen worden als beeld getoond; tekstbestanden als tekst.",
      inputSchema: z.object({
        pad: z.string().describe("Relatief pad, bijv. index.html"),
      }),
      run: async ({ pad }) => {
        opGebeurtenis({ soort: "tool", naam: "lees_bestand", invoer: { pad } });
        const abs = await veiligPad(werkmap, pad);
        if (!abs) return buitenSite;
        const ext = path.extname(pad).toLowerCase();
        const mime = AFBEELDING[ext];
        try {
          if (mime) {
            const data = await readFile(abs);
            if (data.length > 4_500_000)
              return fout("afbeelding te groot om te bekijken.");
            return [
              {
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: mime as
                    | "image/png"
                    | "image/jpeg"
                    | "image/gif"
                    | "image/webp",
                  data: data.toString("base64"),
                },
              },
            ];
          }
          if (BINAIR.test(pad)) {
            const info = await stat(abs);
            return `(binair bestand, ${Math.round(info.size / 1024)} kB — inhoud niet leesbaar als tekst)`;
          }
          const tekst = await readFile(abs, "utf8");
          return tekst.length > MAX_LEES
            ? tekst.slice(0, MAX_LEES) + "\n…(afgekapt)"
            : tekst;
        } catch {
          return fout(`kan ${pad} niet lezen (bestaat het?).`);
        }
      },
    }),
    betaZodTool({
      name: "zoek_tekst",
      description:
        "Zoekt een letterlijke tekst in alle tekstbestanden van de website; geeft per treffer bestand en regel.",
      inputSchema: z.object({
        tekst: z.string().min(2).describe("Letterlijke zoektekst"),
      }),
      run: async ({ tekst }) => {
        opGebeurtenis({ soort: "tool", naam: "zoek_tekst", invoer: { tekst } });
        const treffers: string[] = [];
        for (const rel of await lijstAlleBestanden(werkmap)) {
          if (BINAIR.test(rel)) continue;
          const inhoud = await readFile(path.join(werkmap, rel), "utf8").catch(
            () => "",
          );
          if (!inhoud.includes(tekst)) continue;
          const regels = inhoud.split("\n");
          for (let i = 0; i < regels.length; i++) {
            if (regels[i].includes(tekst)) {
              treffers.push(`${rel}:${i + 1}: ${regels[i].trim().slice(0, 200)}`);
              if (treffers.length >= 40) break;
            }
          }
          if (treffers.length >= 40) break;
        }
        return treffers.join("\n") || "(geen treffers)";
      },
    }),
    betaZodTool({
      name: "bewerk_bestand",
      description:
        "Vervangt in één bestand een letterlijk tekstfragment door nieuwe tekst. `zoek` moet precies één keer voorkomen (tenzij alles=true, dan alle keren). Neem genoeg omliggende tekst mee om het fragment uniek te maken.",
      inputSchema: z.object({
        pad: z.string(),
        zoek: z.string().min(1),
        vervang: z.string(),
        alles: z.boolean().optional(),
      }),
      run: async ({ pad, zoek, vervang, alles }) => {
        opGebeurtenis({
          soort: "tool",
          naam: "bewerk_bestand",
          invoer: { pad, zoek, vervang },
        });
        const abs = await veiligPad(werkmap, pad);
        if (!abs) return buitenSite;
        let inhoud: string;
        try {
          inhoud = await readFile(abs, "utf8");
        } catch {
          return fout(`kan ${pad} niet lezen.`);
        }
        const aantal = inhoud.split(zoek).length - 1;
        if (aantal === 0)
          return fout(
            "de zoektekst komt niet voor in dit bestand. Lees het bestand en probeer opnieuw met de exacte tekst.",
          );
        if (aantal > 1 && !alles)
          return fout(
            `de zoektekst komt ${aantal}× voor. Maak hem uniek met meer omliggende tekst, of zet alles=true om alle voorkomens te vervangen.`,
          );
        await writeFile(
          abs,
          alles ? inhoud.split(zoek).join(vervang) : inhoud.replace(zoek, vervang),
        );
        return "Gelukt.";
      },
    }),
    betaZodTool({
      name: "schrijf_bestand",
      description:
        "Maakt een nieuw bestand aan of overschrijft een bestaand bestand volledig met de gegeven inhoud. Gebruik voor nieuwe pagina's; voor kleine aanpassingen gebruik je bewerk_bestand.",
      inputSchema: z.object({ pad: z.string(), inhoud: z.string() }),
      run: async ({ pad, inhoud }) => {
        opGebeurtenis({
          soort: "tool",
          naam: "schrijf_bestand",
          invoer: { pad },
        });
        const abs = await veiligPad(werkmap, pad);
        if (!abs) return buitenSite;
        await mkdir(path.dirname(abs), { recursive: true });
        await writeFile(abs, inhoud);
        return "Gelukt.";
      },
    }),
  ];

  const runner = client.beta.messages.toolRunner(
    {
      model: opties.model,
      max_tokens: 16000,
      max_iterations: MAX_BEURTEN,
      stream: true,
      system: [
        {
          type: "text",
          text: opties.systeem,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools,
      messages: [{ role: "user", content: opties.opdracht }],
    },
    { signal: opties.signal },
  );

  let reply = "";
  let tokensIn = 0;
  let tokensUit = 0;
  let kostenUsd = 0;
  let limietBereikt = false;
  const [prijsIn, prijsUit] = PRIJZEN[opties.model] ?? [2, 10];

  for await (const beurtStream of runner) {
    let beurtTekst = "";
    for await (const event of beurtStream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        beurtTekst += event.delta.text;
        opGebeurtenis({ soort: "tekst", delta: event.delta.text });
      }
    }
    const bericht = await beurtStream.finalMessage();
    // Alleen de tekst van de laatste beurt is het eindantwoord; tussenteksten
    // ("Ik ga eerst kijken...") horen bij de voortgang.
    if (beurtTekst.trim()) reply = beurtTekst.trim();
    const u = bericht.usage;
    const inTok = (u.input_tokens ?? 0) as number;
    const cacheSchrijf = (u.cache_creation_input_tokens ?? 0) as number;
    const cacheLees = (u.cache_read_input_tokens ?? 0) as number;
    const uitTok = (u.output_tokens ?? 0) as number;
    tokensIn += inTok + cacheSchrijf + cacheLees;
    tokensUit += uitTok;
    kostenUsd +=
      (inTok * prijsIn +
        cacheSchrijf * prijsIn * 1.25 +
        cacheLees * prijsIn * 0.1 +
        uitTok * prijsUit) /
      1_000_000;
    if (kostenUsd >= opties.budgetUsd) {
      limietBereikt = true;
      break;
    }
  }
  const laatste = await runner.done().catch(() => null);
  if (laatste && laatste.stop_reason === "max_tokens") limietBereikt = true;
  // max_iterations bereikt terwijl het model nog tools wilde gebruiken
  if (laatste && laatste.stop_reason === "tool_use") limietBereikt = true;

  return { reply, limietBereikt, tokensIn, tokensUit, kostenUsd };
}
