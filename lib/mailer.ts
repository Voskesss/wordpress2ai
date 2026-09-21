const stijl = `font-family:-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.65;color:#292524;max-width:560px`;

const ontsnap = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const DEMO_KNOP = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px"><tr>
<td style="border-radius:999px;background:#244b3d">
<a href="https://wordswap.nl/demo" style="display:inline-block;padding:9px 22px;font-size:13px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px">Probeer de demo — pas een site aan door te typen</a>
</td></tr></table>`;

/** De vaste handtekening onder losse mails vanuit jos@wordswap.nl. De
 * demo-knop is optioneel: goed voor koude outreach, maar bij een warme lead
 * leidt hij af van het echte vervolg (bellen of "laat maar zien"). */
export function handtekening(metDemo = true, naam = "Jos Klijnhout"): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:32px;width:100%;max-width:560px;font-family:-apple-system,'Segoe UI',sans-serif">
<tr><td style="border-top:3px solid #31956B;padding-top:18px">
<img src="https://www.wordswap.nl/logo-mail-groen.png" height="40" alt="WordSwap" style="display:block;height:40px;width:auto">
<p style="margin:12px 0 0;font-size:16px;font-weight:700;color:#1c1917">${naam}</p>
<p style="margin:2px 0 0;font-size:13px;color:#57534e">websites zonder onderhoud, aanpassen door het te typen</p>
<p style="margin:4px 0 0;font-size:13px">
<a href="https://wordswap.nl" style="color:#245747;text-decoration:none;font-weight:600">wordswap.nl</a>
<span style="color:#d6d3d1">&nbsp;·&nbsp;</span>
<a href="mailto:jos@wordswap.nl" style="color:#78716c;text-decoration:none">jos@wordswap.nl</a>
</p>
${metDemo ? DEMO_KNOP : ""}
</td></tr></table>`;
}

/** Handtekening onder de koude outreach-mails: altijd mét demo-knop, en
 * alleen de voornaam. Onder een mail aan iemand die je nog niet kent leest
 * een volledige naam als een brief van een instantie; klantpost en leadpost
 * houden wel de volledige naam. */
export const HANDTEKENING = handtekening(true, "Jos");

/** Platte tekst → nette HTML-mail met handtekening; links worden klikbaar. */
/** Breedte waarop mailafbeeldingen worden opgeslagen (2× de toonbreedte, scherp op retina). */
export const MAIL_BEELD_BREEDTE = 1120;
/** Markering die de Mailer in de tekst zet op de plek van een afbeelding. */
const BEELD_PATROON = /^\[afbeelding:\s*(https?:\/\/[^\s\]]+)\s*\]$/i;

export function losseMailNaarHtml(tekst: string, metDemo = true): string {
  const alineas = tekst
    .split(/\n\s*\n/)
    .map((a) => a.trim())
    .filter(Boolean)
    .map((a) => {
      // Een alinea die alleen uit een afbeeldingsmarkering bestaat wordt het beeld zelf
      const beeld = BEELD_PATROON.exec(a);
      if (beeld) {
        return `<img src="${ontsnap(beeld[1])}" alt="" width="560" style="display:block;width:100%;max-width:560px;height:auto;border-radius:8px;margin:20px 0">`;
      }
      const met = ontsnap(a)
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#245747">$1</a>')
        .replace(
          /(^|[\s(])((?:www\.)?wordswap\.nl(?:\/[\w\-\/]*)?)/g,
          '$1<a href="https://$2" style="color:#245747">$2</a>'
        );
      return `<p>${met.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");
  return `<div style="${stijl}">\n${alineas}\n<p style="margin-top:24px">Met vriendelijke groet,</p>\n${handtekening(metDemo)}</div>`;
}
