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
  /** Nodig om een SMTP-storing op de site vast te leggen; zonder id slaan we
   * dat stilletjes over (bv. bij losse mails zonder siterij). */
  id?: number;
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
  smtpFoutOp?: Date | null;
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
 * losse mails (logo, Jos van WordSwap, demo-knop), met een juridische regel
 * met de handelsnaam eronder. */
function metWordSwapOpmaak(html: string): string {
  return `<div style="font-family:-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.65;color:#292524;max-width:560px">
${html}
${handtekening(true)}
<p style="margin:16px 0 0;font-size:12px;color:#a8a29e">WordSwap · KvK 09190650</p>
</div>`;
}

/** Geeft terug of de mail echt de deur uit is. Bij een site die berichten
 * niet bewaart is dat het verschil tussen bezorgd en voorgoed weg, dus daar
 * mag het niet stil mislukken. */
export async function verstuurSiteMail(opties: {
  site: MailSite;
  naar: string;
  onderwerp: string;
  html: string;
  antwoordNaar?: string;
  bijlagen?: { bestandsnaam: string; inhoud: Buffer }[];
}): Promise<boolean> {
  const { site, naar, onderwerp, antwoordNaar, bijlagen } = opties;
  const html = isEigenSite(site) ? metWordSwapOpmaak(opties.html) : metKlantOpmaak(site, opties.html);
  if (!naar) return false;

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
        if (site.smtpFoutOp) await wisSmtpStoring(site).catch(() => {});
        return true;
      } catch (e) {
        console.error(`SMTP-mail via ${site.smtpHost} mislukt, terugval op Resend:`, e);
        // De mail komt zo dadelijk alsnog aan, maar uit naam van
        // no-reply@wordswap.nl in plaats van de klant. Dat is precies het soort
        // storing dat anders maandenlang onopgemerkt blijft, dus vastleggen.
        await noteerSmtpStoring(site, e).catch(() => {});
        // valt door naar Resend hieronder
      }
    }
  }

  // Standaardroute: Resend, uit naam van het bedrijf
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  // Klantmails gaan uit als "Bedrijfsnaam <no-reply@wordswap.nl>"; antwoorden gaan via
  // reply-to gewoon naar het bedrijf (of naar de invuller bij de melding aan de eigenaar).
  const adres = "no-reply@wordswap.nl";
  const from = `${(site?.naam ?? "WordSwap").replace(/["<>]/g, "")} <${adres}>`;
  // Ook een 4xx van Resend telde hier als geslaagd: de fout werd nooit
  // gelezen. Nu bepaalt het antwoord of we kunnen zeggen dat hij weg is.
  const res = await fetch("https://api.resend.com/emails", {
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
  }).catch((e) => {
    console.error("Mail versturen mislukt:", e);
    return null;
  });
  if (!res?.ok) {
    if (res) console.error("Mail versturen mislukt:", res.status, await res.text().catch(() => ""));
    return false;
  }
  return true;
}


/**
 * Seintje aan WordSwap als een formuliermail de eigenaar niet bereikte.
 *
 * Dit is het stilste dat er mis kan gaan: de bezoeker ziet "verzonden", het
 * bericht staat netjes in het portaal, en de eigenaar hoort niets. Hij mist
 * een aanvraag en weet niet dat hij iets mist. Eén melding per etmaal per
 * site, anders levert een kapotte mailroute een mail bij elk bericht.
 *
 * Nooit de inhoud van het bericht meesturen. Bij een site die op "niets
 * bewaren" staat zou dat de belofte breken, en bij de rest kan WordSwap het
 * gewoon in het portaal bekijken.
 */
