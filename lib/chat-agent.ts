/** In-proces chat-agent op de kale Anthropic-API (FacilityFinder-patroon):
 * directe streaming, eigen tools op de werkmap, geen subprocess-opstart.
 * Elke bestandsoperatie loopt door sitePathAllowed uit agent-boundary. */
import path from "node:path";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
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
  | { soort: "tool"; naam: string; invoer: Record<string, unknown> }
  /** Tussen twee werkstappen door denkt het model na; dat duurt bij een grote
   * site seconden tot minuten. Zonder dit signaal blijft de laatste
   * stap-melding staan en lijkt de chat vast te zitten. */
  | { soort: "denkt" }
  /** Een werkstap is begonnen, maar wordt nog opgesteld. Bij een grote pagina
   * duurt alleen het schrijven al minuten; zonder dit signaal staat er al die
   * tijd "ik denk na", terwijl er gewoon gewerkt wordt. `pad` volgt zodra het
   * uit de binnenkomende gegevens te halen is. */
  | { soort: "toolStart"; naam: string; pad?: string };

export type AgentUitkomst = {
  reply: string;
  limietBereikt: boolean;
  /** De stiltewachter greep in: een storing bij ons, geen te grote opdracht. */
  stilteGeraakt?: boolean;
  tokensIn: number;
  tokensUit: number;
  kostenUsd: number;
  /** Uit de cache gelezen invoertokens — maat voor hoeveel herhaald leeswerk
   * we besparen (zichtbaar in de Vercel-logs). */
  cacheGelezen: number;
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

/**
 * Bestandsslot per pad. De AI roept gereedschap vaak tegelijk aan (sneller), en de tool-runner
 * voert die aanroepen echt gelijktijdig uit. Vier bewerkingen op hetzelfde bestand lazen dan
 * dezelfde begintoestand en overschreven elkaar: alleen de laatste bleef over, soms met een
 * restje oude tekst (Van Dijk, 17-09-2026). Met dit slot lopen acties op hetzelfde bestand na
 * elkaar; acties op verschillende bestanden blijven gelijktijdig.
 */
export function maakBestandsSlot() {
  const rijen = new Map<string, Promise<unknown>>();
  return function opBestand<T>(abs: string, werk: () => Promise<T>): Promise<T> {
    const vorige = rijen.get(abs) ?? Promise.resolve();
    const deze = vorige.then(werk, werk);
    const staart = deze.catch(() => undefined);
    rijen.set(abs, staart);
    // Opruimen als er intussen niets achter is aangesloten
    void staart.then(() => {
      if (rijen.get(abs) === staart) rijen.delete(abs);
    });
    return deze;
  };
}

/** Eén letterlijke vervanging in een bestand (lezen, controleren, schrijven) — aanroepen binnen het bestandsslot. */
export async function vervangInBestand(
  abs: string,
  zoek: string,
  vervang: string,
  alles: boolean | undefined,
): Promise<{ ok: true } | { ok: false; reden: "lezen" | "niet-gevonden" | "meerdere"; aantal?: number }> {
  let inhoud: string;
  try {
    inhoud = await readFile(abs, "utf8");
  } catch {
    return { ok: false, reden: "lezen" };
  }
  const aantal = inhoud.split(zoek).length - 1;
  if (aantal === 0) return { ok: false, reden: "niet-gevonden" };
  if (aantal > 1 && !alles) return { ok: false, reden: "meerdere", aantal };
  // Functie als vervanging: anders krijgen $&, $1 en $$ in de nieuwe tekst een speciale betekenis
  await writeFile(abs, alles ? inhoud.split(zoek).join(vervang) : inhoud.replace(zoek, () => vervang));
  return { ok: true };
}

export async function draaiChatAgent(opties: {
  werkmap: string;
  model: string;
  systeem: string;
  opdracht: string;
  budgetUsd: number;
  signal?: AbortSignal;
  opGebeurtenis: (g: AgentGebeurtenis) => void;
  /** Maximum aantal AI-stappen; standaard MAX_BEURTEN. Korte reparatiebeurten
   *  horen hier een lage waarde te krijgen, anders kan zo'n "korte" beurt
   *  minutenlang doorploeteren binnen zijn budget. */
  maxBeurten?: number;
  /** Wandkloklimiet in ms: na afloop van de lopende stap wordt netjes gestopt
   *  (nooit midden in een bestandsbewerking). */
  maxDuurMs?: number;
}): Promise<AgentUitkomst> {
  const { werkmap, opGebeurtenis } = opties;
  const opBestand = maakBestandsSlot();
  const client = new Anthropic();

  const fout = (t: string) => `FOUT: ${t}`;
  const buitenSite = fout(
    "dit pad valt buiten de sitebestanden en is niet toegestaan.",
  );

  /**
   * EIGEN GEREEDSCHAPS-LUS (26-09): de tool-runner van de SDK verloor
   * reproduceerbaar zijn weksignaal tussen twee beurten (lege wachtrij, geen
   * fout, eeuwige stilte; 3 van de 4 naspeelritten op de EVC-kopie). Upstream
   * is de reparatie daarvoor nooit afgemaakt (issue #867/PR #959 gesloten).
   * Daarom draait de lus nu in eigen hand: stream per beurt, gereedschap
   * zelf uitvoeren, resultaten terugsturen. De stiltewachter blijft als
   * vangnet om elke wachtstap heen staan.
   */
  type ToolUitvoer = string | { type: "image"; source: { type: "base64"; media_type: "image/png" | "image/jpeg" | "image/gif" | "image/webp"; data: string } }[];
  type Gereedschap = {
    naam: string;
    omschrijving: string;
    schema: z.ZodTypeAny;
    jsonSchema: Record<string, unknown>;
    run: (invoer: never) => Promise<ToolUitvoer>;
  };
  const tekstSchema = (omschrijving?: string) => ({ type: "string", ...(omschrijving ? { description: omschrijving } : {}) });

  const tools: Gereedschap[] = [
    {
      naam: "lijst_bestanden",
      omschrijving:
        "Geeft alle bestanden van de website (relatief pad per regel). Gebruik dit als je niet zeker weet waar iets staat.",
      schema: z.object({}),
      jsonSchema: { type: "object", properties: {}, additionalProperties: false },
      run: async () => {
        opGebeurtenis({ soort: "tool", naam: "lijst_bestanden", invoer: {} });
        return (await lijstAlleBestanden(werkmap)).join("\n") || "(leeg)";
      },
    },
    {
      naam: "lees_bestand",
      omschrijving:
        "Leest een bestand van de website. Afbeeldingen worden als beeld getoond; tekstbestanden als tekst.",
      schema: z.object({ pad: z.string() }),
      jsonSchema: { type: "object", properties: { pad: tekstSchema("Relatief pad, bijv. index.html") }, required: ["pad"] },
      run: async ({ pad }: { pad: string }) => {
        opGebeurtenis({ soort: "tool", naam: "lees_bestand", invoer: { pad } });
        const abs = await veiligPad(werkmap, pad);
        if (!abs) return buitenSite;
        const ext = path.extname(pad).toLowerCase();
        const mime = AFBEELDING[ext];
        try {
          if (mime) {
            const data = await opBestand(abs, () => readFile(abs));
            if (data.length > 4_500_000)
              return fout("afbeelding te groot om te bekijken.");
            return [
              {
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: mime as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
                  data: data.toString("base64"),
                },
              },
            ];
          }
          if (BINAIR.test(pad)) {
            const info = await stat(abs);
            return `(binair bestand, ${Math.round(info.size / 1024)} kB — inhoud niet leesbaar als tekst)`;
          }
          // Wacht op lopende bewerkingen van dit bestand, zodat je de nieuwste versie leest
          const tekst = await opBestand(abs, () => readFile(abs, "utf8"));
          return tekst.length > MAX_LEES
            ? tekst.slice(0, MAX_LEES) + "\n…(afgekapt)"
            : tekst;
        } catch {
          return fout(`kan ${pad} niet lezen (bestaat het?).`);
        }
      },
    },
    {
      naam: "zoek_tekst",
      omschrijving:
        "Zoekt een letterlijke tekst in alle tekstbestanden van de website; geeft per treffer bestand en regel.",
      schema: z.object({ tekst: z.string().min(2) }),
      jsonSchema: { type: "object", properties: { tekst: tekstSchema("Letterlijke zoektekst") }, required: ["tekst"] },
      run: async ({ tekst }: { tekst: string }) => {
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
    },
    {
      naam: "bewerk_bestand",
      omschrijving:
        "Vervangt in één bestand een letterlijk tekstfragment door nieuwe tekst. `zoek` moet precies één keer voorkomen (tenzij alles=true, dan alle keren). Neem genoeg omliggende tekst mee om het fragment uniek te maken.",
      schema: z.object({ pad: z.string(), zoek: z.string().min(1), vervang: z.string(), alles: z.boolean().optional() }),
      jsonSchema: {
        type: "object",
        properties: { pad: tekstSchema(), zoek: tekstSchema(), vervang: tekstSchema(), alles: { type: "boolean" } },
        required: ["pad", "zoek", "vervang"],
      },
      run: async ({ pad, zoek, vervang, alles }: { pad: string; zoek: string; vervang: string; alles?: boolean }) => {
        opGebeurtenis({
          soort: "tool",
          naam: "bewerk_bestand",
          invoer: { pad, zoek, vervang },
        });
        const abs = await veiligPad(werkmap, pad);
        if (!abs) return buitenSite;
        const uitkomst = await opBestand(abs, () => vervangInBestand(abs, zoek, vervang, alles));
        if (uitkomst.ok) return "Gelukt.";
        if (uitkomst.reden === "lezen") return fout(`kan ${pad} niet lezen.`);
        if (uitkomst.reden === "niet-gevonden")
          return fout(
            "de zoektekst komt niet voor in dit bestand. Lees het bestand en probeer opnieuw met de exacte tekst.",
          );
        return fout(
          `de zoektekst komt ${uitkomst.aantal}× voor. Maak hem uniek met meer omliggende tekst, of zet alles=true om alle voorkomens te vervangen.`,
        );
      },
    },
    {
      naam: "schrijf_bestand",
      omschrijving:
        "Maakt een nieuw bestand aan of overschrijft een bestaand bestand volledig met de gegeven inhoud. Gebruik voor nieuwe pagina's; voor kleine aanpassingen gebruik je bewerk_bestand.",
      schema: z.object({ pad: z.string(), inhoud: z.string() }),
      jsonSchema: { type: "object", properties: { pad: tekstSchema(), inhoud: tekstSchema() }, required: ["pad", "inhoud"] },
      run: async ({ pad, inhoud }: { pad: string; inhoud: string }) => {
        opGebeurtenis({
          soort: "tool",
          naam: "schrijf_bestand",
          invoer: { pad },
        });
        const abs = await veiligPad(werkmap, pad);
        if (!abs) return buitenSite;
        await opBestand(abs, async () => {
          await mkdir(path.dirname(abs), { recursive: true });
          await writeFile(abs, inhoud);
        });
        return "Gelukt.";
      },
    },
  ];

  // Stiltewachter (les EVC 26-09): geen enkele wachtstap mag eeuwig duren.
  const STILTE_MS = 90_000;
  const stilte = Symbol("stilte");
  const noodstop = new AbortController();
  async function metWekker<T>(p: Promise<T>): Promise<T | typeof stilte> {
    let wekker: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        p,
        new Promise<typeof stilte>((res) => {
          wekker = setTimeout(() => res(stilte), STILTE_MS);
        }),
      ]);
    } finally {
      clearTimeout(wekker);
    }
  }
  const kap = AbortSignal.any([
    ...(opties.signal ? [opties.signal] : []),
    noodstop.signal,
    ...(opties.maxDuurMs ? [AbortSignal.timeout(opties.maxDuurMs + 10_000)] : []),
  ]);

  const startMs = Date.now();
  let reply = "";
  let tokensIn = 0;
  let tokensUit = 0;
  let kostenUsd = 0;
  let cacheGelezen = 0;
  let limietBereikt = false;
  let stilteGeraakt = false;
  const [prijsIn, prijsUit] = PRIJZEN[opties.model] ?? [2, 10];

  const apiTools = tools.map((g) => ({
    name: g.naam,
    description: g.omschrijving,
    input_schema: g.jsonSchema as { type: "object"; [k: string]: unknown },
  }));
  const gesprek: Anthropic.Beta.BetaMessageParam[] = [
    { role: "user", content: opties.opdracht },
  ];
  const maxBeurten = Math.min(opties.maxBeurten ?? MAX_BEURTEN, MAX_BEURTEN);

  agentLus: for (let beurt = 0; beurt < maxBeurten; beurt++) {
    const stream = client.beta.messages.stream(
      {
        model: opties.model,
        max_tokens: 16000,
        system: [
          { type: "text", text: opties.systeem, cache_control: { type: "ephemeral" } },
        ],
        tools: apiTools,
        messages: gesprek,
      },
      { signal: kap },
    );

    let beurtTekst = "";
    const inAanbouw = new Map<number, { naam: string; ruw: string; gemeld: boolean }>();
    const events = stream[Symbol.asyncIterator]();
    while (true) {
      const stap = await metWekker(events.next());
      if (stap === stilte) {
        console.error("[chat-agent] stilte midden in een beurt: opgegeven");
        noodstop.abort();
        stilteGeraakt = true;
        limietBereikt = true;
        break agentLus;
      }
      if (stap.done) break;
      const event = stap.value;
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        beurtTekst += event.delta.text;
        opGebeurtenis({ soort: "tekst", delta: event.delta.text });
        continue;
      }
      if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
        inAanbouw.set(event.index, { naam: event.content_block.name, ruw: "", gemeld: false });
        opGebeurtenis({ soort: "toolStart", naam: event.content_block.name });
        continue;
      }
      if (event.type === "content_block_delta" && event.delta.type === "input_json_delta") {
        const blok = inAanbouw.get(event.index);
        if (!blok || blok.gemeld) continue;
        blok.ruw += event.delta.partial_json;
        const pad = blok.ruw.match(/"pad"\s*:\s*"([^"]{1,200})"/)?.[1];
        if (pad) {
          blok.gemeld = true;
          opGebeurtenis({ soort: "toolStart", naam: blok.naam, pad });
        }
      }
    }
    const berichtOfStilte = await metWekker(stream.finalMessage());
    if (berichtOfStilte === stilte) {
      console.error("[chat-agent] stilte bij het afronden van een beurt: opgegeven");
      noodstop.abort();
      stilteGeraakt = true;
      limietBereikt = true;
      break;
    }
    const bericht = berichtOfStilte;

    if (beurtTekst.trim()) reply = beurtTekst.trim();
    const u = bericht.usage;
    const inTok = (u.input_tokens ?? 0) as number;
    const cacheSchrijf = (u.cache_creation_input_tokens ?? 0) as number;
    const cacheLees = (u.cache_read_input_tokens ?? 0) as number;
    const uitTok = (u.output_tokens ?? 0) as number;
    tokensIn += inTok + cacheSchrijf + cacheLees;
    cacheGelezen += cacheLees;
    tokensUit += uitTok;
    kostenUsd +=
      (inTok * prijsIn + cacheSchrijf * prijsIn * 1.25 + cacheLees * prijsIn * 0.1 + uitTok * prijsUit) / 1_000_000;

    if (bericht.stop_reason === "max_tokens") {
      limietBereikt = true;
      break;
    }
    const toolBlokken = bericht.content.filter((b) => b.type === "tool_use");
    if (bericht.stop_reason !== "tool_use" || toolBlokken.length === 0) break;

    // Volgende ronde voorbereiden: gereedschap zelf uitvoeren en de
    // resultaten terugsturen. Gelijktijdig (sneller); het bestandsslot
    // beschermt bewerkingen op hetzelfde bestand.
    gesprek.push({ role: "assistant", content: bericht.content });
    opGebeurtenis({ soort: "denkt" });
    const resultaten = await Promise.all(
      toolBlokken.map(async (blok) => {
        const gereedschap = tools.find((g) => g.naam === blok.name);
        let uitvoer: ToolUitvoer;
        if (!gereedschap) uitvoer = fout(`onbekend gereedschap ${blok.name}.`);
        else {
          const invoer = gereedschap.schema.safeParse(blok.input);
          if (!invoer.success) uitvoer = fout(`ongeldige invoer voor ${blok.name}: ${invoer.error.issues[0]?.message ?? "onbekend"}.`);
          else {
            try {
              uitvoer = await gereedschap.run(invoer.data as never);
            } catch (e) {
              uitvoer = fout(`${blok.name} mislukte: ${e instanceof Error ? e.message : e}`);
            }
          }
        }
        return {
          type: "tool_result" as const,
          tool_use_id: blok.id,
          content: typeof uitvoer === "string" ? uitvoer : uitvoer,
          ...(typeof uitvoer === "string" && uitvoer.startsWith("FOUT:") ? { is_error: true as const } : {}),
        };
      }),
    );
    gesprek.push({ role: "user", content: resultaten });

    if (kostenUsd >= opties.budgetUsd) {
      limietBereikt = true;
      break;
    }
    if (opties.maxDuurMs && Date.now() - startMs >= opties.maxDuurMs) {
      limietBereikt = true;
      break;
    }
    // max_iterations bereikt terwijl het model nog verder wilde
    if (beurt === maxBeurten - 1) limietBereikt = true;
  }

  return { reply, limietBereikt, stilteGeraakt, tokensIn, tokensUit, kostenUsd, cacheGelezen };
}
