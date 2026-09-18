import { createHmac } from "node:crypto";

/**
 * Rem op het formulier-adres (app/api/formulier).
 *
 * Dat adres staat open voor iedereen — dat moet ook, want elke bezoeker van
 * elke klantsite gebruikt het. Maar het verstuurt ook mail: een bevestiging
 * aan de invuller en een melding aan de eigenaar. Zonder rem kan iemand er
 * dus mail mee versturen vanaf ons adres, naar wie hij wil.
 *
 * De oude rem telde alleen per sitecode, en die code kiest de verzender zélf
 * in een verborgen veld — één ander woord en de teller begon opnieuw. Daarom
 * tellen we nu ook per afzender (IP) en over alles samen, en mailen we alleen
 * voor sites die we echt kennen.
 *
 * Deze functie doet geen database en geen netwerk: alleen de tellingen erin,
 * een oordeel eruit. Zo is hij te testen zonder omgeving.
 */

/** Per sitecode per uur (zoals het altijd al was). */
export const PER_SITE_UUR = 30;
/** Per afzender per uur, over alle sites heen. */
export const PER_IP_UUR = 10;
/** Noodrem over alles samen, voor het geval iemand met veel adressen werkt. */
export const TOTAAL_UUR = 300;

export type RemTelling = {
  /** Staat deze sitecode echt in onze database? */
  siteBestaat: boolean;
  /** Inzendingen voor deze sitecode in het afgelopen uur. */
  perSite: number;
  /** Inzendingen van deze afzender in het afgelopen uur; null = onbekend. */
  perIp: number | null;
  /** Inzendingen over alle sites in het afgelopen uur. */
  totaal: number;
};

export type RemReden =
  "ok" | "site-onbekend" | "te-veel-site" | "te-veel-ip" | "te-veel-totaal";

export type RemOordeel = {
  /** Mag de inzending bewaard worden? */
  opslaan: boolean;
  /** Mag er mail over de deur uit? */
  mailen: boolean;
  reden: RemReden;
};

/**
 * Een onbekende sitecode betekent NIET weggooien: dat zou een echte aanvraag
 * kosten als een repo ooit hernoemd is. We bewaren hem wel en mailen niet —
 * dan is de lead veilig en kan niemand ons als postkantoor gebruiken.
 */
export function beoordeel(t: RemTelling): RemOordeel {
  if (t.perSite >= PER_SITE_UUR)
    return { opslaan: false, mailen: false, reden: "te-veel-site" };
  if (t.perIp !== null && t.perIp >= PER_IP_UUR)
    return { opslaan: false, mailen: false, reden: "te-veel-ip" };
  if (t.totaal >= TOTAAL_UUR)
    return { opslaan: false, mailen: false, reden: "te-veel-totaal" };
  return t.siteBestaat
    ? { opslaan: true, mailen: true, reden: "ok" }
    : { opslaan: true, mailen: false, reden: "site-onbekend" };
}

/** Het adres van de bezoeker zoals Vercel het doorgeeft. */
export function ipUitKoppen(koppen: Headers): string | null {
  const door = koppen.get("x-forwarded-for") ?? "";
  const eerste = door.split(",")[0]?.trim();
  return eerste || koppen.get("x-real-ip")?.trim() || null;
}

/**
 * Het adres wordt nooit leesbaar bewaard: we slaan alleen een afdruk op, die
 * genoeg is om te tellen maar niet om iemand mee te herleiden. Zonder sleutel
 * geen afdruk — dan telt alleen de rem per site, en blijft het formulier het
 * gewoon doen. Een vergeten instelling mag nooit aanvragen kosten.
 */
export function ipAfdruk(ip: string | null): string | null {
  const sleutel = process.env.FORMULIER_IP_SALT;
  if (!ip || !sleutel) return null;
  return createHmac("sha256", sleutel)
    .update(`formulier-ip-v1:${ip}`)
    .digest("base64url")
    .slice(0, 32);
}

/** Hoeveel velden en tekens er hooguit in een mail worden herhaald. */
export const MAX_VELDEN_IN_MAIL = 15;
export const MAX_TEKENS_IN_MAIL = 500;

/**
 * Wat de invuller typt komt in de bevestigingsmail terug ("dit heb je
 * ingevuld"). Handig, maar ook precies wat misbruik aantrekkelijk maakt: een
 * onbeperkt lange tekst in een mail van ons. Daarom kort in de mail; in het
 * portaal staat altijd alles.
 */
export function veldenVoorMail(velden: Record<string, string>): {
  velden: [string, string][];
  afgekapt: boolean;
} {
  const alles = Object.entries(velden);
  const zichtbaar = alles.slice(0, MAX_VELDEN_IN_MAIL);
  let afgekapt = alles.length > zichtbaar.length;
  const uit = zichtbaar.map(([k, v]) => {
    if (v.length <= MAX_TEKENS_IN_MAIL) return [k, v] as [string, string];
    afgekapt = true;
    return [k, `${v.slice(0, MAX_TEKENS_IN_MAIL)}…`] as [string, string];
  });
  return { velden: uit, afgekapt };
}
