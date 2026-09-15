import sharp from "sharp";

/** Meetbare fotokwaliteit: afmetingen + een scherpte-score (variantie van de
 * Laplaciaan, gemeten op max 500px grijswaarden). IJking op echte klantfoto's
 * (15-09-2026): scherpe foto's scoren 200+, wazig gemaakte versies < 60.
 * Donkere/vlakke beelden scoren ook laag — daarom is een lage score een
 * SIGNAAL voor de AI om zelf te kijken, geen automatisch oordeel. */
export type FotoKwaliteit = { breedte: number; hoogte: number; scherpte: number };

export async function meetFotoKwaliteit(buf: Buffer): Promise<FotoKwaliteit | null> {
  try {
    const meta = await sharp(buf).metadata();
    const { data } = await sharp(buf)
      .greyscale()
      .resize({ width: 500, withoutEnlargement: true })
      .convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0] })
      .raw()
      .toBuffer({ resolveWithObject: true });
    let som = 0;
    let som2 = 0;
    for (const v of data) {
      som += v;
      som2 += v * v;
    }
    const n = data.length;
    return {
      breedte: meta.width ?? 0,
      hoogte: meta.height ?? 0,
      scherpte: Math.round(som2 / n - (som / n) ** 2),
    };
  } catch {
    return null; // kwaliteitsmeting is een hulpmiddel, nooit een blokkade
  }
}

/** Korte waarschuwingstekst voor in de AI-context, of null als er niets
 * opvalt. Bewust voorzichtig geformuleerd: de AI kijkt zelf ter bevestiging. */
export function kwaliteitsWaarschuwing(k: FotoKwaliteit | null): string | null {
  if (!k) return null;
  const punten: string[] = [];
  if (k.breedte > 0 && k.breedte < 700)
    punten.push(`klein origineel (${k.breedte}×${k.hoogte}px — te weinig voor een grote plek)`);
  if (k.scherpte < 60)
    punten.push(`lage scherpte-score (${k.scherpte}; mogelijk wazig, donker of vlak)`);
  return punten.length ? punten.join("; ") : null;
}
