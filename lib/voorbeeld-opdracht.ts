/** Voorbeeldopdracht voor de chat-hint, geplukt uit de ECHTE pagina van de
 * klant (wens Jos 28-09): "zet de openingstijden op zaterdag tot 17:00" als
 * vast voorbeeld sloeg nergens op bij een site zonder openingstijden. Nu
 * kijken we wat er werkelijk staat en stellen we dáár een opdracht bij voor.
 * Puur tekstwerk op de HTML (geen DOM), zodat het ook in de tests draait;
 * levert dit niets bruikbaars op, dan valt de hint terug op de vaste zin. */

const VASTE_VOORBEELD = 'zet de openingstijden op zaterdag tot 17:00';

/** Tekst van een element zonder tags, netjes ingekort. */
function schoon(t: string): string {
  return t
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Kort en zonder rare tekens: bruikbaar als aanhaling in een voorbeeldzin. */
function bruikbaar(t: string, maxWoorden: number): string | null {
  const s = schoon(t);
  if (!s || s.length < 3 || s.length > 60) return null;
  if (/[<>{}|]/.test(s)) return null;
  if (s.split(" ").length > maxWoorden) return null;
  return s;
}

export function voorbeeldOpdracht(html: string): string {
  // 1. Staan er echt openingstijden op? Dan is het klassieke voorbeeld raak.
  if (/openingstijd|geopend\b|ma\s*[-–t]\s*\w*\s*vr|maandag/i.test(schoon(html)))
    return VASTE_VOORBEELD;

  // 2. Een echte prijs: "verander € 62,50 in ..." voelt meteen als de eigen site
  const prijs = html.match(/€\s?\d{1,4}(?:[.,]\d{2}|,-)?/)?.[0]?.replace(/\s+/g, " ").trim();
  if (prijs) return `pas de prijs van ${prijs} aan`;

  // 3. Een echte knop (korte linktekst met knop-uiterlijk of button)
  for (const m of html.matchAll(/<(?:button|a)\b[^>]*>([\s\S]{0,120}?)<\/(?:button|a)>/gi)) {
    const t = bruikbaar(m[1], 4);
    if (t && !/^(menu|home|lees meer|meer|ok|sluiten|×|✕)$/i.test(t))
      return `maak de knop "${t}" opvallender`;
  }

  // 4. Een echte kop
  for (const m of html.matchAll(/<h[12]\b[^>]*>([\s\S]{0,160}?)<\/h[12]>/gi)) {
    const t = bruikbaar(m[1], 7);
    if (t) return `maak de tekst onder "${t}" wat korter`;
  }

  return VASTE_VOORBEELD;
}
