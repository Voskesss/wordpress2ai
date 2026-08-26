import { NextResponse } from "next/server";
import { db } from "@/db";
import { formulierInzendingen } from "@/db/schema";

export async function POST(req: Request) {
  let velden: Record<string, string> = {};
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("form")) {
    const form = await req.formData();
    for (const [k, v] of form.entries()) velden[k] = String(v).slice(0, 2000);
  } else {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }

  const siteRepo = (velden._site ?? "").slice(0, 100);
  const honeypot = velden._extra ?? "";
  const formulier =
    (velden._formulier ?? "contact")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "contact";
  delete velden._site;
  delete velden._extra;
  delete velden._formulier;

  // Honeypot gevuld = bot: stilletjes accepteren zonder opslaan
  if (siteRepo && !honeypot && Object.keys(velden).length > 0) {
    await db
      .insert(formulierInzendingen)
      .values({ siteRepo, formulier, velden })
      .catch(() => {});
  }

  return new Response(
    `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Bedankt voor uw bericht</title><style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#fafaf9;color:#292524}main{text-align:center;padding:2rem}h1{font-size:1.6rem}a{color:#6d28d9}</style></head><body><main><h1>Bedankt voor uw bericht!</h1><p>We hebben uw bericht goed ontvangen en nemen zo snel mogelijk contact met u op.</p><p><a href="javascript:history.back()">← Terug naar de website</a></p></main></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
