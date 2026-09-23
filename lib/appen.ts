/**
 * Appen vanaf de website.
 *
 * Bewust een gewone wa.me-link en geen chatwidget van een externe partij: een
 * link laadt niets bij, kost niets, en er gaat pas iets naar Meta op het moment
 * dat de bezoeker er zelf op klikt. Een widget laadt scripts van een derde en
 * dan zit je meteen in de cookiemelding.
 *
 * Het nummer komt uit lib/contactgegevens.ts. Dat bestand gebruikt bewust geen
 * node, want dit bestand wordt ook in de browser geladen (AppKnop is een
 * client-component). Uit lib/persoonlijk.ts importeren zou node:fs de
 * browserbundel in trekken en de build breken.
 */
import { TELEFOON_LINK } from "@/lib/contactgegevens";

/** wa.me wil het nummer zonder plus en zonder spaties. */
export const APP_NUMMER = TELEFOON_LINK.replace(/[^0-9]/g, "");

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
 * Waar de bezoeker vandaan komt, in gewone woorden.
 *
 * Dit komt als losse regel ONDER de vraag die iemand zelf typt. Zo blijft zijn
 * eigen vraag bovenaan staan (dat is wat Jos moet lezen) en weet Jos er toch
 * bij waar het over gaat, zonder dat hij dat hoeft te vragen.
 */
const HERKOMST: [RegExp, string][] = [
  [/^\/prijzen/, "de prijzenpagina"],
  [/^\/demo/, "de demo"],
  [/^\/nieuwe-website/, "de pagina over een nieuwe website"],
  [/^\/hoe-het-werkt/, "de pagina hoe het werkt"],
  [/^\/webinar/, "de webinarpagina"],
  [/^\/partners/, "de pagina over samenwerken"],
  [/^\/website-hoveniersbedrijf/, "de pagina voor hoveniers"],
  [/^\/website-schildersbedrijf/, "de pagina voor schilders"],
  [/^\/website-installatiebedrijf/, "de pagina voor installateurs"],
  [/^\/website-bouwbedrijf/, "de pagina voor bouwbedrijven"],
  [/^\/website-kapsalon/, "de pagina voor kapsalons"],
  [/^\/wordpress/, "de pagina over WordPress overzetten"],
  [/^\/contact/, "de contactpagina"],
];

export function herkomst(pad: string): string | null {
  return HERKOMST.find(([p]) => p.test(pad))?.[1] ?? null;
}

/**
 * De uiteindelijke tekst die in WhatsApp komt te staan.
 *
 * Getypt de bezoeker niets, dan valt hij terug op het vaste bericht van die
 * pagina: dan werkt de knop nog steeds als een gewone link.
 */
export function appTekst(pad: string, vraag: string): string {
  const eigen = vraag.trim();
  if (!eigen) return appBericht(pad);
  const waar = herkomst(pad);
  return waar ? `${eigen}\n\n(gestuurd vanaf ${waar} op wordswap.nl)` : eigen;
}

/** Link met een zelfgetypte vraag erin. */
export function appLinkMetVraag(pad: string, vraag: string): string {
  return `https://wa.me/${APP_NUMMER}?text=${encodeURIComponent(appTekst(pad, vraag))}`;
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
