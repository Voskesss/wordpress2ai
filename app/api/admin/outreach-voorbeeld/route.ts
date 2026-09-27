import { NextResponse } from "next/server";
import { isBeheerder } from "@/lib/auth";
import { sjabloonNaarHtml, vulIn, type Prospect } from "@/lib/outreach";
import { losseMailNaarHtml } from "@/lib/mailer";
import { outreachAfzender } from "@/lib/afzender";
import { ontsnap } from "@/lib/wordswap-mail";

export const dynamic = "force-dynamic";

/**
 * Voorbeeld (en desgewenst proefmail) van precies de outreach-tekst die nu in
 * het bewerkvak staat. De oude testknop stuurde altijd de standaardopbouw,
 * waardoor je je eigen bewerking nooit echt zag vóór verzending (Jos 27-09).
 */
export async function POST(req: Request) {
  if (!(await isBeheerder())) return new NextResponse("Nee", { status: 403 });
  const f = await req.formData();
  const onderwerpRuw = String(f.get("onderwerp") ?? "").trim() || "(geen onderwerp)";
  const tekst = String(f.get("tekst") ?? "");
  const los = f.get("los") === "ja";
  const voorbeeld: Prospect = {
    id: 0,
    bedrijf: String(f.get("bedrijf") ?? "") || "Bakkerij De Korenbloem",
    website: String(f.get("website") ?? "") || "www.voorbeeldbedrijf.nl",
    email: "voorbeeld@voorbeeldbedrijf.nl",
    observatie: String(f.get("observatie") ?? "") || null,
  };
  const onderwerp = los ? onderwerpRuw : vulIn(onderwerpRuw, voorbeeld);
  const html = los ? losseMailNaarHtml(tekst) : sjabloonNaarHtml(vulIn(tekst, voorbeeld), voorbeeld);

  if (f.get("verstuur") === "ja") {
    const naar = (String(f.get("naar") ?? "").trim() || "jos@wordswap.nl").toLowerCase();
    // Alleen eigen adressen: een proef mag nooit per ongeluk naar een prospect
    if (!/@wordswap\.nl$|^josklijnhout@hotmail\.com$/.test(naar)) {
      return new NextResponse("Proefmails gaan alleen naar een eigen adres (@wordswap.nl).", { status: 400 });
    }
    const key = process.env.RESEND_API_KEY;
    if (!key) return new NextResponse("RESEND_API_KEY ontbreekt.", { status: 500 });
    const basisFrom = outreachAfzender();
    const adres = basisFrom.match(/<([^>]+)>/)?.[1] ?? basisFrom;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `Jos van WordSwap <${adres}>`,
        to: [naar],
        subject: `[PROEF] ${onderwerp}`,
        html: `<div style="background:#fef3c7;border:1px solid #fde68a;padding:10px 14px;border-radius:10px;font-family:sans-serif;font-size:13px;color:#92400e;margin-bottom:16px">Dit is een PROEF van je bewerkte tekst, via het echte verzendpad. De afmeldknop doet in deze proef niets.</div>${html}`,
        reply_to: ["info@wordswap.nl"],
      }),
    }).catch(() => null);
    const gelukt = Boolean(res?.ok);
    return new Response(
      `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Proefmail</title></head><body style="font-family:system-ui,sans-serif;padding:40px;max-width:520px;margin:0 auto"><h1 style="font-size:20px">${gelukt ? "✅ Proefmail verstuurd" : "❌ Versturen mislukte"}</h1><p>${gelukt ? `Kijk in de inbox van <strong>${ontsnap(naar)}</strong>; hij komt van het outreach-adres, dus check ook ongewenste mail.` : "Probeer het nog eens of kijk in de logs."}</p></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  return new Response(
    `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Voorbeeld van de mail</title></head>
<body style="margin:0;background:#e9ece4;font-family:-apple-system,'Segoe UI',sans-serif">
<div style="max-width:640px;margin:0 auto;padding:20px 12px">
<p style="margin:0 0 10px;font-size:13px;color:#57534e">Voorbeeld met voorbeeldgegevens; er is niets verstuurd.</p>
<p style="margin:0 0 14px;font-size:14px;background:#fff;border-radius:10px;padding:10px 14px"><span style="color:#78716c">Onderwerp:</span> <strong>${ontsnap(onderwerp)}</strong><br><span style="color:#78716c">Van:</span> ${ontsnap(outreachAfzender())}</p>
${html}
</div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
