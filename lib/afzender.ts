/**
 * Van welk adres gaat deze mail de deur uit?
 *
 * Twee stromen, bewust gescheiden:
 *
 * - KLANTPOST (afspraakbevestigingen, portaaluitnodigingen, facturen,
 *   webinar-reeks) gaat vanaf wordswap.nl. Dat zijn mensen die ons kennen en
 *   die op deze mail rékenen.
 * - KOUDE OUTREACH gaat vanaf een eigen subdomein, standaard post.wordswap.nl.
 *
 * Waarom dat scheiden moet: koude post wordt onvermijdelijk door een deel van
 * de ontvangers als ongewenst weggeklikt. Dat zakt in de reputatie van het
 * verzendende domein. Delen beide stromen één domein, dan belandt de
 * bevestigingsmail van een betalende klant in de spam omdat een onbekende
 * hovenier onze koude mail heeft weggeklikt. Dat is de dure fout, en hij
 * sluipt er langzaam in: je ziet het pas als klanten gaan bellen dat ze niets
 * ontvangen.
 *
 * Het antwoordadres blijft altijd info@wordswap.nl. Niet alleen prettiger,
 * ook nodig: de Soverin-meekijker leest die postbus, en daarop draait de
 * promotie van prospect naar lead (lib/prospect-promotie.ts).
 */

const STANDAARD = "WordSwap <onboarding@resend.dev>";

/** Adres voor post aan mensen die ons kennen. */
export function klantAfzender(): string {
  return process.env.RESEND_FROM ?? STANDAARD;
}

/**
 * Adres voor koude outreach. Valt terug op het klantadres zolang
 * OUTREACH_FROM niet is ingesteld, zodat de outreach blijft werken terwijl
 * het nieuwe domein nog niet geverifieerd is. Dat is een bewuste terugval,
 * geen vergissing: liever tijdelijk één domein dan een outreach die stilvalt.
 */
export function outreachAfzender(): string {
  return process.env.OUTREACH_FROM ?? klantAfzender();
}

/** Draait de outreach al op een eigen domein, of nog op het klantdomein? */
export function outreachOpEigenDomein(): boolean {
  return Boolean(process.env.OUTREACH_FROM);
}

/** "Jos van WordSwap <jos@post.wordswap.nl>" -> "jos@post.wordswap.nl" */
export function alleenAdres(van: string): string {
  return van.match(/<([^>]+)>/)?.[1] ?? van;
}

/** Waar antwoorden heen moeten: altijd de postbus die we echt lezen. */
export const ANTWOORD_NAAR = "info@wordswap.nl";
