import { currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { prospectMails, prospects } from "@/db/schema";

export const maxDuration = 300;

/** Zet voor alle nieuwe prospects (met e-mailadres, zonder persoonlijke
 * versie) een gepersonaliseerd concept van mail 1 klaar. Verstuurt NIETS —
 * Jos leest na en klikt zelf op versturen. */
export async function POST() {
  const user = await currentUser();
  if (user?.publicMetadata?.role !== "admin") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const nieuwe = (
    await db.select().from(prospects).where(eq(prospects.status, "nieuw"))
  ).filter((p) => p.email?.includes("@"));

  const bestaand = await db.select().from(prospectMails).where(eq(prospectMails.nummer, 1));
  const alKlaar = new Set(bestaand.map((m) => m.prospectId));
  const teDoen = nieuwe.filter((p) => !alKlaar.has(p.id)).slice(0, 10);
  if (teDoen.length === 0) {
    return NextResponse.json({ ok: true, gemaakt: 0, melding: "Alles heeft al een concept." });
  }

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic();
  let gemaakt = 0;
  const fouten: string[] = [];

  for (const p of teDoen) {
    try {
      const resp = await client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 1200,
        system: `Je schrijft voor Jos van WordSwap (zet WordPress-sites om naar snelle sites zonder onderhoud; aanpassen doe je daarna door te typen in een chat; no cure no pay) een koude maar vriendelijke eerste acquisitie-mail aan één specifiek bedrijf.

Huisstijl: Nederlands, je-vorm, kort (5-7 korte alinea's max), over de situatie van de ontvanger (niet "wij doen"), geen brede beloftes, geen buzzwoorden, respectvol over hun site (de eigenaar is er trots op), precies één actie: één reply met "laat maar zien" is genoeg.

PERSOONLIJK betekent hier: gebruik uitsluitend de meegegeven waarnemingen over hún site (traagheid, kapotte dingen, verouderde onderdelen, het vak van het bedrijf). Verwijs concreet naar hun vak/branche als dat uit de bedrijfsnaam blijkt. VERZIN NIETS — geen waarnemingen die niet in de gegevens staan. Is er weinig bekend, hou het dan algemeen maar eerlijk ("ik heb even naar je site gekeken").

Is er een prijs meegegeven, noem die als: alleen als je de kopie wilt houden betaal je eenmalig <prijs> (no cure no pay). Geen prijs = "eenmalig, vanaf €250".

Groet en afmeldknop komen er automatisch onder — voeg die nooit toe.

Antwoordformaat, exact dit en niets eromheen:
ONDERWERP: <onderwerpregel, concreet en niet clickbaity>

<de mailtekst, witregel tussen alinea's>`,
        messages: [
          {
            role: "user",
            content: `Bedrijf: ${p.bedrijf}
Website: ${p.website}${p.branche ? `\nBranche: ${p.branche}` : ""}${p.plaats ? `\nPlaats: ${p.plaats}` : ""}${p.observatie ? `\nObservatie van Jos: ${p.observatie}` : ""}${p.kenmerken ? `\nTechnische waarnemingen van de scanner: ${p.kenmerken}` : ""}${p.laadMs ? `\nLaadtijd homepage: ${p.laadMs}ms` : ""}${p.prijs ? `\nPrijsvoorstel: ${p.prijs}` : ""}`,
          },
        ],
      });
      const uit = resp.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { text: string }).text)
        .join("")
        .trim();
      const m = uit.match(/^ONDERWERP:\s*(.+)\n+([\s\S]+)$/);
      if (!m) {
        fouten.push(p.bedrijf);
        continue;
      }
      await db
        .delete(prospectMails)
        .where(and(eq(prospectMails.prospectId, p.id), eq(prospectMails.nummer, 1)));
      await db.insert(prospectMails).values({
        prospectId: p.id,
        nummer: 1,
        onderwerp: m[1].trim(),
        tekst: m[2].trim(),
      });
      gemaakt++;
    } catch {
      fouten.push(p.bedrijf);
    }
  }

  return NextResponse.json({ ok: true, gemaakt, fouten });
}
