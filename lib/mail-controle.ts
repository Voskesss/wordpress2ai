/**
 * E-mailcontrole bij de livegang.
 *
 * Waarom dit een eigen blok is: bij een migratie verhuist de wébsite, maar de
 * mail moet blijven draaien waar hij draait. Alles wat daarvoor nodig is staat
 * in DNS, en juist daar gaat het mis: één vergeten record en de post van de
 * klant stopt of belandt stilletjes in de spam. Dat merk je niet aan de site.
 *
 * Bij Van den Berg (mediator, 24-09-2026) bleek zijn mail op dezelfde machine
 * te draaien als zijn WordPress-site. Zeg je dat niet, dan zegt hij na de
 * verhuizing zijn hosting op om te besparen en is zijn post weg. Daarom staat
 * de diagnose "waar draait de mail" hier als eerste, en dringend.
 *
 * Zuivere functies: alle DNS-gegevens komen als argument binnen, zodat dit
 * zonder netwerk te testen is.
 */

export type MailFeiten = {
  /** MX-hosts, op prioriteit gesorteerd, kleine letters */
  mx: string[];
  /** Lost het eerste MX-doel op naar een IP? null = niet gecontroleerd */
  mxBereikbaar: boolean | null;
  /** Alle TXT-records op het hoofddomein */
  txt: string[];
  /** TXT-records op _dmarc */
  dmarc: string[];
  /** Selectors waarop een DKIM-record gevonden is */
  dkimSelectors: string[];
};

export type MailBevinding = {
  sleutel: string;
  label: string;
  ok: boolean;
  uitleg: string;
  dringend?: boolean;
};

/** Selectors die we proberen. DKIM is niet op te vragen zonder de naam te
 * kennen, dus dit is een gok op de gebruikelijke namen. Niets gevonden
 * betekent daarom NIET dat er geen DKIM is. */
export const DKIM_SELECTORS = [
  "default", "mail", "dkim", "selector1", "selector2", "google",
  "k1", "s1", "s2", "x", "smtp", "key1",
] as const;

const WEBHOSTERS =
  /vimexx|antagonist|siteground|mailspamprotection|hostnet|mijndomein|byte|savvii|cloud86|neostrada|versio|strato|one\.com|hostinger|dewebsmid|yourdomainprovider/;

/** Waar draait de mail? Zelfde indeling als scripts/mail-check.mts. */
export function mailDiagnose(mx: string[]): { extern: boolean; tekst: string } {
  const t = mx.join(" ").toLowerCase();
  if (!mx.length) return { extern: false, tekst: "Geen MX gevonden: op dit domein komt geen mail binnen." };
  if (/outlook|microsoft/.test(t)) return { extern: true, tekst: "Microsoft 365. Draait extern, alleen de records meenemen." };
  if (/google|gmail/.test(t)) return { extern: true, tekst: "Google Workspace. Draait extern, alleen de records meenemen." };
  if (/soverin/.test(t)) return { extern: true, tekst: "Soverin. Draait extern, alleen de records meenemen." };
  if (/transip/.test(t)) return { extern: true, tekst: "TransIP. Controleer of dit los staat van de webhosting." };
  if (WEBHOSTERS.test(t))
    return {
      extern: false,
      tekst: "De mail draait bij een webhoster en hangt waarschijnlijk aan de oude WordPress-hosting. Die hosting mag NIET opgezegd worden voordat de mail verhuisd is.",
    };
  return {
    extern: false,
    tekst: "Onbekende partij. Zoek uit of dit dezelfde server is als de oude website; zo ja, dan mag die hosting niet opgezegd worden.",
  };
}

/** SPF-records eruit vissen. Twee stuks is een klassieke fout: dan faalt de
 * controle bij de ontvanger en belandt alles in de spam. */
export function spfRecords(txt: string[]): string[] {
  return txt.filter((t) => t.trim().toLowerCase().startsWith("v=spf1"));
}

export function mailBevindingen(f: MailFeiten): MailBevinding[] {
  const uit: MailBevinding[] = [];
  const diagnose = mailDiagnose(f.mx);

  uit.push({
    sleutel: "mail-mx",
    label: "MX-records staan er",
    ok: f.mx.length > 0,
    uitleg: f.mx.length ? `Post gaat naar: ${f.mx.join(", ")}` : "Zonder MX komt er geen mail meer binnen op dit domein. Controleer of alle records zijn meegenomen.",
    dringend: f.mx.length === 0,
  });

  if (f.mx.length) {
    uit.push({
      sleutel: "mail-waar",
      label: "Waar de mail draait",
      ok: diagnose.extern,
      uitleg: diagnose.tekst,
      dringend: false,
    });
    if (f.mxBereikbaar === false)
      uit.push({
        sleutel: "mail-bereikbaar",
        label: "Mailserver is bereikbaar",
        ok: false,
        uitleg: `${f.mx[0]} lost niet op naar een adres. Post komt nu niet aan.`,
        dringend: true,
      });
  }

  const spf = spfRecords(f.txt);
  uit.push({
    sleutel: "mail-spf",
    label: "Precies één SPF-record",
    ok: spf.length === 1,
    uitleg:
      spf.length === 0
        ? "Geen SPF gevonden. Zonder SPF belandt uitgaande post eerder in de spam; neem het record van de oude situatie over."
        : spf.length > 1
          ? `Er staan er ${spf.length}. Twee SPF-records laten de controle bij de ontvanger mislukken; voeg ze samen tot één regel.`
          : spf[0],
    dringend: spf.length > 1,
  });

  // Het a-mechanisme wijst naar het A-record van het domein. Zodra de website
  // bij ons draait, geeft dat ONZE webserver toestemming om post te versturen
  // namens de klant. Niet kapot, wel rommelig.
  if (spf.length === 1 && /(^|\s)[-~+?]?a(\s|$)/.test(spf[0]))
    uit.push({
      sleutel: "mail-spf-a",
      label: "SPF verwijst niet meer naar de oude webserver",
      ok: false,
      uitleg: "In de SPF staat 'a': dat geeft de server van de wébsite toestemming om post te versturen. Nu de site bij ons draait, hoort dat eruit.",
    });

  uit.push({
    sleutel: "mail-dkim",
    label: "DKIM gevonden",
    ok: f.dkimSelectors.length > 0,
    uitleg: f.dkimSelectors.length
      ? `Gevonden op: ${f.dkimSelectors.join(", ")}`
      : "Niet gevonden op de gebruikelijke namen. Dat betekent niet dat het er niet is: DKIM is alleen op te vragen als je de naam kent. Laat de klant één mail sturen naar mail-tester.com; daar staat de naam in, en dan weet je meteen of het na de verhuizing nog klopt.",
  });

  uit.push({
    sleutel: "mail-dmarc",
    label: "DMARC staat er",
    ok: f.dmarc.some((t) => t.toLowerCase().startsWith("v=dmarc1")),
    uitleg: "Zonder DMARC kan iemand zich makkelijker als de klant voordoen. Neem het record uit de oude situatie over.",
  });

  return uit;
}
