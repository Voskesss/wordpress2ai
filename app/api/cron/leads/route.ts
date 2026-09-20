import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { leadPost, leads, verzondenMails } from "@/db/schema";
import { LEAD_STATUSSEN } from "@/lib/leads";
import { maakStap, volgendeStap } from "@/lib/lead-opvolging";
import { haalLeadPost, soverinIngesteld, type PostItem } from "@/lib/soverin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const OPEN_STATUSSEN = LEAD_STATUSSEN.filter((s) => s.open).map((s) => s.waarde);
const BACKFILL_PER_KEER = 10;
const SYNC_DAGEN_TERUG = 5;

function berichtSleutel(item: PostItem): string {
  return item.messageId ?? `${item.bron}-${item.datum.toISOString()}-${(item.onderwerp ?? "").slice(0, 60)}`;
}

/**
 * Elk half uur: leadpost uit Soverin bijwerken (reacties + eigen verzonden mails),
 * statussen meebewegen en opvolg-concepten klaarzetten. Er wordt hier nooit
 * gemaild — concepten wachten in /admin/leads op Jos.
 */
export async function GET(req: Request) {
  const geheim = process.env.CRON_SECRET;
  if (!geheim || req.headers.get("authorization") !== `Bearer ${geheim}`) {
    return new NextResponse("Geen toegang", { status: 401 });
  }

  const open = await db.select().from(leads).where(inArray(leads.status, OPEN_STATUSSEN));
  const metMail = open.filter((l) => l.email?.includes("@"));
  const verslag: string[] = [];

  // 1. Soverin: nieuwe post ophalen (en voor nieuwe leads eenmalig de hele geschiedenis)
  if (soverinIngesteld() && metMail.length > 0) {
    const terugblik = metMail.filter((l) => !l.soverinDoorzocht).slice(0, BACKFILL_PER_KEER);
    const bijhouden = metMail.filter((l) => !terugblik.includes(l));
    const sinds = new Date(Date.now() - SYNC_DAGEN_TERUG * 86_400_000);
    try {
      const items = [
        ...(await haalLeadPost(terugblik.map((l) => l.email!), null)),
        ...(await haalLeadPost(bijhouden.map((l) => l.email!), sinds)),
      ];
      const leadPerMail = new Map(metMail.map((l) => [l.email!.trim().toLowerCase(), l.id]));
      let nieuw = 0;
      for (const item of items) {
        const leadId = leadPerMail.get(item.email);
        if (!leadId) continue;
        const klaar = await db
          .insert(leadPost)
          .values({
            leadId,
            richting: item.richting,
            bron: item.bron,
            onderwerp: item.onderwerp,
            fragment: item.fragment,
            messageId: berichtSleutel(item),
            datum: item.datum,
          })
          .onConflictDoNothing()
          .returning({ id: leadPost.id });
        nieuw += klaar.length;
      }
      if (terugblik.length > 0) {
        await db
          .update(leads)
          .set({ soverinDoorzocht: true })
          .where(inArray(leads.id, terugblik.map((l) => l.id)));
      }
      verslag.push(`Soverin: ${nieuw} nieuwe postregels (terugblik voor ${terugblik.length} leads)`);
    } catch (e) {
      verslag.push(`Soverin overgeslagen: ${String(e).slice(0, 200)}`);
    }
  } else {
    verslag.push(soverinIngesteld() ? "Geen open leads met e-mail" : "Soverin niet ingesteld (SOVERIN_IMAP_USER/PASSWORD)");
  }

  // 2. Tijdlijn per lead samenstellen (systeem-mails + Soverin-post)
  const alleVerzonden = await db.select({ aan: verzondenMails.aan, verzonden: verzondenMails.verzonden }).from(verzondenMails);
  const post = metMail.length > 0 ? await db.select().from(leadPost).where(inArray(leadPost.leadId, metMail.map((l) => l.id))) : [];
  const nu = new Date();

  for (const lead of metMail) {
    const adres = lead.email!.trim().toLowerCase();
    const eigen = post.filter((p) => p.leadId === lead.id);
    const uitMomenten = [
      ...alleVerzonden.filter((m) => m.aan.trim().toLowerCase() === adres).map((m) => m.verzonden),
      ...eigen.filter((p) => p.richting === "uit").map((p) => p.datum),
    ].sort((a, b) => a.getTime() - b.getTime());
    const heeftReactie = eigen.some((p) => p.richting === "in");

    // Reactie binnen → in gesprek, klaarstaand concept vervalt
    if (heeftReactie && (lead.status === "nieuw" || lead.status === "wacht_op_reactie")) {
      await db
        .update(leads)
        .set({ status: "in_gesprek", conceptSoort: null, conceptOnderwerp: null, conceptTekst: null, conceptKlaarOp: null, bijgewerkt: nu })
        .where(eq(leads.id, lead.id));
      verslag.push(`${lead.naam}: reactie gezien → in gesprek`);
      continue;
    }

    // Eerste mail is de deur uit → wacht op reactie
    if (lead.status === "nieuw" && uitMomenten.length > 0) {
      await db.update(leads).set({ status: "wacht_op_reactie", bijgewerkt: nu }).where(eq(leads.id, lead.id));
      lead.status = "wacht_op_reactie";
      verslag.push(`${lead.naam}: mail verstuurd → wacht op reactie`);
    }

    // 3. Cadans: volgende stap klaarzetten (nooit versturen)
    if (lead.status !== "wacht_op_reactie") continue;
    const stap = volgendeStap({
      aantalUit: uitMomenten.length,
      laatsteUit: uitMomenten.at(-1) ?? null,
      heeftReactie,
      nu,
    });
    if (!stap || lead.conceptSoort === stap) continue; // zelfde soort = staat al klaar of bewust overgeslagen
    const concept = maakStap(stap, lead.naam, lead.website);
    await db
      .update(leads)
      .set({ conceptSoort: stap, conceptOnderwerp: concept.onderwerp, conceptTekst: concept.tekst, conceptKlaarOp: nu, bijgewerkt: nu })
      .where(eq(leads.id, lead.id));
    verslag.push(`${lead.naam}: ${stap} klaargezet`);
  }

  return NextResponse.json({ ok: true, verslag });
}
