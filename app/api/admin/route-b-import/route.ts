import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { importBestand, leesDomeinkaart, slugVan, statusVan } from "@/lib/route-b";
import { kaartDomein } from "@/lib/worker-verdeler";

export const dynamic = "force-dynamic";

/** Download van het importbestand voor de hoster (stap 1: controleregels,
 * stap 2: verwijzingen). Alleen voor een domein dat bij ons is aangemeld. */
export async function GET(req: Request) {
  await requireAdmin();
  const q = new URL(req.url).searchParams;
  const domein = kaartDomein(q.get("domein") ?? "");
  const stap = q.get("stap") === "2" ? 2 : 1;
  if (!domein) return new Response("Geen geldig domein", { status: 400 });
  if (!slugVan((await leesDomeinkaart())[domein])) return new Response("Dit domein is niet aangemeld", { status: 404 });
  const inhoud = importBestand(domein, stap, stap === 1 ? await statusVan(domein) : []);
  return new NextResponse(inhoud, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${domein}-stap${stap}.txt"`,
    },
  });
}
