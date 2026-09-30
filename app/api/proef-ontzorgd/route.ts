import { ontsnap } from "@/lib/wordswap-mail";
import { datumNl, siteViaToken, startProef, zegJa } from "@/lib/proef-ontzorgd";
import { PAKKETTEN } from "@/lib/aanbod";

export const dynamic = "force-dynamic";

/** De knoppen uit de proefmaand-mails: start (een maand gratis) en ja (doorgaan).
 * Werkt op de onraadbare code van de site; geen inlog nodig, wel bewust een klik. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const site = await siteViaToken(q.get("token") ?? "");
  const actie = q.get("actie");
  if (!site || (actie !== "start" && actie !== "ja")) return pagina("Deze link is niet (meer) geldig", "<p>Antwoord gerust op de mail van Jos, dan regelt hij het met je.</p>", 404);
  const origin = new URL(req.url).origin;
  const { klantEmailVoorSite } = await import("@/lib/klant-email");
  const { mailVanJos } = await import("@/lib/wordswap-mail");
  const klant = await klantEmailVoorSite(site.id);
  if (actie === "start") {
    const { tot, alLopend } = await startProef(site.id);
    if (!alLopend) {
      const { bouwProefGestart } = await import("@/lib/klant-mails");
      if (klant) {
        const mail = bouwProefGestart({ naam: klant.naam, tot, portaalUrl: `${origin}/portal?site=${site.id}` });
        await mailVanJos({ naar: klant.email, van: "Jos van WordSwap", onderwerp: mail.onderwerp, html: mail.html, bcc: false });
      }
      await mailVanJos({ naar: "jos@wordswap.nl", onderwerp: `Proefmaand gestart: ${site.naam}`, html: `<p>${ontsnap(site.naam)} probeert Optimaal ontzorgd met WhatsApp tot ${datumNl(tot)}. Koppel het telefoonnummer zodra de klant het in het portaal heeft doorgegeven.</p><p><a href="${origin}/admin/klant/${site.id}">Naar de klantpagina</a></p>`, bcc: false });
    }
    return pagina(
      "Je proefmaand is begonnen",
      `<p>Tot <strong>${datumNl(tot)}</strong> probeer je Optimaal ontzorgd gratis, met WhatsApp.</p>
<p><strong>Nog één stap:</strong> geef in je portaal het telefoonnummer door waarmee je wilt appen. Jos koppelt het en laat je weten zodra het werkt.</p>
<p><a href="${origin}/portal?site=${site.id}" style="display:inline-block;background:#31956B;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">Naar mijn portaal</a></p>
<p style="color:#57534e">Na de maand gaat WhatsApp vanzelf weer uit, tenzij je zegt dat je door wilt. Er wordt niets afgeschreven zonder jouw ja.</p>`,
    );
  }
  const uitkomst = await zegJa(site.id);
  const { bouwProefJa } = await import("@/lib/klant-mails");
  if (klant) {
    const mail = bouwProefJa({ naam: klant.naam, ...uitkomst });
    await mailVanJos({ naar: klant.email, van: "Jos van WordSwap", onderwerp: mail.onderwerp, html: mail.html, bcc: false });
  }
  await mailVanJos({ naar: "jos@wordswap.nl", onderwerp: `Ja op Optimaal ontzorgd: ${site.naam}`, html: `<p>${ontsnap(site.naam)} gaat door met Optimaal ontzorgd (€${PAKKETTEN.ontzorgd.prijs}). Bedrag: ${uitkomst.via === "gepland" ? `gepland per ${uitkomst.vanaf} via de abonnementencron` : uitkomst.via === "meteen" ? "staat al goed" : "GEEN lopend abonnement, zelf regelen"}.</p><p><a href="${origin}/admin/klant/${site.id}">Naar de klantpagina</a></p>`, bcc: false });
  return pagina(
    "Dank je wel, het staat genoteerd",
    `<p>WhatsApp blijft aan, en je hebt voortaan voorrang en elke maand 30 minuten persoonlijke hulp.</p>
${uitkomst.via === "gepland" ? `<p>Vanaf <strong>${datumNl(new Date(uitkomst.vanaf + "T12:00:00"))}</strong> is je maandbedrag €${PAKKETTEN.ontzorgd.prijs} exclusief btw. Tot die tijd betaal je je huidige bedrag.</p>` : uitkomst.via === "meteen" ? `<p>Je maandbedrag is €${PAKKETTEN.ontzorgd.prijs} exclusief btw.</p>` : "<p>Jos neemt contact met je op om het abonnement in orde te maken.</p>"}
<p>Je krijgt dit ook per mail.</p>`,
  );
}

function pagina(kop: string, inhoud: string, status = 200): Response {
  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${ontsnap(kop)} | WordSwap</title></head>
<body style="margin:0;background:#f3f5ef;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#243a31">
<div style="max-width:560px;margin:40px auto;padding:0 16px"><img src="https://www.wordswap.nl/logo-mail-groen.png" height="34" alt="WordSwap" style="display:block;height:34px;width:auto;margin-bottom:18px">
<div style="background:#fff;border-radius:16px;padding:28px;font-size:16px;line-height:1.6"><h1 style="margin:0 0 12px;font-size:24px">${ontsnap(kop)}</h1>${inhoud}</div></div></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
