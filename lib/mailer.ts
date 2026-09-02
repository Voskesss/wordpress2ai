const stijl = `font-family:-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.65;color:#292524;max-width:560px`;

const ontsnap = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** De vaste handtekening onder losse mails vanuit jos@wordswap.nl. */
export const HANDTEKENING = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;border-top:2px solid #6d28d9;padding-top:0">
<tr><td style="padding-top:14px;font-family:-apple-system,'Segoe UI',sans-serif">
<p style="margin:0;font-size:15px;font-weight:700;color:#1c1917">Jos Klijnhout</p>
<p style="margin:2px 0 0;font-size:13px;color:#78716c">W<span style="color:#6d28d9">ord</span>Swap — websites zonder onderhoud, aanpassen door het te typen</p>
<p style="margin:8px 0 0;font-size:13px">
<a href="https://wordswap.nl" style="color:#6d28d9;text-decoration:none;font-weight:600">wordswap.nl</a>
<span style="color:#d6d3d1"> · </span>
<a href="mailto:jos@wordswap.nl" style="color:#78716c;text-decoration:none">jos@wordswap.nl</a>
<span style="color:#d6d3d1"> · </span>
<a href="https://wordswap.nl/demo" style="color:#78716c;text-decoration:none">probeer de demo</a>
</p>
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
