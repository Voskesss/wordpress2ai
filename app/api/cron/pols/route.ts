import { NextResponse } from "next/server";
import { draaiPols } from "@/lib/gezondheid";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Elk kwartier: de vitale onderdelen aanraken (zie draaiPols in
 * lib/gezondheid). Alleen overgangen leveren een melding op; de volledige
 * ronde blijft bij de dagelijkse gezondheids-cron. */
export async function GET(req: Request) {
  const geheim = process.env.CRON_SECRET;
  if (!geheim || req.headers.get("authorization") !== `Bearer ${geheim}`) {
    return new NextResponse("Nee", { status: 401 });
  }
  const uitslag = await draaiPols();
  // Tikje naar de externe wachter: blijft dit uit, dan mailt díe ons.
  // Zo is er ook een melding als Vercel of deze cron zelf stilvalt.
  const ping = process.env.HEALTHCHECKS_PING_URL;
  if (ping) {
    await fetch(ping, { method: "POST", signal: AbortSignal.timeout(5000) }).catch((e) =>
      console.error("Pols: tikje naar de externe wachter mislukt:", e),
    );
  }
  return NextResponse.json({ ok: true, ...uitslag });
}
