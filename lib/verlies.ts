/**
 * Wat had de oude site dat de nieuwe niet meer heeft?
 *
 * Waarom dit bestaat: de opleveringspoort controleert of de nieuwe site in
 * zichzelf klopt (dode links, favicon, mobiel, beeldgewicht). Maar bijna niets
 * vergelijkt hem met wat er stond. Daardoor kan een onderdeel stil wegvallen
 * zonder dat er ergens een fout ontstaat: er is simpelweg iets minder.
 *
 * Zo verloor evc-professionals zijn zoekfunctie. De oude site had er 388
 * verwijzingen naar, de opgeleverde site geen enkele, en niemand merkte het.
 * Dezelfde val loert bij een herontwerp dat een bestaand blok laat vallen.
 *
 * Dit bestand doet zelf geen I/O: het krijgt de HTML van beide kanten binnen
 * en zegt wat er verdween. Zelfde opzet als lib/galerij.ts en lib/zoeken.ts.
 */

export type Onderdeel = {
  /** Sleutel in de melding. */
  naam: string;
  /** Hoe je het herkent in de oude WordPress-site. */
  oud: RegExp;
  /** Hoe je het herkent in wat wij bouwen. */
  nieuw: RegExp;
  /**
   * Hoeveel treffers in de oude site nodig zijn voordat we het serieus nemen.
   * Eén losse vermelding van "agenda" in een lopende zin is geen agenda.
   */
  drempel: number;
  /** Wat de bouwer moet doen als het weg is. */
  advies: string;
};

export const ONDERDELEN: Onderdeel[] = [
  {
    naam: "zoekfunctie",
    oud: /searchform|type=["']search["']|role=["']search["']|name=["']s["']/gi,
    nieuw: /invoeg:zoeken|delen\/zoeken\.html|type=["']search["']|role=["']search["']|id=["']zoek/gi,
    drempel: 3,
    advies: "zet <!--invoeg:zoeken--> in delen/menu.html",
  },
  {
    naam: "vertaalknop",
    oud: /gtranslate|goog-te-|translate_element|wpml-ls/gi,
    nieuw: /gtranslate|goog-te-|translate_element|hreflang=/gi,
    drempel: 3,
    advies: "die widget is client-side JavaScript en kan gewoon mee",
  },
  {
    naam: "nieuwsbriefaanmelding",
    oud: /mailpoet|mc4wp|mailchimp|es_subscription|newsletter-form/gi,
    nieuw: /nieuwsbrief|aanmeld|mailchimp|mailpoet|newsletter/gi,
    drempel: 3,
    advies: "nog geen bouwsteen: meld het bij de klant en zet het op de lijst",
  },
  {
    naam: "agenda",
    oud: /ai1ec|tribe-events|events-calendar|em-calendar/gi,
    nieuw: /agenda|\.ics|calendar|evenement/gi,
    drempel: 3,
    advies: "vervang door een gedeelde Google Agenda met .ics",
  },
  {
    naam: "webshop",
    oud: /woocommerce|add[-_]to[-_]cart|wc-block/gi,
    nieuw: /winkelwagen|bestel|add[-_]to[-_]cart|webshop|werkaandemuur|bol\.com/gi,
    drempel: 3,
    advies: "verkoop loopt vaak via een externe partij: link die expliciet",
  },
  {
    naam: "ledeninlog",
    oud: /wp-login\.php|mijn-account|my-account|login-form/gi,
    nieuw: /wordswap|inloggen|login|mijn-account/gi,
    drempel: 3,
    advies: "vraag de klant waar het ledengedeelte naartoe moet",
  },
  {
    naam: "reacties",
    oud: /comment-form|commentlist|id=["']respond["']|comment-respond/gi,
    nieuw: /reactie|comment/gi,
    drempel: 3,
    advies: "reacties zijn nog geen bouwsteen: meld het bij de klant",
  },
];

/** Hoe vaak komt dit onderdeel voor in deze verzameling pagina's? */
function tel(htmls: string[], patroon: RegExp): number {
  let n = 0;
  for (const html of htmls) n += (html.match(patroon) ?? []).length;
  return n;
}

export type Verlies = {
  naam: string;
  oudAantal: number;
  advies: string;
};

/**
 * Onderdelen die de oude site duidelijk had en de nieuwe nergens meer heeft.
 * Bewust streng aan de nieuwe kant: één treffer telt al als "aanwezig", want
 * een vals alarm kost meer vertrouwen dan een gemist geval.
 */
export function vergelijkOnderdelen(oudeHtml: string[], nieuweHtml: string[]): Verlies[] {
  if (!oudeHtml.length) return [];
  const uit: Verlies[] = [];
  for (const o of ONDERDELEN) {
    const oud = tel(oudeHtml, o.oud);
    if (oud < o.drempel) continue;
    if (tel(nieuweHtml, o.nieuw) > 0) continue;
    uit.push({ naam: o.naam, oudAantal: oud, advies: o.advies });
  }
  return uit;
}
