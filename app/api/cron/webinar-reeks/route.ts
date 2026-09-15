import { NextResponse } from "next/server";
import { verstuurWebinarReeks } from "@/lib/webinar-reeks";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Elk uur: de webinar-reeksmails versturen die aan de beurt zijn (alleen mails die in het admin aanstaan). */
export async function GET(req: Request) {
  const geheim = process.env.CRON_SECRET;
  if (!geheim || req.headers.get("authorization") !== `Bearer ${geheim}`) {
    return new NextResponse("Geen toegang", { status: 401 });
  }
  const uitslag = await verstuurWebinarReeks();
  return NextResponse.json(uitslag);
}
