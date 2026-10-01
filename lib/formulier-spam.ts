/**
 * Inhoudscontrole op formulierberichten (aanleiding: 30-09, eerste bericht op
 * Van den Berg Mediation was Engelstalige massaspam, de eigenaar kreeg een
 * melding en de spammer onze bevestiging).
 *
 * Honeypot en spamrem vangen bots en volume; dit vangt het bericht dat door
 * een mens of slimme bot los wordt ingetypt. Een klein goedkoop model leest
 * het bericht en geeft een van drie standen:
 *
 * - "zeker": overduidelijke massaspam. Stil bewaard onder het Spam-tabje in
 *   het portaal, geen melding aan de eigenaar, geen bevestiging aan de
 *   afzender. De eigenaar ziet het terug in het dagoverzicht
 *   (lib/spam-dagmail) en kan een vals alarm altijd terugzetten.
 * - "waarschijnlijk": sterke spamkenmerken, maar het zou nog net echt kunnen
 *   zijn. De eigenaar krijgt de gewone melding mét waarschuwing erin; alleen
 *   de afzender krijgt geen bevestiging. In het portaal staat het gewoon bij
 *   Open, met een geel label en de keuze Spam of Geen spam.
 * - geen (null): gewoon bericht, alles zoals altijd.
 *
 * De vaste regels:
 * - Twijfel zakt altijd een stand: een echte aanvraag mag nooit verdwijnen.
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

/** null = geen spam. */
export type SpamStand = "zeker" | "waarschijnlijk" | null;

export type SpamOordeel = {
  stand: SpamStand;
  /** Korte reden in gewone taal, alleen bij een spamstand (voor het portaal). */
  reden: string | null;
  tokensIn: number;
  tokensUit: number;
  kostenUsd: number;
};

export const GEEN_SPAM: SpamOordeel = {
  stand: null,
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
): { stand: SpamStand; reden: string | null } {
  try {
    const json = JSON.parse(tekst.match(/\{[\s\S]*\}/)?.[0] ?? "{}") as {
      spam?: string | boolean;
      reden?: string;
    };
    const stand: SpamStand =
      json.spam === "zeker"
        ? "zeker"
        : json.spam === "waarschijnlijk"
          ? "waarschijnlijk"
          : null;
    if (!stand) return { stand: null, reden: null };
    return {
      stand,
      reden:
        (typeof json.reden === "string" ? json.reden : "").slice(0, 200) ||
        "Herkend als massaspam",
    };
  } catch {
    return { stand: null, reden: null };
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
          'Je beoordeelt berichten die via het contactformulier van een bedrijfswebsite binnenkomen, in drie standen.\n"zeker" = OVERDUIDELIJKE massaspam: aangeboden SEO-, linkbuilding-, webdesign- of marketingdiensten van onbekenden, "restore your site from web archives", werving voor crypto/leningen/gokken, medicijnreclame, berichten die alleen uit links of promotie bestaan, hetzelfde sjabloonbericht dat aan duizenden sites gestuurd kan worden.\n"waarschijnlijk" = sterke spamkenmerken (generiek verkooppraatje, past totaal niet bij dit bedrijf, nep-namen, linkjes), maar het zóu nog net een echt bericht kunnen zijn.\n"geen" = alles wat ook maar enigszins een echte vraag van een klant, leverancier of sollicitant kan zijn. Ook korte, onhandige of anderstalige berichten zijn "geen" als de inhoud over het bedrijf of zijn diensten kan gaan; een andere taal dan die van de site is op zichzelf NOOIT genoeg voor een spamstand.\nBij twijfel kies je altijd de lagere stand (tussen zeker en waarschijnlijk: waarschijnlijk; tussen waarschijnlijk en geen: geen), want een gemiste klantvraag is veel erger dan één doorgelaten spambericht. Antwoord ALLEEN met JSON: {"spam":"geen"} of {"spam":"waarschijnlijk","reden":"..."} of {"spam":"zeker","reden":"..."} met als reden één korte zin in gewoon Nederlands, zonder jargon.',
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
