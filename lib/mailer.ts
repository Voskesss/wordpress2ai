const stijl = `font-family:-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.65;color:#292524;max-width:560px`;

const ontsnap = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** De vaste handtekening onder losse mails vanuit jos@wordswap.nl. */
export const HANDTEKENING = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:32px;width:100%;max-width:560px;font-family:-apple-system,'Segoe UI',sans-serif">
<tr><td style="border-top:3px solid #7c3aed;padding-top:18px">
<img src="https://www.wordswap.nl/logo-mail.png" height="40" alt="WordSwap" style="display:block;height:40px;width:auto">
<p style="margin:12px 0 0;font-size:16px;font-weight:700;color:#1c1917">Jos Klijnhout</p>
<p style="margin:2px 0 0;font-size:13px;color:#57534e">websites zonder onderhoud — aanpassen door het te typen</p>
<p style="margin:4px 0 0;font-size:13px">
<a href="https://wordswap.nl" style="color:#7c3aed;text-decoration:none;font-weight:600">wordswap.nl</a>
<span style="color:#d6d3d1">&nbsp;·&nbsp;</span>
<a href="mailto:jos@wordswap.nl" style="color:#78716c;text-decoration:none">jos@wordswap.nl</a>
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px"><tr>
<td style="border-radius:999px;background:#7c3aed">
<a href="https://wordswap.nl/demo" style="display:inline-block;padding:9px 22px;font-size:13px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px">Probeer de demo — pas een site aan door te typen</a>
</td></tr></table>
</td></tr></table>`;

/** Platte tekst → nette HTML-mail met handtekening; links worden klikbaar. */
export function losseMailNaarHtml(tekst: string): string {
  const alineas = tekst
    .split(/\n\s*\n/)
    .map((a) => a.trim())
    .filter(Boolean)
    .map((a) => {
      const met = ontsnap(a)
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#6d28d9">$1</a>')
        .replace(
          /(^|[\s(])((?:www\.)?wordswap\.nl(?:\/[\w\-\/]*)?)/g,
          '$1<a href="https://$2" style="color:#6d28d9">$2</a>'
        );
      return `<p>${met.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");
  return `<div style="${stijl}">\n${alineas}\n${HANDTEKENING}</div>`;
}
