/** Browser-safe scan result and pricing. No server SDK imports. */
export type ScanResultaat = {
  domein: string;
  bereikbaar: boolean;
  isWordpress: boolean;
  /** Herkend systeem als het geen WordPress is (Wix, Squarespace, ...) */
  platform?: string;
  /** Concreet kapotte dingen: dode links, kapotte afbeeldingen, mixed content */
  kapot: string[];
  /** Serieus bedrijf? (KvK/telefoon/adres/privacy op de site gevonden) */
  serieus: boolean;
  serieusSignalen: string[];
  /** Aantal pagina's volgens de sitemap (0 = geen sitemap gevonden) */
  paginas: number;
  laadMs: number;
  score: number;
  stempel: string;
  bevindingen: string[];
  observatie: string;
  /** Automatisch van de site geplukt, als vulling voor het prospect-formulier */
  bedrijf?: string;
  email?: string;
};

/**
 * Richtprijs voor de overstap op basis van de sitegrootte.
 *
 * Tel SOORTEN pagina's, niet losse pagina's: twintig fotogalerijen of
 * blogberichten met hetzelfde sjabloon zijn één keer werk, geen twintig keer.
 * Het aantal foto's telt niet mee in de prijs — die gaan geautomatiseerd mee.
 * Een site met veel herhaling hoort dus een trede lager dan zijn paginateller.
 */
export function richtprijs(paginas: number): string | null {
  if (!paginas) return null;
  if (paginas <= 8) return "€150";
  if (paginas <= 20) return "€400";
  return "€650";
}
