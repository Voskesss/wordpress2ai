import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { CF_SUBDOMEIN } from "@/lib/cloudflare";

/** Leest de deploy-stempel van een werkversie-pagina, zodat het portaal weet
 * wanneer Cloudflare de verse versie serveert (zonder het voorbeeld te
 * hoeven herladen). */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const url = new URL(req.url);
  const host = url.searchParams.get("host") ?? "";
  const pad = url.searchParams.get("pad") ?? "/";
  // Alleen onze eigen workers-adressen of een gekoppeld klantdomein — niets anders op te vragen
  if (pad.includes("..") || !/^[a-z0-9.-]+$/.test(host)) {
    return NextResponse.json({ error: "Ongeldig" }, { status: 400 });
  }
  const isWorker = new RegExp(`^[a-z0-9-]+\\.${CF_SUBDOMEIN}\\.workers\\.dev$`).test(host);
  if (!isWorker) {
    const { db } = await import("@/db");
    const { sites } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const [site] = await db.select({ id: sites.id }).from(sites).where(eq(sites.domein, host)).limit(1);
    if (!site) return NextResponse.json({ error: "Ongeldig" }, { status: 400 });
  }
  try {
    const res = await fetch(`https://${host}${pad.startsWith("/") ? pad : `/${pad}`}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const stempel = Number(html.match(/wp2ai-stempel",stempel:(\d+)/)?.[1] ?? 0);
    return NextResponse.json({ stempel });
  } catch {
    return NextResponse.json({ stempel: 0 });
  }
}
