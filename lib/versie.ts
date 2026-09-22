/**
 * De versie van WordSwap zelf.
 *
 * Waarom dit bestaat: klantsites worden over maanden heen gebouwd met een
 * bouwmotor die blijft veranderen. Doet een site later raar, dan wil je kunnen
 * zien met welke stand hij gemaakt is. Daarom krijgt elke klantrepo een
 * `wordswap.json` met deze versie erin.
 *
 * Bijwerken: hier én in package.json, en een blok erbij in CHANGELOG.md.
 * Daarna een tag: `git tag -a v<versie> -m "..." && git push origin v<versie>`.
 */
export const VERSIE = "1.29.2";

/** Wat er in de klantrepo terechtkomt als `wordswap.json`. */
export function siteStempel(velden: {
  siteNaam: string;
  bron?: string | null;
  gebouwdOp: Date;
}): string {
  return `${JSON.stringify(
    {
      wordswap: VERSIE,
      site: velden.siteNaam,
      bron: velden.bron ?? null,
      gebouwdOp: velden.gebouwdOp.toISOString(),
      uitleg:
        "Deze website wordt beheerd door WordSwap. Dit bestand zegt met welke versie hij gebouwd is; handig bij vragen of onderhoud.",
    },
    null,
    2
  )}\n`;
}
