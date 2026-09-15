import { isBeheerder } from "@/lib/auth";
import { bouwBetaallinkMail } from "@/lib/betaallink-mail";
import { maakOpdrachtbevestigingPdf } from "@/lib/factuur";

export const dynamic = "force-dynamic";

function bedragCent(w: string | null): number {
  const n = Number((w ?? "").trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

/**
 * Voorbeeld voor de admin: precies de mail en de opdrachtbevestiging die de klant zou
 * krijgen met de nu ingevulde formulierwaarden. Maakt en verstuurt niets.
 * ?deel=pdf geeft de opdrachtbevestiging-pdf, anders een pagina met de mail en de pdf ernaast.
 */
export async function GET(req: Request) {
  if (!(await isBeheerder())) return new Response("Geen toegang", { status: 403 });
  const p = new URL(req.url).searchParams;
  const naam = p.get("naam")?.trim() || "Voornaam Achternaam";
  const gegevens = {
    siteNaam: p.get("site")?.trim() || "jouw website",
    klantNaam: naam,
    klantBedrijf: p.get("bedrijf")?.trim() || null,
    klantAdres: p.get("adres")?.trim() || null,
    klantEmail: p.get("email")?.trim() || "klant@voorbeeld.nl",
    maandbedragCent: bedragCent(p.get("bedrag")) || 1200,
    eenmaligCent: bedragCent(p.get("eenmalig")),
    afspraken: p.get("afspraken")?.trim() || null,
  };

  if (p.get("deel") === "pdf") {
    const pdf = await maakOpdrachtbevestigingPdf(gegevens);
    return new Response(Buffer.from(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="Voorbeeld-opdrachtbevestiging.pdf"' },
    });
  }

  const mail = bouwBetaallinkMail({
    naam,
    maandbedragCent: gegevens.maandbedragCent,
    eenmaligCent: gegevens.eenmaligCent,
    betaallink: "#voorbeeld",
  });
  const pdfUrl = (() => {
    const q = new URLSearchParams(p);
    q.set("deel", "pdf");
    return `/api/admin/abonnement-voorbeeld?${q.toString()}`;
  })();

  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Voorbeeld — mail en opdrachtbevestiging</title>
<style>body{font-family:system-ui,sans-serif;margin:0;background:#f5f5f4;color:#292524}
.balk{background:#fef3c7;border-bottom:1px solid #fcd34d;padding:10px 20px;font-size:14px;font-weight:600;color:#92400e}
.wrap{display:grid;gap:20px;padding:20px;max-width:1400px;margin:0 auto}
@media(min-width:1000px){.wrap{grid-template-columns:1fr 1fr}}
.kaart{background:#fff;border:1px solid #e7e5e4;border-radius:14px;overflow:hidden}
.kop{padding:10px 16px;border-bottom:1px solid #e7e5e4;font-size:13px;font-weight:700;color:#57534e;background:#fafaf9}
.mail{padding:20px;line-height:1.6;font-size:15px}
.mail .onderwerp{font-weight:700;margin-bottom:14px;padding-bottom:10px;border-bottom:1px dashed #d6d3d1}
iframe{width:100%;height:82vh;border:0;display:block}</style></head><body>
<div class="balk">👁 Voorbeeld — er is niets aangemaakt of verstuurd. Sluit dit tabblad en klik op de groene knop als het goed is.</div>
<div class="wrap">
<div class="kaart"><div class="kop">DE MAIL DIE DE KLANT KRIJGT (aan ${gegevens.klantEmail}, kopie naar jos@wordswap.nl)</div>
<div class="mail"><div class="onderwerp">Onderwerp: ${mail.onderwerp}</div>${mail.html}<p style="margin-top:16px;font-size:12px;color:#78716c">📎 Bijlage: Opdrachtbevestiging-WordSwap.pdf (hiernaast)</p></div></div>
<div class="kaart"><div class="kop">DE BIJLAGE: OPDRACHTBEVESTIGING</div><iframe src="${pdfUrl}" title="Opdrachtbevestiging"></iframe></div>
</div></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
