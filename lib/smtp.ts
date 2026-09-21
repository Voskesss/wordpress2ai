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
};

/** Eén plek waar de verbinding gemaakt wordt, zodat testen en versturen
 * gegarandeerd dezelfde instellingen gebruiken. */
export async function maakTransport(g: SmtpGegevens) {
  const nodemailer = (await import("nodemailer")).default;
  return nodemailer.createTransport({
    host: g.host,
    port: g.poort,
    secure: g.poort === 465,
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
export async function testSmtp(g: SmtpGegevens, naarAdres?: string, naam = "WordSwap"): Promise<TestUitslag> {
  try {
    const transport = await maakTransport(g);
    await transport.verify();
    if (!naarAdres)
      return { ok: true, melding: `Inloggen op ${g.host} lukt.` };
    await transport.sendMail({
      from: `"${naam.replace(/"/g, "")}" <${g.afzender ?? g.gebruiker}>`,
      to: naarAdres,
      subject: "Testbericht van je eigen mailserver",
      text:
        `Dit is een testbericht.\n\n` +
        `Het is verstuurd via je eigen mailserver (${g.host}) en niet via WordSwap. ` +
        `Zie je deze mail, dan gaan de berichten van je website voortaan uit onder je eigen adres.\n\n` +
        `Je hoeft hier niets mee te doen.`,
    });
    return { ok: true, melding: `Testbericht verstuurd naar ${naarAdres} via ${g.host}.` };
  } catch (fout) {
    return { ok: false, melding: `Verbinding met ${g.host} mislukt.`, uitleg: leesFout(fout) };
  }
}
