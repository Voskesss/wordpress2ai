/**
 * Inhoudscontrole op formulierberichten (aanleiding: 30-09, eerste bericht op
 * Van den Berg Mediation was Engelstalige massaspam, de eigenaar kreeg een
 * melding en de spammer onze bevestiging).
 *
 * Honeypot en spamrem vangen bots en volume; dit vangt het bericht dat door
 * een mens of slimme bot los wordt ingetypt. Een klein goedkoop model leest
 * het bericht en zegt alleen bij OVERDUIDELIJKE massaspam "spam". De regels:
 *
 * - Twijfel is geen spam: een echte aanvraag mag nooit stilletjes verdwijnen.
 * - Spam wordt wél bewaard (gemarkeerd, apart terug te vinden in het portaal),
 *   maar er gaat geen melding naar de eigenaar en geen bevestiging naar de
 *   afzender.
 * - De controle draait alleen bij privacystand "normaal": bij "WordSwap kan
 *   niet meelezen" en "niets bewaren" sturen we de inhoud ook niet naar de
 *   AI, want dan zou die belofte niets waard zijn. Zie lib/formulier-privacy.
 * - Elke fout of time-out betekent: geen spam, gewoon doorlaten.
 */

const MODEL = "claude-haiku-4-5-20251001";
const PRIJS_IN = 1; // USD per miljoen tokens
const PRIJS_UIT = 5;
/** Zoveel tekst gaat er hooguit naar het model (spam herken je aan het begin). */
const MAX_TEKENS = 2000;

export type SpamOordeel = {
  spam: boolean;
  /** Korte reden in gewone taal, alleen bij spam (voor het portaal). */
  reden: string | null;
  tokensIn: number;
  tokensUit: number;
  kostenUsd: number;
};

export const GEEN_SPAM: SpamOordeel = {
  spam: false,
  reden: null,
  tokensIn: 0,
  tokensUit: 0,
  kostenUsd: 0,
};

/** De velden als leesbare tekst voor het model, binnen het tekenbudget. */
export function veldenAlsTekst(velden: Record<string, string>): string {
  let uit = "";
  for (const [k, v] of Object.entries(velden)) {
    if (uit.length >= MAX_TEKENS) break;
    uit += `${k}: ${v.slice(0, 600)}\n`;
  }
  return uit.slice(0, MAX_TEKENS);
}

/** Het antwoord van het model lezen; alles wat niet klopt telt als geen spam. */
export function interpreteerSpamAntwoord(
  tekst: string,
): { spam: boolean; reden: string | null } {
  try {
    const json = JSON.parse(tekst.match(/\{[\s\S]*\}/)?.[0] ?? "{}") as {
      spam?: boolean;
      reden?: string;
    };
    if (json.spam !== true) return { spam: false, reden: null };
    return {
      spam: true,
      reden: (typeof json.reden === "string" ? json.reden : "").slice(0, 200) || "Herkend als massaspam",
    };
  } catch {
    return { spam: false, reden: null };
  }
}

export async function beoordeelSpamInhoud(opties: {
  siteNaam: string;
  formulier: string;
  velden: Record<string, string>;
}): Promise<SpamOordeel> {
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();
    const resp = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 150,
        system:
          'Je beoordeelt berichten die via het contactformulier van een bedrijfswebsite binnenkomen. Vraag: is dit bericht OVERDUIDELIJK massaspam of koude massa-acquisitie die niets met dit bedrijf te maken heeft? Voorbeelden die WEL spam zijn: aangeboden SEO-, linkbuilding-, webdesign- of marketingdiensten van onbekenden, "restore your site from web archives", ledenwerving voor crypto/leningen/gokken, medicijnreclame, berichten die alleen uit links of promotie bestaan, hetzelfde sjabloonbericht dat aan duizenden sites gestuurd kan worden. GEEN spam: alles wat ook maar enigszins een echte vraag van een klant, leverancier of sollicitant kan zijn. Ook korte, onhandige of anderstalige berichten zijn GEEN spam als de inhoud over het bedrijf of zijn diensten kan gaan. Een andere taal dan die van de site is op zichzelf NOOIT genoeg. Bij de minste twijfel: geen spam, want een gemiste klantvraag is veel erger dan één doorgelaten spambericht. Antwoord ALLEEN met JSON: {"spam":false} of {"spam":true,"reden":"korte reden in gewoon Nederlands, zonder jargon"}.',
        messages: [
          {
            role: "user",
            content: `Website: ${opties.siteNaam}\nFormulier: ${opties.formulier}\n\nBericht:\n${veldenAlsTekst(opties.velden)}`,
          },
        ],
      },
      // Kort genoeg om de bezoeker niet te laten wachten; te laat = doorlaten
      { signal: AbortSignal.timeout(8000) },
    );
    const tekst = resp.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");
    const tokensIn = resp.usage.input_tokens;
    const tokensUit = resp.usage.output_tokens;
    return {
      ...interpreteerSpamAntwoord(tekst),
      tokensIn,
      tokensUit,
      kostenUsd: (tokensIn * PRIJS_IN + tokensUit * PRIJS_UIT) / 1_000_000,
    };
  } catch (e) {
    console.error("Spamcontrole mislukt (bericht gaat gewoon door):", e);
    return GEEN_SPAM;
  }
}
