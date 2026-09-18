import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { afspraken, sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { afspraakStand } from "@/lib/afspraken-db";
import { klantAdres } from "@/lib/klant-adres";
import {
  bouwAfspraakAfzegging,
  bouwAfspraakBevestiging,
  bouwAfspraakUitnodiging,
  bouwReviewVerzoek,
} from "@/lib/klant-mails";
import { ontsnap } from "@/lib/wordswap-mail";

export const dynamic = "force-dynamic";

/**
 * ⓘ-voorbeelden voor alle mails vanaf de klantpagina: precies de mail die de
 * klant krijgt, opgebouwd met dezelfde functie als het echte versturen.
 * Maakt niets aan en verstuurt niets.
 */
export async function GET(req: Request) {
  if (!(await isBeheerder())) return new Response("Geen toegang", { status: 403 });
  const q = new URL(req.url).searchParams;
  const soort = q.get("soort") ?? "";
  const siteId = Number(q.get("siteId"));
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return new Response("Site niet gevonden", { status: 404 });
  const ontvanger = await klantAdres(site);
  const bericht = q.get("bericht")?.trim() || null;

  let mail: { onderwerp: string; html: string } | null = null;
  let bijlageNoot = "";
  if (soort === "afspraak-uitnodiging") {
    const { blokken, token } = await afspraakStand(site.id);
    if (blokken.length === 0) return new Response("Zet eerst dagen klaar; dan is er iets te tonen.", { status: 400 });
    mail = bouwAfspraakUitnodiging({
      siteNaam: site.naam,
      naam: ontvanger?.naam,
      link: `https://www.wordswap.nl/afspraak/${token ?? "voorbeeld"}`,
      duurMinuten: blokken[0].duurMinuten,
      dagen: blokken,
      eigenTekst: bericht,
      zonderStandaard: q.get("zonderStandaard") === "on",
    });
  } else if (soort === "afspraak-bevestiging" || soort === "afspraak-afzegging") {
    const [afspraak] = await db
      .select()
      .from(afspraken)
      .where(and(eq(afspraken.id, Number(q.get("afspraakId"))), eq(afspraken.siteId, site.id)));
    if (!afspraak) return new Response("Afspraak niet gevonden", { status: 404 });
    mail =
      soort === "afspraak-bevestiging"
        ? bouwAfspraakBevestiging({ ...afspraak, contact: q.get("contact")?.trim() || null })
        : bouwAfspraakAfzegging({ ...afspraak, reden: q.get("reden")?.trim() || null });
    if (soort === "afspraak-bevestiging") bijlageNoot = "Bij de echte mail zit het agendabestand (afspraak.ics) als bijlage.";
  } else if (soort === "review") {
    mail = bouwReviewVerzoek({ siteNaam: site.naam, naam: ontvanger?.naam, eigenTekst: bericht });
    } else {
    return new Response("Onbekende mailsoort", { status: 400 });
  }

  const naar = ontvanger?.email ?? "nog geen adres bekend";
  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Voorbeeld: mail aan de klant</title></head>
<body style="margin:0;background:#e9ece4;font-family:-apple-system,'Segoe UI',sans-serif">
<div style="max-width:640px;margin:0 auto;padding:20px 12px">
<p style="margin:0 0 10px;font-size:13px;color:#57534e">Voorbeeld, er is niets verstuurd. De echte mail gaat naar <strong>${ontsnap(naar)}</strong>.${bijlageNoot ? ` ${ontsnap(bijlageNoot)}` : ""}</p>
<p style="margin:0 0 14px;font-size:14px;background:#fff;border-radius:10px;padding:10px 14px"><span style="color:#78716c">Onderwerp:</span> <strong>${ontsnap(mail.onderwerp)}</strong><br><span style="color:#78716c">Van:</span> Jos van WordSwap</p>
${mail.html}
</div></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
