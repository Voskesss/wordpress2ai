/**
 * Herkent een binnenkomende reactie die eigenlijk een afmelding is.
 *
 * De knop onderaan onze mails werkt, maar lang niet iedereen klikt: de meesten
 * antwoorden gewoon "graag verwijderen". Zonder deze herkenning werd zo iemand
 * gepromoveerd tot warme lead, met opvolging en al. Precies de verkeerde kant op.
 *
 * Twee valkuilen die hier bewust afgedekt zijn:
 *
 * 1. Onze eigen mail staat vaak onder het antwoord van de ander. Daar staat de
 *    knoptekst "Val mij niet meer lastig" in. Zou die meetellen, dan gold elke
 *    reactie als afmelding. Onze eigen zinnen gaan er daarom eerst uit.
 * 2. Een aanhaling zonder ">" (Outlook zet er een "Van:"-blok boven) knippen we
 *    alsnog weg, zodat alleen telt wat de ander zelf geschreven heeft.
 */

/** Zinnen uit onze eigen mails die nooit als afmeldverzoek mogen tellen. */
const EIGEN_ZINNEN = [
  "val mij niet meer lastig",
  "een klik en je hoort nooit meer iets van ons",
  "één klik en je hoort nooit meer iets van ons",
];

/** Kopjes waarmee een mailprogramma het vorige bericht aankondigt. */
const AANHAALKOP =
  /^\s*(van:|from:|verzonden:|sent:|-{2,}\s*oorspronkelijk bericht|-{2,}\s*original message|_{5,})/im;

/** Alleen houden wat de afzender zelf getypt heeft. */
export function eigenDeel(tekst: string): string {
  const zonderAanhaling = tekst
    .split("\n")
    .filter((r) => !r.trimStart().startsWith(">"))
    .join("\n")
    .split(AANHAALKOP)[0];
  let schoon = zonderAanhaling.toLowerCase();
  for (const zin of EIGEN_ZINNEN) schoon = schoon.split(zin).join(" ");
  return schoon;
}

/** Bewoordingen waarmee iemand vraagt om met rust gelaten te worden. */
const VERZOEK = [
  /verwijder(\s+mij|\s+me|\s+ons)?\b/,
  /\bverwijderen\b/,
  /haal\s+(me|mij|ons)\s+(van|uit|af)/,
  /\baf\s?melden\b/,
  /\bafmelding\b/,
  /\buitschrijven\b/,
  /\buitschrijf/,
  /geen\s+(mail|mails|e-?mail|e-?mails|post|berichten)\s+meer/,
  /niet\s+meer\s+(mailen|maillen|benaderen|bellen|lastigvallen|lastig\s+vallen|schrijven)/,
  /stop\s+met\s+(mailen|maillen|bellen|benaderen)/,
  /\bunsubscribe\b/,
  /\bopt\s?-?out\b/,
  /remove\s+(me|us)\b/,
  /\bspam\b/,
  // Een beleefd nee. Geen afmelding in de strikte zin, maar wie dit schrijft
  // wil geen mail 2 en 3, en al helemaal geen plek tussen de warme leads.
  /geen\s+interesse/,
  /geen\s+behoefte/,
  /niet\s+ge(ï|i)nteresseerd/,
  /\bniet\s+nodig\b/,
  /\bnee,?\s+(bedankt|dank)/,
  /\bnee\s+dank\s+je/,
];

/**
 * Is deze reactie een verzoek om niet meer gemaild te worden?
 * Bij twijfel: nee. Een gemiste afmelding kost één extra mail, een onterechte
 * blokkade kost een klant die je nooit meer benadert.
 */
export function isAfmelding(onderwerp: string | null, fragment: string | null): boolean {
  const tekst = eigenDeel(`${onderwerp ?? ""}\n${fragment ?? ""}`);
  if (!tekst.trim()) return false;
  return VERZOEK.some((r) => r.test(tekst));
}
