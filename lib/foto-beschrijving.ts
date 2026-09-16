import sharp from "sharp";

/** Foto's vooraf beschrijven in plaats van ze door de site-AI één voor één te
 * laten openen. Bij een galerij van twintig foto's scheelt dat het verschil
 * tussen twintig trage leesrondes (elke ronde gaat het hele gesprek opnieuw
 * mee) en één parallelle ronde met een klein, snel model. De site-AI krijgt
 * daarna gewoon tekst en hoeft de beelden niet meer te openen. */

const MODEL = "claude-haiku-4-5-20251001";
const PRIJS_IN = 1; // USD per miljoen tokens
const PRIJS_UIT = 5;
const TEGELIJK = 8;

export type FotoBeschrijving = { naam: string; beschrijving: string };

export async function beschrijfFotos(
  fotos: { naam: string; data: Buffer }[],
  signal?: AbortSignal,
): Promise<{ beschrijvingen: FotoBeschrijving[]; kostenUsd: number }> {
  if (!fotos.length) return { beschrijvingen: [], kostenUsd: 0 };
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic();
  let kostenUsd = 0;

  const beschrijfEen = async (foto: {
    naam: string;
    data: Buffer;
  }): Promise<FotoBeschrijving> => {
    try {
      // Klein maken: beschrijven kan prima op 512px en scheelt ~5× tokens.
      const klein = await sharp(foto.data)
        .resize({ width: 512, withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();
      const resp = await client.messages.create(
        {
          model: MODEL,
          max_tokens: 150,
          system:
            "Je beschrijft foto's voor een website. Antwoord met één korte Nederlandse zin (maximaal 15 woorden) die feitelijk zegt wat er te zien is — geschikt als alt-tekst. Geen inleiding, geen aanhalingstekens, niets verzinnen.",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/jpeg",
                    data: klein.toString("base64"),
                  },
                },
              ],
            },
          ],
        },
        { signal },
      );
      kostenUsd +=
        (resp.usage.input_tokens * PRIJS_IN +
          resp.usage.output_tokens * PRIJS_UIT) /
        1_000_000;
      const tekst = resp.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { text: string }).text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      return { naam: foto.naam, beschrijving: tekst || "(niet te beschrijven)" };
    } catch {
      // Beschrijven is een versneller, nooit een blokkade: bij een fout mag de
      // site-AI de foto desnoods zelf openen.
      return { naam: foto.naam, beschrijving: "(nog niet bekeken)" };
    }
  };

  const beschrijvingen: FotoBeschrijving[] = [];
  for (let i = 0; i < fotos.length; i += TEGELIJK) {
    beschrijvingen.push(
      ...(await Promise.all(fotos.slice(i, i + TEGELIJK).map(beschrijfEen))),
    );
  }
  return { beschrijvingen, kostenUsd };
}
