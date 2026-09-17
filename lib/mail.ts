import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { handtekening } from "./mailer";

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
  mailHandtekening?: string | null;
  mailLogoUrl?: string | null;
  mailKleur?: string | null;
  smtpHost: string | null;
  smtpPoort: number | null;
  smtpGebruiker: string | null;
  smtpWachtwoord: string | null;
  smtpAfzender: string | null;
} | null;

function ontsnapHtml(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Nette, neutrale opmaak om een klantmail heen, met de handtekening van het
 * bedrijf: logo, naam, adresregels, website. Geen WordSwap-sporen: de mail is
 * van de klant. Zonder ingevulde handtekening: naam + website. */
export function metKlantOpmaak(site: MailSite, html: string): string {
  const naam = ontsnapHtml(site?.naam ?? "");
  const kleur = /^#[0-9a-fA-F]{6}$/.test(site?.mailKleur ?? "") ? (site!.mailKleur as string) : "#292524";
  const domein = (site?.domein ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const toonDomein = domein && !/\.workers\.dev$/.test(domein) ? domein : "";
  const regels = (site?.mailHandtekening ?? "")
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => {
      if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r)) return `<a href="mailto:${ontsnapHtml(r)}" style="color:${kleur};text-decoration:none">${ontsnapHtml(r)}</a>`;
      if (/^(\+|0)[0-9 ()-]{6,}$/.test(r)) return `<a href="tel:${r.replace(/[^+0-9]/g, "")}" style="color:${kleur};text-decoration:none">${ontsnapHtml(r)}</a>`;
      return ontsnapHtml(r);
    });
  const logo = site?.mailLogoUrl && /^https?:\/\//.test(site.mailLogoUrl)
    ? `<img src="${ontsnapHtml(site.mailLogoUrl)}" alt="${naam}" style="max-height:56px;max-width:220px;display:block;margin:0 0 12px">`
    : "";
  const website = toonDomein
    ? `<a href="https://${ontsnapHtml(toonDomein)}" style="color:${kleur};font-weight:600;text-decoration:none">${ontsnapHtml(toonDomein)}</a>`
    : "";
  return `<div style="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#292524;max-width:560px">
${html}
<div style="margin-top:28px;padding-top:18px;border-top:2px solid ${kleur}">
${logo}<p style="margin:0;font-weight:700;color:${kleur}">${naam}</p>
${regels.length ? `<p style="margin:4px 0 0;color:#57534e">${regels.join("<br>")}</p>` : ""}
${website ? `<p style="margin:6px 0 0">${website}</p>` : ""}
</div>
${toonDomein ? `<p style="margin:18px 0 0;font-size:12px;color:#a8a29e">Deze e-mail is automatisch verstuurd via het formulier op ${ontsnapHtml(toonDomein)}.</p>` : ""}
</div>`;
}

/** Verstuurt e-mail namens een klantsite.
 * Heeft de site eigen SMTP-instellingen (witlabel), dan gaat de mail via de
 * eigen mailserver van de klant — écht vanaf hun domein. Anders via Resend,
 * met de bedrijfsnaam als afzendernaam op ons geverifieerde adres. */
/** Is dit onze eigen site (wordswap.nl)? Alleen die mails krijgen
 * WordSwap-opmaak — klantsites blijven volledig wit-label. */
function isEigenSite(site: MailSite): boolean {
  return Boolean(site && (site.domein?.includes("wordswap.nl") || site.naam === "WordSwap"));
}

/** WordSwap-huisstijl om een mail heen: dezelfde groene handtekening als de
 * losse mails (logo, Jos Klijnhout, demo-knop), met een juridische regel
 * met de handelsnaam eronder. */
function metWordSwapOpmaak(html: string): string {
  return `<div style="font-family:-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.65;color:#292524;max-width:560px">
${html}
${handtekening(true)}
<p style="margin:16px 0 0;font-size:12px;color:#a8a29e">WordSwap · KvK 09190650</p>
</div>`;
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
  const html = isEigenSite(site) ? metWordSwapOpmaak(opties.html) : metKlantOpmaak(site, opties.html);
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
  // Klantmails gaan uit als "Bedrijfsnaam <no-reply@wordswap.nl>"; antwoorden gaan via
  // reply-to gewoon naar het bedrijf (of naar de invuller bij de melding aan de eigenaar).
  const adres = "no-reply@wordswap.nl";
  const from = `${(site?.naam ?? "WordSwap").replace(/["<>]/g, "")} <${adres}>`;
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
