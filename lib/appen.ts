/**
 * Appen vanaf de website.
 *
 * Bewust een gewone wa.me-link en geen chatwidget van een externe partij: een
 * link laadt niets bij, kost niets, en er gaat pas iets naar Meta op het moment
 * dat de bezoeker er zelf op klikt. Een widget laadt scripts van een derde en
 * dan zit je meteen in de cookiemelding.
 *
 * Het nummer staat hier apart en NIET als import uit lib/persoonlijk.ts. Dat
 * bestand leest de foto van Jos van schijf met node:fs, en dit bestand wordt
 * ook in de browser geladen (AppKnop is een client-component). Een import zou
 * node:fs de browserbundel in trekken en dan faalt de hele build.
 *
 * Dat het toch gelijk blijft aan TELEFOON_LINK bewaakt tests/appen.mts, die
 * allebei inleest en vergelijkt.
 */

/** wa.me wil het nummer zonder plus en zonder spaties. */
export const APP_NUMMER = "31262340122";

/**
 * Wat er alvast in het invoerveld van WhatsApp staat als iemand klikt.
 *
 * Dit is het hele punt van deze knop: Jos ziet in de eerste regel al waar
 * iemand vandaan komt en waar hij over twijfelt, zonder dat hij dat hoeft te
 * vragen. Iemand op de prijzenpagina heeft een andere vraag dan iemand die net
 * de demo heeft geprobeerd.
 *
 * De tekst is in de ik-vorm, want de bezoeker verstuurt hem.
 */
const BERICHTEN: [RegExp, string][] = [
  [/^\/prijzen/, "Hoi Jos, ik kijk naar de prijzen en heb daar een vraag over."],
  [/^\/demo/, "Hoi Jos, ik heb net de demo geprobeerd en heb een vraag."],
  [/^\/nieuwe-website/, "Hoi Jos, ik denk aan een nieuwe website en heb een vraag."],
  [/^\/hoe-het-werkt/, "Hoi Jos, ik heb gelezen hoe het werkt en heb nog een vraag."],
  [/^\/webinar/, "Hoi Jos, ik heb een vraag over het webinar."],
  [/^\/partners/, "Hoi Jos, ik heb een vraag over samenwerken."],
  [/^\/website-hoveniersbedrijf/, "Hoi Jos, ik heb een hoveniersbedrijf en een vraag over mijn website."],
  [/^\/website-schildersbedrijf/, "Hoi Jos, ik heb een schildersbedrijf en een vraag over mijn website."],
  [/^\/website-installatiebedrijf/, "Hoi Jos, ik heb een installatiebedrijf en een vraag over mijn website."],
  [/^\/website-bouwbedrijf/, "Hoi Jos, ik heb een bouwbedrijf en een vraag over mijn website."],
  [/^\/website-kapsalon/, "Hoi Jos, ik heb een kapsalon en een vraag over mijn website."],
  [/^\/wordpress/, "Hoi Jos, ik heb een WordPress-site en een vraag over overstappen."],
];

const STANDAARD = "Hoi Jos, ik heb een vraag over WordSwap.";

export function appBericht(pad: string): string {
  return BERICHTEN.find(([p]) => p.test(pad))?.[1] ?? STANDAARD;
}

/** Volledige link, met het bericht al ingevuld. */
export function appLink(pad = "/"): string {
  return `https://wa.me/${APP_NUMMER}?text=${encodeURIComponent(appBericht(pad))}`;
}

/**
 * Waar de zwevende knop NIET hoort.
 *
 * Portaal en admin hebben hun eigen chat en hun eigen knoppen; daar zou hij
 * alleen in de weg zitten. Op de demo staat de chat zelf rechtsonder, en die
 * mag niets overlappen: dat is precies de fout die we op mobiel al een keer
 * hebben moeten terugdraaien.
 */
export function toonZwevendeKnop(pad: string): boolean {
  return !/^\/(portal|admin|demo|afspraak)/.test(pad);
}
