import { NextResponse } from "next/server";
import { werkLeadsBij } from "@/lib/leads-bijwerken";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Elk half uur: leadsbak bijwerken — zelfde ronde als de knop in /admin/leads. */
export async function GET(req: Request) {
  const geheim = process.env.CRON_SECRET;
  if (!geheim || req.headers.get("authorization") !== `Bearer ${geheim}`) {
    return new NextResponse("Geen toegang", { status: 401 });
  }
  const verslag = await werkLeadsBij();
  return NextResponse.json({ ok: true, verslag });
}
