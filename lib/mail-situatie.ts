/**
 * Mail bij een overstap: vaste situaties, vaste prijzen, vaste regels.
 * Afgesproken 29-09-2026 na Van den Berg (mail op dezelfde server als de
 * site) en EVC: de mailsituatie hoort bij de EERSTE check bekend te zijn,
 * niet pas als de site klaar is.
 */

export const MAIL_VERHUIZEN_EERSTE = 75;
export const MAIL_VERHUIZEN_EXTRA = 25;

export type MailCode = "geen" | "google" | "microsoft" | "soverin" | "doorsturen" | "hoster";

export function mailSituatie(mx: string[]): { code: MailCode; label: string } {
  const alles = mx.join(" ").toLowerCase();
  if (mx.length === 0) return { code: "geen", label: "Geen mail op dit domein" };
  if (alles.includes("google.com")) return { code: "google", label: "Google Workspace" };
  if (alles.includes("outlook.com")) return { code: "microsoft", label: "Microsoft 365" };
  if (alles.includes("soverin")) return { code: "soverin", label: "Al bij Soverin" };
  if (alles.includes("improvmx") || alles.includes("mx.cloudflare.net") || alles.includes("forwardemail"))
    return { code: "doorsturen", label: "Alleen doorsturen (geen echte mailbox)" };
  return { code: "hoster", label: `Mail bij een hoster (${mx[0]})` };
}

export type MailScenario = {
  situatie: "los" | "bij-hoster" | "doorsturen" | "geen";
  titel: string;
  watJeDoet: string;
  prijs: string;
  /** Mail en website op dezelfde machine: hosting opzeggen = mail kwijt */
  zelfdeServer: boolean;
  waarschuwing: string | null;
};

export function mailScenario(o: { code: MailCode; mailIps: string[]; siteIps: string[] }): MailScenario {
  const zelfdeServer = o.code === "hoster" && o.mailIps.some((ip) => o.siteIps.includes(ip));
  if (o.code === "google" || o.code === "microsoft" || o.code === "soverin") {
    return {
      situatie: "los",
      titel: "Mail staat al los van de website",
      watJeDoet: "Niets verhuizen. Alleen de mailregels één op één overnemen in de DNS.",
      prijs: "Inbegrepen bij de overstap",
      zelfdeServer: false,
      waarschuwing: null,
    };
  }
  if (o.code === "doorsturen") {
    return {
      situatie: "doorsturen",
      titel: "Alleen doorsturen, geen echte postbus",
      watJeDoet: "Doorsturen overnemen (gratis bij de site), of een echte postbus aanbieden.",
      prijs: "Doorsturen gratis · postbus als extra",
      zelfdeServer: false,
      waarschuwing: null,
    };
  }
  if (o.code === "geen") {
    return {
      situatie: "geen",
      titel: "Geen mail op dit domein",
      watJeDoet: "Niets te verhuizen. Eventueel een postbus op het eigen domein aanbieden.",
      prijs: "Postbus als extra",
      zelfdeServer: false,
      waarschuwing: null,
    };
  }
  return {
    situatie: "bij-hoster",
    titel: "Mail staat bij de hoster",
    watJeDoet:
      "Twee routes. A: de mail blijft bij de hoster en wij nemen de mailregels over. B: de mail verhuist naar Soverin (postbus aanmaken, oude mail ophalen, dan pas omzetten).",
    prijs: `Route A inbegrepen · Route B €${MAIL_VERHUIZEN_EERSTE} eenmalig inclusief eerste postbus, €${MAIL_VERHUIZEN_EXTRA} per extra postbus`,
    zelfdeServer,
    waarschuwing: zelfdeServer
      ? "Mail en website staan op dezelfde server. De hosting mag pas worden opgezegd als de mail aantoonbaar elders werkt."
      : null,
  };
}

/** De vijf vaste regels; staan ook op het intake-scherm. */
export const MAIL_REGELS = [
  "De klant licht zijn huidige leverancier zelf in, met de mail hieronder. Pas daarna neem jij contact op.",
  "Aan de oude omgeving verander je niets: niets installeren, niets bijwerken.",
  "De oude hosting wordt pas opgezegd als de mail een week aantoonbaar goed werkt.",
  "Omzetten op een rustig moment, met een testmail heen en terug erna.",
  "Er is altijd een weg terug: de nameservers kunnen worden teruggezet.",
] as const;

/** Mail die de KLANT aan zijn huidige leverancier stuurt (route A). */
export function leverancierMail(o: { domein: string }): { onderwerp: string; tekst: string } {
  return {
    onderwerp: "Mijn website gaat verhuizen, domein en mail blijven bij jullie",
    tekst: `Beste,

Ik ga mijn website onderbrengen bij WordSwap. Jos Klijnhout helpt mij daarbij en kan namens mij contact met jullie opnemen.

Wat ik wil:

- Mijn domeinnaam ${o.domein} blijft bij jullie.
- Mijn mail blijft bij jullie.
- Alleen de website gaat naar WordSwap. WordPress heb ik daarna niet meer nodig.

Wat ik jullie wil vragen:

1. Willen jullie de nameservers van mijn domein omzetten naar de twee die Jos doorgeeft? Zijn websites draaien op Cloudflare, en mijn domein koppelen kan daar alleen via hun nameservers.
2. Willen jullie Jos een overzicht sturen van alle DNS-regels die nu voor mijn domein bestaan? Hij neemt ze één op één over, zodat mijn mail naar jullie server blijft gaan.

We zetten pas om als alles klaarstaat, en op een moment dat jullie past.

Verder heb ik twee vragen:

- Kan mijn mail bij jullie blijven draaien als de hosting van de website vervalt?
- Wat wordt dan mijn nieuwe bedrag?

Voor de technische kant kunnen jullie rechtstreeks contact opnemen met Jos: jos@wordswap.nl of 026 234 01 22.

Met vriendelijke groet,`,
  };
}
