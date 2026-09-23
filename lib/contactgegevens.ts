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
