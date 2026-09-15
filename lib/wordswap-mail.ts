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

export function ontsnap(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
