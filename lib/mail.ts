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
  domein?: string | null;
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
/** Is dit onze eigen site (wordswap.nl)? Alleen die mails krijgen
 * WordSwap-opmaak — klantsites blijven volledig wit-label. */
function isEigenSite(site: MailSite): boolean {
  return Boolean(site && (site.domein?.includes("wordswap.nl") || site.naam === "WordSwap"));
}

/** WordSwap-huisstijl om een mail heen: logo boven, nette voet met
 * AI Backoffice-vermelding eronder. */
function metWordSwapOpmaak(html: string): string {
  return `<div style="font-family:-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.65;color:#292524;max-width:560px">
<img src="https://www.wordswap.nl/logo-mail.png" height="36" alt="WordSwap" style="display:block;height:36px;width:auto;margin-bottom:20px">
${html}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:32px;width:100%"><tr><td style="border-top:2px solid #7c3aed;padding-top:14px">
<p style="margin:0;font-size:12px;color:#a8a29e">WordSwap is een dienst van</p>
<img src="https://www.wordswap.nl/logo-aibackoffice.png" height="22" alt="AI Backoffice" style="display:block;height:22px;width:auto;margin-top:6px">
<p style="margin:8px 0 0;font-size:12px;color:#a8a29e">J.K. Klijnhout Holding B.V. · KvK 09190650 · <a href="https://wordswap.nl" style="color:#7c3aed;text-decoration:none">wordswap.nl</a></p>
</td></tr></table></div>`;
}

export async function verstuurSiteMail(opties: {
  site: MailSite;
  naar: string;
  onderwerp: string;
  html: string;
  antwoordNaar?: string;
  bijlagen?: { bestandsnaam: string; inhoud: Buffer }[];
}) {
  const { site, naar, onderwerp, antwoordNaar, bijlagen } = opties;
  const html = isEigenSite(site) ? metWordSwapOpmaak(opties.html) : opties.html;
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
          ...(bijlagen?.length
            ? { attachments: bijlagen.map((b) => ({ filename: b.bestandsnaam, content: b.inhoud })) }
            : {}),
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
      ...(bijlagen?.length
        ? { attachments: bijlagen.map((b) => ({ filename: b.bestandsnaam, content: b.inhoud.toString("base64") })) }
        : {}),
    }),
  }).catch((e) => console.error("Mail versturen mislukt:", e));
}
