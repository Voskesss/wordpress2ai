import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { afspraken, leads, sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { afspraakStand, afspraakVan, type Eigenaar } from "@/lib/afspraken-db";
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
 * ⓘ-voorbeelden voor alle mails vanaf de klantpagina en de leadkaart: precies
 * de mail die de ontvanger krijgt, opgebouwd met dezelfde functie als het echte
 * versturen. Maakt niets aan en verstuurt niets.
 *
 * Bij een lead (leadId) kunnen alleen de afspraakmails; de rest hoort bij een
 * klant met een site.
 */
export async function GET(req: Request) {
  if (!(await isBeheerder())) return new Response("Geen toegang", { status: 403 });
  const q = new URL(req.url).searchParams;
  const soort = q.get("soort") ?? "";
  const leadId = Number(q.get("leadId"));
  const isLead = Number.isInteger(leadId) && leadId > 0;

  // Wie krijgt de mail: een klant (site) of een potentiële klant (lead)
  let site: typeof sites.$inferSelect | undefined;
  let eigenaar: Eigenaar;
  let naamVanIets: string;
  let ontvanger: { email: string; naam: string } | null;
  if (isLead) {
    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
    if (!lead) return new Response("Lead niet gevonden", { status: 404 });
    eigenaar = { soort: "lead", id: lead.id };
    naamVanIets = lead.naam;
    ontvanger = lead.email ? { email: lead.email, naam: lead.naam } : null;
  } else {
    [site] = await db.select().from(sites).where(eq(sites.id, Number(q.get("siteId"))));
    if (!site) return new Response("Site niet gevonden", { status: 404 });
    eigenaar = { soort: "site", id: site.id };
    naamVanIets = site.naam;
    ontvanger = await klantAdres(site);
  }
  const bericht = q.get("bericht")?.trim() || null;
  const onderwerp = q.get("onderwerp")?.trim() || null;

  let mail: { onderwerp: string; html: string } | null = null;
  let bijlageNoot = "";
  if (soort === "afspraak-uitnodiging") {
    const { blokken, token } = await afspraakStand(eigenaar);
    if (blokken.length === 0) return new Response("Zet eerst dagen klaar; dan is er iets te tonen.", { status: 400 });
    mail = bouwAfspraakUitnodiging({
      siteNaam: naamVanIets,
      naam: ontvanger?.naam,
      link: `https://www.wordswap.nl/afspraak/${token ?? "voorbeeld"}`,
      duurMinuten: blokken[0].duurMinuten,
      dagen: blokken,
      eigenTekst: bericht,
      zonderStandaard: q.get("zonderStandaard") === "on",
      soort: isLead ? "lead" : "klant",
      onderwerp,
    });
  } else if (soort === "afspraak-bevestiging" || soort === "afspraak-afzegging") {
    const [afspraak] = await db
      .select()
      .from(afspraken)
      .where(and(eq(afspraken.id, Number(q.get("afspraakId"))), afspraakVan(eigenaar)));
    if (!afspraak) return new Response("Afspraak niet gevonden", { status: 404 });
    mail =
      soort === "afspraak-bevestiging"
        ? bouwAfspraakBevestiging({
            ...afspraak,
            contact: q.get("contact")?.trim() || null,
            eigenTekst: bericht,
            eigenOnderwerp: onderwerp,
          })
        : bouwAfspraakAfzegging({ ...afspraak, reden: q.get("reden")?.trim() || null });
    if (soort === "afspraak-bevestiging") bijlageNoot = "Bij de echte mail zit het agendabestand (afspraak.ics) als bijlage.";
  } else if (!site) {
    return new Response("Dit voorbeeld bestaat alleen voor klanten.", { status: 400 });
  } else if (soort === "inloguitleg") {
    const { bouwToegangsMail, standaardBekijkLink } = await import("@/lib/website-akkoord");
    const portaal = `https://www.wordswap.nl/portal?site=${site.id}`;
    mail = bouwToegangsMail({
      siteNaam: site.naam,
      bekijkUrl: standaardBekijkLink(site),
      inlogUrl: `https://www.wordswap.nl/sign-in?redirect_url=${encodeURIComponent(portaal)}`,
      naam: ontvanger?.naam,
      domein: site.domein,
    });
  } else if (soort === "ontwerp-klaar") {
    const { bouwOntwerpKlaar } = await import("@/lib/klant-mails");
    mail = bouwOntwerpKlaar({
      siteNaam: site.naam,
      naam: ontvanger?.naam,
      ontwerpUrl: site.ontwerpSlug ? `https://${site.ontwerpSlug}.wordswap.workers.dev` : "https://voorbeeld-adres-volgt.wordswap.workers.dev",
      eigenTekst: bericht,
    });
    bijlageNoot = "Jouw eigen opmerking uit het tekstvak komt in de echte mail bovenaan te staan.";
  } else if (soort === "review") {
    mail = bouwReviewVerzoek({ siteNaam: site.naam, naam: ontvanger?.naam, eigenTekst: bericht });
    } else {
    return new Response("Onbekende mailsoort", { status: 400 });
  }

  const naar = ontvanger?.email ?? "nog geen adres bekend";
  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Voorbeeld van de mail</title></head>
<body style="margin:0;background:#e9ece4;font-family:-apple-system,'Segoe UI',sans-serif">
<div style="max-width:640px;margin:0 auto;padding:20px 12px">
<p style="margin:0 0 10px;font-size:13px;color:#57534e">Voorbeeld, er is niets verstuurd. De echte mail gaat naar <strong>${ontsnap(naar)}</strong>.${bijlageNoot ? ` ${ontsnap(bijlageNoot)}` : ""}</p>
<p style="margin:0 0 14px;font-size:14px;background:#fff;border-radius:10px;padding:10px 14px"><span style="color:#78716c">Onderwerp:</span> <strong>${ontsnap(mail.onderwerp)}</strong><br><span style="color:#78716c">Van:</span> Jos van WordSwap</p>
${mail.html}
</div></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
