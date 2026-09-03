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
  // Alleen onze eigen workers-domeinen — niets anders op te vragen
  if (!new RegExp(`^[a-z0-9-]+\\.${CF_SUBDOMEIN}\\.workers\\.dev$`).test(host) || pad.includes("..")) {
    return NextResponse.json({ error: "Ongeldig" }, { status: 400 });
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
