/**
 * Wat had de vorige versie dat deze niet meer heeft?
 *
 * Waarom dit bestaat: de opleveringspoort controleert of de nieuwe site in
 * zichzelf klopt (dode links, favicon, mobiel, beeldgewicht). Maar bijna niets
 * vergelijkt hem met wat er stond. Daardoor kan een onderdeel stil wegvallen
 * zonder dat er ergens een fout ontstaat: er is simpelweg iets minder.
 *
 * Zo verloor evc-professionals zijn zoekfunctie. De oude site had er honderden
 * verwijzingen naar, de opgeleverde site geen enkele, en niemand merkte het.
 *
 * De "vorige versie" is meestal een WordPress-site, maar kan ook een eerdere
 * versie van onszelf zijn: bij een herontwerp dat een blok laat vallen. Daarom
 * herkent elk onderdeel beide woordenschatten.
 *
 * Dit bestand doet zelf geen I/O: het krijgt de HTML van beide kanten binnen
 * en zegt wat er verdween. Zelfde opzet als lib/galerij.ts en lib/zoeken.ts.
 */

export type Onderdeel = {
  /** Sleutel in de melding. */
  naam: string;
  /**
   * Onmiskenbare sporen: één treffer is genoeg. Plugin-namen en onze eigen
   * merktekens. Dat laatste is nodig omdat `<!--invoeg:zoeken-->` precies één
   * keer in een repo staat, in delen/menu.html.
   */
  sterk: RegExp;
  /** Zwakkere aanwijzingen: pas geloofwaardig vanaf `drempel` treffers. */
  zwak?: RegExp;
  /** Hoeveel zwakke treffers nodig zijn. */
  drempel: number;
  /** Hoe je het herkent in wat wij bouwen. Ruim, want vals alarm is duurder. */
  nieuw: RegExp;
  /** Wat de bouwer moet doen als het weg is. */
  advies: string;
};

export const ONDERDELEN: Onderdeel[] = [
  {
    naam: "zoekfunctie",
    sterk: /searchform|type=["']search["']|role=["']search["']|invoeg:zoeken|delen\/zoeken\.html/gi,
    zwak: /name=["']s["']/gi,
    drempel: 3,
    nieuw: /invoeg:zoeken|delen\/zoeken\.html|type=["']search["']|role=["']search["']|id=["']zoek/gi,
    advies: "zet <!--invoeg:zoeken--> in delen/menu.html",
  },
  {
    naam: "vertaalknop",
    sterk: /gtranslate|goog-te-|translate_element|wpml-ls|invoeg:taal/gi,
    drempel: 3,
    nieuw: /gtranslate|goog-te-|translate_element|hreflang=|invoeg:taal/gi,
    advies: "die widget is client-side JavaScript en kan gewoon mee",
  },
  {
    naam: "nieuwsbriefaanmelding",
    sterk: /mailpoet|mc4wp|mailchimp|es_subscription|newsletter-form|invoeg:nieuwsbrief/gi,
    drempel: 3,
    nieuw: /nieuwsbrief|aanmeld|mailchimp|mailpoet|newsletter|invoeg:nieuwsbrief/gi,
    advies: "nog geen bouwsteen: meld het bij de klant en zet het op de lijst",
  },
  {
    naam: "agenda",
    sterk: /ai1ec|tribe-events|events-calendar|em-calendar|invoeg:agenda|\.ics\b/gi,
    drempel: 3,
    nieuw: /agenda|\.ics|calendar|evenement|invoeg:agenda/gi,
    advies: "vervang door een gedeelde Google Agenda met .ics",
  },
  {
    naam: "webshop",
    sterk: /woocommerce|add[-_]to[-_]cart|wc-block|werkaandemuur/gi,
    drempel: 3,
    nieuw: /winkelwagen|bestel|add[-_]to[-_]cart|webshop|werkaandemuur|bol\.com/gi,
    advies: "verkoop loopt vaak via een externe partij: link die expliciet",
  },
  {
    naam: "ledeninlog",
    sterk: /wp-login\.php|login-form|invoeg:inloggen/gi,
    zwak: /mijn-account|my-account/gi,
    drempel: 3,
    nieuw: /wordswap|inloggen|login|mijn-account|invoeg:inloggen/gi,
    advies: "vraag de klant waar het ledengedeelte naartoe moet",
  },
  {
    naam: "reacties",
    sterk: /comment-form|commentlist|id=["']respond["']|comment-respond|invoeg:reacties/gi,
    drempel: 3,
    nieuw: /reactie|comment|invoeg:reacties/gi,
    advies: "reacties zijn nog geen bouwsteen: meld het bij de klant",
  },
];

/** Hoe vaak komt dit patroon voor in deze verzameling pagina's? */
function tel(htmls: string[], patroon?: RegExp): number {
  if (!patroon) return 0;
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
 * Onderdelen die de vorige versie duidelijk had en deze nergens meer heeft.
 * Bewust streng aan de nieuwe kant: één treffer telt al als "aanwezig", want
 * een vals alarm kost meer vertrouwen dan een gemist geval.
 */
export function vergelijkOnderdelen(oudeHtml: string[], nieuweHtml: string[]): Verlies[] {
  if (!oudeHtml.length) return [];
  const uit: Verlies[] = [];
  for (const o of ONDERDELEN) {
    const sterk = tel(oudeHtml, o.sterk);
    const zwak = tel(oudeHtml, o.zwak);
    if (sterk === 0 && zwak < o.drempel) continue;
    if (tel(nieuweHtml, o.nieuw) > 0) continue;
    uit.push({ naam: o.naam, oudAantal: sterk + zwak, advies: o.advies });
  }
  return uit;
}
