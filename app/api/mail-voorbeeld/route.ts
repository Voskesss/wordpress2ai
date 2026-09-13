import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { metKlantOpmaak } from "@/lib/mail";

/** Voorbeeld van de bevestigingsmail die een invuller van een formulier van
 * deze site ontvangt — met de ingestelde handtekening. Alleen voor de
 * eigenaar en beheerders. */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Niet ingelogd", { status: 401 });
  const siteId = Number(new URL(req.url).searchParams.get("siteId"));
  if (!Number.isInteger(siteId)) return new Response("Ongeldig", { status: 400 });
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site || (site.clerkUserId !== userId && !(await isBeheerder()))) {
    return new Response("Niet gevonden", { status: 404 });
  }
  const naam = site.naam.replace(/</g, "&lt;");
  const inhoud = `<p>Beste Anna de Vries,</p><p>Bedankt voor uw bericht aan ${naam}. We hebben het goed ontvangen en nemen zo snel mogelijk contact met u op.</p><hr style="border:0;border-top:1px solid #e7e5e4;margin:16px 0"><p><strong>naam:</strong> Anna de Vries</p><p><strong>email:</strong> anna@voorbeeld.nl</p><p><strong>bericht:</strong> Ik ben benieuwd naar de mogelijkheden. Kunt u mij bellen?</p>`;
  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Voorbeeldmail — ${naam}</title></head>
<body style="margin:0;background:#f5f5f4;padding:32px 16px">
<p style="max-width:560px;margin:0 auto 12px;font:13px -apple-system,'Segoe UI',sans-serif;color:#78716c">Zo ziet de bevestiging eruit die een invuller van een formulier op je site ontvangt. Afzender: <strong>${naam}</strong>.</p>
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;box-shadow:0 2px 12px rgba(0,0,0,.06)">
${metKlantOpmaak(site, inhoud)}
</div></body></html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
