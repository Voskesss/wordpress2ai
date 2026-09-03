import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { changes, sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { laadWerkmap, ruimWerkmapOp } from "@/lib/werkmap";

export const maxDuration = 60;

/** Voorverwarmen: haalt de site alvast op zodra het portaal opent, zodat de
 * eerste chatvraag niet meer op de download hoeft te wachten. (Warmt ook de
 * archief-cache aan de GitHub-kant op, wat elke server daarna helpt.) */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const { siteId } = (await req.json()) as { siteId: number };
  const [site] = await db.select().from(sites).where(eq(sites.id, Number(siteId)));
  if (!site || (!site.isDemo && site.clerkUserId !== userId && !(await isBeheerder()))) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
  const [openConcept] = await db
    .select()
    .from(changes)
    .where(
      site.isDemo
        ? and(eq(changes.siteId, site.id), eq(changes.status, "concept"), eq(changes.clerkUserId, userId))
        : and(eq(changes.siteId, site.id), eq(changes.status, "concept"))
    )
    .orderBy(desc(changes.id))
    .limit(1);
  const { demoBranch } = await import("@/lib/demo");
  const ref = openConcept?.branch ?? (site.isDemo ? demoBranch(userId) : undefined);
  try {
    const werkmap = await laadWerkmap(site.githubRepo, ref).catch(() =>
      laadWerkmap(site.githubRepo)
    );
    await ruimWerkmapOp(werkmap).catch(() => {});
  } catch {
    // voorverwarmen is nooit reden voor een foutmelding
  }
  return NextResponse.json({ ok: true });
}
