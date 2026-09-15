import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { formulierInzendingen, webinarMails } from "@/db/schema";
import { afmeldToken } from "@/lib/webinar-reeks";

export const dynamic = "force-dynamic";

function pagina(kop: string, tekst: string, status = 200) {
  return new Response(
    `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${kop}</title><style>body{font-family:system-ui,sans-serif;background:#fafbf7;color:#243a31;display:grid;place-items:center;min-height:100vh;margin:0}main{max-width:32rem;padding:2rem;text-align:center}h1{font-size:1.6rem}a{color:#245747}</style></head><body><main><h1>${kop}</h1><p>${tekst}</p><p><a href="https://wordswap.nl">Naar wordswap.nl</a></p></main></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

/** Afmelden voor de voorbereidingsmails; de inschrijving voor het webinar blijft staan. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("i"));
  const token = url.searchParams.get("t") ?? "";
  const verwacht = Number.isInteger(id) ? afmeldToken(id) : null;
  const geldig =
    verwacht !== null && token.length === verwacht.length && timingSafeEqual(Buffer.from(token), Buffer.from(verwacht));
  if (!geldig) return pagina("Deze link werkt niet", "Mail even naar jos@wordswap.nl, dan meld ik je handmatig af.", 400);

  const [inschrijving] = await db.select().from(formulierInzendingen).where(eq(formulierInzendingen.id, id));
  if (!inschrijving) return pagina("Je bent afgemeld", "Je krijgt geen voorbereidingsmails meer.");
  const webinarId = Number((inschrijving.velden as Record<string, string>).webinar_id) || 0;
  await db.insert(webinarMails).values({ inschrijvingId: id, webinarId, soort: "afgemeld" }).onConflictDoNothing();
  return pagina(
    "Je bent afgemeld",
    "Je krijgt geen voorbereidingsmails meer. Je plek in het webinar blijft gewoon staan, en de deelnamelink krijg je nog wel.",
  );
}
