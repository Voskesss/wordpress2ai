/**
 * De eigen mailserver van een klant: verbinding maken, testen, en een storing
 * zichtbaar maken.
 *
 * Waarom dit bestaat: als het wachtwoord van de mailbox wijzigt, de mailbox vol
 * raakt of de host verhuist, blijft mail gewoon aankomen. Alleen niet meer uit
 * naam van de klant, maar via no-reply@wordswap.nl. Dat is precies het soort
 * storing dat maandenlang onopgemerkt blijft, want er gaat niets kapot.
 */

export type SmtpGegevens = {
  host: string;
  poort: number;
  gebruiker: string;
  wachtwoord: string;
  afzender?: string | null;
  /** Domein van de site, voor de HELO-naam; anders het domein van het afzendadres. */
  domein?: string | null;
};

/**
 * De naam waarmee we ons bij de mailserver melden (HELO/EHLO). Zonder deze
 * stuurt nodemailer het interne adres van de Vercel-functie (169.254.x.x),
 * en een kaal IP uit dat bereik is bij Microsoft een spamsignaal (Van den Berg:
 * SCL 5 terwijl SPF, DKIM en DMARC alle drie pass waren).
 *
 * NIET het domein van de klant: zijn eigen mailserver ziet dat als vervalsing
 * en weigert ("550 Bad HELO - Host impersonating domain name", Exim bij
 * Websmid, 30-09-2026). Wij zijn WordSwap, dus we melden ons als wordswap.nl.
 */
export function heloNaam(_g?: Pick<SmtpGegevens, "domein" | "afzender" | "gebruiker">): string {
  return process.env.SMTP_HELO_NAAM?.trim() || "wordswap.nl";
}

/** Eenvoudige tekstversie van een html-mail, voor het multipart-alternatief. */
export function tekstVanHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|tr)>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, tekst) =>
      tekst.replace(/<[^>]+>/g, "").trim() === href ? href : `${tekst.replace(/<[^>]+>/g, "")} (${href})`,
    )
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Eén plek waar de verbinding gemaakt wordt, zodat testen en versturen
 * gegarandeerd dezelfde instellingen gebruiken. */
/**
 * Maakt een ingevoerde servernaam bruikbaar. Mensen plakken hem uit een
 * DNS-weergave (punt erachter), uit een handleiding (smtp:// ervoor, :465 of
 * een pad erachter) of met hoofdletters. Nodemailer neemt de naam letterlijk
 * en dan matcht het certificaat niet (Van den Berg: "mail.domein.nl." gaf
 * "certificaat wordt niet vertrouwd" terwijl de server prima was).
 */
export function schoneSmtpHost(ruw: string | null | undefined): string {
  return String(ruw ?? "")
    .trim()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.+$/, "")
    .trim()
    .toLowerCase();
}

export async function maakTransport(g: SmtpGegevens) {
  const nodemailer = (await import("nodemailer")).default;
  return nodemailer.createTransport({
    host: schoneSmtpHost(g.host),
    port: g.poort,
    secure: g.poort === 465,
    name: heloNaam(g),
    auth: { user: g.gebruiker, pass: g.wachtwoord },
  });
}

export type TestUitslag = { ok: true; melding: string } | { ok: false; melding: string; uitleg: string };

/**
 * Vertaalt de kale foutmelding van een mailserver naar iets waar een mens wat
 * mee kan. De oorzaak is bijna altijd één van deze vijf.
 */
export function leesFout(fout: unknown): string {
  const tekst = String((fout as { message?: string })?.message ?? fout);
  if (/invalid login|authentication failed|535|auth/i.test(tekst))
    return "De gebruikersnaam of het wachtwoord klopt niet. Is het wachtwoord van de mailbox onlangs gewijzigd?";
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(tekst))
    return "De servernaam bestaat niet. Controleer de host, bijvoorbeeld smtp.soverin.net.";
  if (/ECONNREFUSED|ETIMEDOUT|ECONNRESET/i.test(tekst))
    return "Geen verbinding met de server. Klopt de poort? Meestal 465 (of 587).";
  if (/self.signed|certificate|SSL|TLS/i.test(tekst))
    return "Het beveiligingscertificaat wordt niet vertrouwd. Klopt de poort bij de instelling van de server?";
  if (/quota|full|over.?limit/i.test(tekst))
    return "De mailbox lijkt vol of over zijn limiet.";
  return tekst.slice(0, 300);
}

/**
 * Probeert in te loggen op de mailserver zonder iets te versturen. Met een
 * adres erbij gaat er een echt testbericht uit, want inloggen lukt soms wel
 * terwijl versturen alsnog wordt geweigerd.
 */
export async function testSmtp(
  g: SmtpGegevens,
  naarAdres?: string,
  naam = "WordSwap",
  aanNaam?: string | null,
): Promise<TestUitslag> {
  try {
    const transport = await maakTransport(g);
    await transport.verify();
    if (!naarAdres)
      return { ok: true, melding: `Inloggen op ${g.host} lukt.` };
    // Tekst én html: een mail met alleen text/plain vanaf een nieuwe afzender
    // scoort bij Microsoft slechter dan een gewone multipart-mail.
    const aanhef = aanNaam?.trim() ? `Hallo ${aanNaam.trim()},` : "Hallo,";
    const host = schoneSmtpHost(g.host);
    const alinea = [
      "Dit is een testbericht.",
      `Het is verstuurd via je eigen mailserver (${host}) en niet via WordSwap. Zie je deze mail, dan gaan de berichten van je website voortaan uit onder je eigen adres.`,
      "Je hoeft hier niets mee te doen.",
    ];
    const html =
      `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#222">` +
      [aanhef, ...alinea].map((t) => `<p>${t}</p>`).join("") +
      `</div>`;
    await transport.sendMail({
      from: `"${naam.replace(/"/g, "")}" <${g.afzender ?? g.gebruiker}>`,
      to: naarAdres,
      subject: "Testbericht van je eigen mailserver",
      text: [aanhef, ...alinea].join("\n\n"),
      html,
    });
    return { ok: true, melding: `Testbericht verstuurd naar ${naarAdres} via ${g.host}.` };
  } catch (fout) {
    return { ok: false, melding: `Verbinding met ${g.host} mislukt.`, uitleg: leesFout(fout) };
  }
}
