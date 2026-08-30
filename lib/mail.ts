import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/** Sleutel voor het versleutelen van SMTP-wachtwoorden (afgeleid van CRON_SECRET). */
function sleutel(): Buffer {
  return createHash("sha256")
    .update(process.env.CRON_SECRET ?? "wordswap-fallback")
    .digest();
}

export function versleutel(tekst: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sleutel(), iv);
  const dicht = Buffer.concat([cipher.update(tekst, "utf8"), cipher.final()]);
  return `${iv.toString("base64")}.${cipher.getAuthTag().toString("base64")}.${dicht.toString("base64")}`;
}

export function ontsleutel(dicht: string): string | null {
  try {
    const [iv, tag, data] = dicht.split(".").map((d) => Buffer.from(d, "base64"));
    const decipher = createDecipheriv("aes-256-gcm", sleutel(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export type MailSite = {
  naam: string;
  smtpHost: string | null;
  smtpPoort: number | null;
  smtpGebruiker: string | null;
  smtpWachtwoord: string | null;
  smtpAfzender: string | null;
} | null;

/** Verstuurt e-mail namens een klantsite.
 * Heeft de site eigen SMTP-instellingen (witlabel), dan gaat de mail via de
 * eigen mailserver van de klant — écht vanaf hun domein. Anders via Resend,
 * met de bedrijfsnaam als afzendernaam op ons geverifieerde adres. */
export async function verstuurSiteMail(opties: {
  site: MailSite;
  naar: string;
  onderwerp: string;
  html: string;
  antwoordNaar?: string;
}) {
  const { site, naar, onderwerp, html, antwoordNaar } = opties;
  if (!naar) return;

  // Witlabel-route: eigen mailserver van de klant
  if (site?.smtpHost && site.smtpGebruiker && site.smtpWachtwoord) {
    const wachtwoord = ontsleutel(site.smtpWachtwoord);
    if (wachtwoord) {
      try {
        const nodemailer = (await import("nodemailer")).default;
        const transport = nodemailer.createTransport({
          host: site.smtpHost,
          port: site.smtpPoort ?? 465,
          secure: (site.smtpPoort ?? 465) === 465,
          auth: { user: site.smtpGebruiker, pass: wachtwoord },
        });
        await transport.sendMail({
          from: `"${site.naam.replace(/"/g, "")}" <${site.smtpAfzender ?? site.smtpGebruiker}>`,
          to: naar,
          subject: onderwerp,
          html,
          ...(antwoordNaar ? { replyTo: antwoordNaar } : {}),
        });
        return;
      } catch (e) {
        console.error(`SMTP-mail via ${site.smtpHost} mislukt, terugval op Resend:`, e);
        // valt door naar Resend hieronder
      }
    }
  }

  // Standaardroute: Resend, uit naam van het bedrijf
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const basisFrom = process.env.RESEND_FROM ?? "WordSwap <onboarding@resend.dev>";
  const adres = basisFrom.match(/<([^>]+)>/)?.[1] ?? basisFrom;
  const from = site?.naam ? `${site.naam.replace(/["<>]/g, "")} <${adres}>` : basisFrom;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [naar],
      subject: onderwerp,
      html,
      ...(antwoordNaar ? { reply_to: [antwoordNaar] } : {}),
    }),
  }).catch((e) => console.error("Mail versturen mislukt:", e));
}