export async function meldFormulierMailStoring(
  site: { id: number; naam: string; githubRepo: string; notificatieEmail: string | null; formulierMailFoutOp?: Date | string | null },
  formulier: string,
  bewaard: boolean,
) {
  const alGemeld =
    site.formulierMailFoutOp &&
    Date.now() - new Date(site.formulierMailFoutOp).getTime() < STORING_HERHAAL_MS;
  const { db } = await import("@/db");
  const { sites } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  await db
    .update(sites)
    .set({ formulierMailFoutOp: new Date() })
    .where(eq(sites.id, site.id))
    .catch(() => {});
  if (alGemeld) return;

  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const staart = bewaard
    ? "<p>Het bericht zelf staat wél veilig in het portaal van deze klant, dus er is niets verloren. Laat hem even weten dat hij daar moet kijken, en kijk waarom de mail niet aankomt (verkeerd adres, eigen mailserver, of een weigering bij Resend).</p>"
    : "<p><strong>Deze site staat op \"niets bewaren\", dus het bericht is nergens opgeslagen en is verloren.</strong> Bel de klant: iemand heeft zijn formulier ingevuld en dat bericht is niet aangekomen. De bezoeker heeft op zijn scherm gezien dat het misging.</p>";
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "WordSwap <no-reply@wordswap.nl>",
      to: ["info@wordswap.nl"],
      subject: `Formuliermail komt niet aan bij ${site.naam}`,
      html:
        `<p>Er kwam een bericht binnen via het formulier "${ontsnapHtml(formulier)}" op <strong>${ontsnapHtml(site.naam)}</strong> (${ontsnapHtml(site.githubRepo)}), ` +
        `maar de melding naar ${site.notificatieEmail ? ontsnapHtml(site.notificatieEmail) : "de eigenaar"} kon niet worden bezorgd.</p>` +
        staart +
        `<p style="color:#78716c;font-size:13px">Je krijgt hooguit één zo'n melding per dag per site. De inhoud van het bericht staat hier met opzet niet in.</p>`,
    }),
  }).catch((e) => console.error("Melding formuliermail-storing mislukt:", e));
}

/** Eén melding per etmaal per site: een kapotte mailserver levert anders een
 * mail bij elke verzending. */
const STORING_HERHAAL_MS = 24 * 60 * 60 * 1000;

/** Mailt WordSwap dat het maandbudget van een klantsite op is. De klant
 * krijgt zelf de nette melding met het verzoek te mailen, maar doet hij dat
 * niet, dan wist Jos van niets en bleef de klant de rest van de maand op de
 * rem staan (26-09). Eén mail per scope per maand: de claim op de
 * gemeld-kolom is atomair, dus ook bij twee gelijktijdige pogingen gaat er
 * maar één mail uit. */
export async function meldBudgetOp(
  site: { id: number; naam: string; githubRepo: string },
  scope: string,
  maand: string,
  kanaal: "portaal" | "whatsapp",
) {
  const { db } = await import("@/db");
  const { sql } = await import("drizzle-orm");
  const claim = await db.execute(sql`
    UPDATE ai_budget_reservations
    SET budget_op_gemeld_op = now()
    WHERE scope = ${scope} AND month = ${maand} AND budget_op_gemeld_op IS NULL
    RETURNING scope
  `);
  if (claim.rows.length === 0) return; // al gemeld deze maand

  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "WordSwap <no-reply@wordswap.nl>",
      to: ["info@wordswap.nl"],
      subject: `Maandbudget op bij ${site.naam}`,
      text:
        `Het AI-maandbudget van ${site.naam} (${site.githubRepo}) is op voor ${maand}. ` +
        `De klant probeerde zojuist via ${kanaal === "whatsapp" ? "WhatsApp" : "het portaal"} een opdracht te geven en kreeg de nette melding met het verzoek even te mailen.\n\n` +
        `Mailt hij niet zelf, dan weet je het nu toch. In de admin bij deze klant kun je eenmalig extra ruimte geven of het pakket aanpassen; de site zelf blijft gewoon online.\n\n` +
        `Je krijgt hooguit één melding per site per maand.`,
    }),
  }).catch((e) => console.error("Melding budget-op mislukt:", e));
}

async function noteerSmtpStoring(site: NonNullable<MailSite>, fout: unknown) {
  if (!site.id) return;
  const { leesFout } = await import("./smtp");
  const uitleg = leesFout(fout);
  const alGemeld =
    site.smtpFoutOp && Date.now() - new Date(site.smtpFoutOp).getTime() < STORING_HERHAAL_MS;

  const { db } = await import("@/db");
  const { sites } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  await db
    .update(sites)
    .set({ smtpFoutOp: new Date(), smtpFoutTekst: uitleg })
    .where(eq(sites.id, site.id));
  if (alGemeld) return;

  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "WordSwap <no-reply@wordswap.nl>",
      to: ["info@wordswap.nl"],
      subject: `Mailserver van ${site.naam} doet het niet`,
      text:
        `De eigen mailserver van ${site.naam} (${site.smtpHost}) weigert berichten.\n\n` +
        `${uitleg}\n\n` +
        `Berichten komen wel aan, maar gaan nu uit als no-reply@wordswap.nl in plaats van ` +
        `het eigen adres van de klant. Dat valt de klant zelf niet op.\n\n` +
        `Nakijken in de admin bij deze klant, onder Mailserver.`,
    }),
  }).catch(() => {});
}

async function wisSmtpStoring(site: NonNullable<MailSite>) {
  if (!site.id) return;
  const { db } = await import("@/db");
  const { sites } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  await db.update(sites).set({ smtpFoutOp: null, smtpFoutTekst: null }).where(eq(sites.id, site.id));
}
