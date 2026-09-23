/** Mail vanuit WordSwap via Resend; antwoorden gaan naar Jos. Standaard met een kopie (bcc) naar Jos. */
export async function mailVanJos(o: {
  naar: string;
  onderwerp: string;
  html: string;
  van?: string;
  bcc?: boolean;
  bijlagen?: { bestandsnaam: string; inhoud: Buffer }[];
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const basisFrom = process.env.RESEND_FROM ?? "WordSwap <onboarding@resend.dev>";
  const adres = basisFrom.match(/<([^>]+)>/)?.[1] ?? basisFrom;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${o.van ?? "WordSwap"} <${adres}>`,
      to: [o.naar],
      ...(o.bcc === false || o.naar === "jos@wordswap.nl" ? {} : { bcc: ["jos@wordswap.nl"] }),
      reply_to: ["jos@wordswap.nl"],
      subject: o.onderwerp,
      html: o.html,
      ...(o.bijlagen?.length
        ? { attachments: o.bijlagen.map((b) => ({ filename: b.bestandsnaam, content: b.inhoud.toString("base64") })) }
        : {}),
    }),
  }).catch(() => null);
  if (!res?.ok) console.error("Mail mislukt:", o.onderwerp, res ? await res.text() : "geen verbinding");
  return Boolean(res?.ok);
}

/**
 * WordSwap-huisstijl voor mails aan (toekomstige) klanten: logo bovenaan, witte kaart op een zachte
 * achtergrond, en onderaan Jos met foto. Tabellen en inline stijlen, zodat het ook in Outlook en
 * Gmail goed oogt; zonder afbeeldingen blijft de mail gewoon leesbaar.
 */
export function inWordSwapHuisstijl(inhoud: string, voet = ""): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5ef;padding:24px 12px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 4px 16px"><img src="https://www.wordswap.nl/logo-mail-groen.png" height="34" alt="WordSwap" style="display:block;height:34px;width:auto"></td></tr>
<tr><td style="background:#ffffff;border-radius:16px;padding:28px 28px 8px;font-size:15px;line-height:1.65;color:#243a31">
${inhoud}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 18px;border-top:1px solid #e3e8dc;padding-top:18px;width:100%"><tr>
<td width="64" style="vertical-align:top;padding-top:18px"><img src="https://www.wordswap.nl/team/jos-mail.jpg" width="52" height="52" alt="Jos" style="display:block;width:52px;height:52px;border-radius:50%"></td>
<td style="vertical-align:top;padding-top:18px;font-size:14px;line-height:1.5;color:#243a31"><strong>Jos</strong><br><span style="color:#657164">Oprichter van WordSwap</span><br><a href="https://wordswap.nl" style="color:#245747;text-decoration:none;font-weight:600">wordswap.nl</a></td>
</tr></table>
</td></tr>
${voet ? `<tr><td style="padding:14px 8px 0;font-size:12px;line-height:1.5;color:#8a9185">${voet}</td></tr>` : ""}
</table>
</td></tr></table>`;
}

export function ontsnap(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
