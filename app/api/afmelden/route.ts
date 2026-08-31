import { eq } from "drizzle-orm";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { afmeldToken } from "@/lib/outreach";

/** Afmeldlink uit outreach-mails: zet de prospect definitief op niet-mailen. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("p"));
  const token = url.searchParams.get("t") ?? "";
  const geldig = Number.isInteger(id) && token === afmeldToken(id);
  if (geldig) {
    await db
      .update(prospects)
      .set({ status: "niet_mailen" })
      .where(eq(prospects.id, id))
      .catch(() => {});
  }
  return new Response(
    `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Afgemeld</title><style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#fafaf9;color:#292524}main{text-align:center;padding:2rem;max-width:26rem}</style></head><body><main><h1>${geldig ? "Je bent afgemeld" : "Deze link klopt niet helemaal"}</h1><p>${geldig ? "Je ontvangt geen mail meer van ons. Excuus voor het storen, en veel succes met de zaak!" : "Neem gerust contact op via wordswap.nl als je je wilt afmelden — dan regelen we het direct."}</p></main></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
