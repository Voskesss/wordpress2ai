/**
 * Contactgegevens van WordSwap, zonder enige afhankelijkheid van node.
 *
 * Waarom apart van lib/persoonlijk.ts: dat bestand leest met node:fs de foto
 * van Jos van schijf. Zodra een component die in de browser draait er iets uit
 * importeert, wordt node:fs de browserbundel in getrokken en faalt de hele
 * build. Dat is één keer gebeurd en kostte een build.
 *
 * Alles wat zowel op de server als in de browser nodig is hoort dus hier.
 * lib/persoonlijk.ts geeft het door, zodat bestaande imports blijven werken.
 */

/** Wat de bezoeker leest. */
export const TELEFOON = "026 234 01 22";
/** Wat er in de tel:- en wa.me-links staat. */
export const TELEFOON_LINK = "+31262340122";

/**
 * Avondspreekuur (besloten 14-10-2026): Jos heeft vanaf 1 november overdag een
 * baan en plant gesprekken 's avonds, als ondernemers zelf ook tijd hebben.
 * Met drie avonden per week is "binnen één werkdag" niet waar te maken
 * (woensdag na 20:00 wordt vrijdag), dus beloven we twee werkdagen.
 */
export const SPREEKUUR = {
  dagen: "maandag, woensdag en vrijdag",
  avonden: "maandag-, woensdag- of vrijdagavond",
  tijd: "17:00 tot 20:00",
  kort: "ma, wo en vr 17:00 tot 20:00",
  /** Voor schema.org (OpeningHoursSpecification). */
  schemaDagen: ["Monday", "Wednesday", "Friday"],
  van: "17:00",
  tot: "20:00",
} as const;
export const REACTIETERMIJN = "binnen twee werkdagen";
