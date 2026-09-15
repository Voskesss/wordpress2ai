import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { alleHtmlBestanden } from "@/lib/werkmap";

/** SNELPAD: een pure, letterlijke tekstwissel ("verander X in Y") hoeft niet
 * langs de grote AI-agent — een goedkope classificatie plus een letterlijke
 * vervanging is in seconden klaar in plaats van minuten. Bij de minste twijfel
 * geven we null terug en neemt de gewone agent het over. */

const HAIKU = "claude-haiku-4-5-20251001";
const PRIJS_IN = 1; // USD per miljoen tokens
const PRIJS_UIT = 5;

export type Tekstwissel = {
  oud: string;
  nieuw: string;
  kostenUsd: number;
  tokensIn: number;
  tokensUit: number;
};

/** Herkent of een bericht uitsluitend één letterlijke tekstvervanging vraagt
 * waarbij oude én nieuwe tekst letterlijk in het bericht staan. */
export async function classificeerTekstwissel(
  bericht: string,
  signal?: AbortSignal,
): Promise<Tekstwissel | null> {
  if (bericht.length > 500) return null;
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();
    const resp = await client.messages.create(
      {
        model: HAIKU,
        max_tokens: 200,
        system:
          'Je beoordeelt berichten van website-eigenaren aan hun website-AI. Vraag: is dit bericht UITSLUITEND één letterlijke tekstvervanging, waarbij zowel de oude als de nieuwe tekst LETTERLIJK in het bericht staan? Voorbeelden die WEL kwalificeren: "verander \'geopend tot 17:00\' in \'geopend tot 18:00\'", "maak van Welkom bij Jansen: Welkom bij Bakkerij Jansen". NIET kwalificeren: meerdere wijzigingen, iets met kleuren/foto\'s/opmaak/pagina\'s/menu, herformuleren of verbeteren zonder letterlijke nieuwe tekst, vragen, antwoorden als "ja"/"nee", of als je de oude of nieuwe tekst zelf zou moeten verzinnen. Antwoord ALLEEN met JSON: {"simpel":false} of {"simpel":true,"oud":"...","nieuw":"..."} met oud/nieuw exact zoals de eigenaar ze bedoelt (zonder aanhalingstekens eromheen). Bij twijfel altijd {"simpel":false}.',
        messages: [{ role: "user", content: bericht }],
      },
      { signal },
    );
    const tekst = resp.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");
    const json = JSON.parse(tekst.match(/\{[\s\S]*\}/)?.[0] ?? "{}") as {
      simpel?: boolean;
      oud?: string;
      nieuw?: string;
    };
    const tokensIn = resp.usage.input_tokens;
    const tokensUit = resp.usage.output_tokens;
    const kostenUsd = (tokensIn * PRIJS_IN + tokensUit * PRIJS_UIT) / 1_000_000;
    if (
      !json.simpel ||
      typeof json.oud !== "string" ||
      typeof json.nieuw !== "string"
    )
      return null;
    const oud = json.oud.trim();
    const nieuw = json.nieuw.trim();
    // Te kort is te riskant (raakt snel iets anders); gelijk is geen wijziging.
    if (oud.length < 3 || !nieuw || oud === nieuw) return null;
    return { oud, nieuw, kostenUsd, tokensIn, tokensUit };
  } catch {
    return null; // classificatie is een optimalisatie — bij falen gewoon de agent
  }
}

/** Voert de wissel uit als de oude tekst op precies één plek voorkomt.
 * Zelfde tolerantie als de aanwijs-route: witruimte mag afwijken. */
export async function pasTekstwisselToe(
  werkmap: string,
  oud: string,
  nieuw: string,
): Promise<{ pad: string } | null> {
  const patroon = new RegExp(
    oud.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"),
    "g",
  );
  const treffers: { pad: string; inhoud: string; aantal: number }[] = [];
  for (const pad of await alleHtmlBestanden(werkmap)) {
    const inhoud = await readFile(path.join(werkmap, pad), "utf8");
    const aantal = (inhoud.match(patroon) ?? []).length;
    if (aantal > 0) treffers.push({ pad, inhoud, aantal });
  }
  // Precies één vindplaats: anders is er een keuze te maken (of consistentie
  // te bewaken) en is de agent de juiste weg.
  const totaal = treffers.reduce((som, t) => som + t.aantal, 0);
  if (totaal !== 1) return null;
  const t = treffers[0];
  await writeFile(path.join(werkmap, t.pad), t.inhoud.replace(patroon, nieuw));
  return { pad: t.pad };
}
