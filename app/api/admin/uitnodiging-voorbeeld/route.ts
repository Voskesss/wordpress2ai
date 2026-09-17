import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { bouwOpleveringsMail, isVeiligeLink, standaardBekijkLink } from "@/lib/website-akkoord";
import { ontsnap } from "@/lib/wordswap-mail";

export const dynamic = "force-dynamic";

/**
 * Voorbeeld voor de admin (ⓘ bij "Koppel / nodig uit"): precies de mail die de klant krijgt,
 * met de nu ingevulde link. Maakt geen uitnodiging aan en verstuurt niets.
 */
export async function GET(req: Request) {
  if (!(await isBeheerder())) return new Response("Geen toegang", { status: 403 });
  const q = new URL(req.url).searchParams;
  const [site] = await db.select().from(sites).where(eq(sites.id, Number(q.get("siteId"))));
  if (!site) return new Response("Site niet gevonden", { status: 404 });
  const link = q.get("link")?.trim() ?? "";
  const bekijkUrl = isVeiligeLink(link) ? link : standaardBekijkLink(site);
  const email = q.get("email")?.trim() || "klant@voorbeeld.nl";
  const mail = bouwOpleveringsMail({
    siteNaam: site.naam,
    bekijkUrl: bekijkUrl || "https://voorbeeld.wordswap.workers.dev",
    // De echte inloglink (uitnodiging) ontstaat pas bij het koppelen
    inlogUrl: "https://www.wordswap.nl/portal",
  });
  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Voorbeeld: uitnodigingsmail</title></head>
<body style="margin:0;background:#e9ece4;font-family:-apple-system,'Segoe UI',sans-serif">
<div style="max-width:640px;margin:0 auto;padding:20px 12px">
<p style="margin:0 0 10px;font-size:13px;color:#57534e">Voorbeeld, er is niets verstuurd. Deze mail gaat naar <strong>${ontsnap(email)}</strong> zodra je op <em>Koppel / nodig uit</em> klikt.</p>
<p style="margin:0 0 14px;font-size:14px;background:#fff;border-radius:10px;padding:10px 14px"><span style="color:#78716c">Onderwerp:</span> <strong>${ontsnap(mail.onderwerp)}</strong><br><span style="color:#78716c">Van:</span> Jos van WordSwap</p>
${mail.html}
</div></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
