import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { isBeheerder } from "@/lib/auth";
import { changes, sites } from "@/db/schema";
import { mergePullRequest } from "@/lib/github";
import { deployRepoNaarCloudflare } from "@/lib/cloudflare";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { changeId } = (await req.json()) as { changeId: number };

  const [rij] = await db
    .select({ change: changes, site: sites })
    .from(changes)
    .innerJoin(sites, eq(changes.siteId, sites.id))
    .where(eq(changes.id, changeId));

  if (!rij || (rij.site.clerkUserId !== userId && !(await isBeheerder()))) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
  if (rij.change.status !== "concept") {
    return NextResponse.json({ error: "Al verwerkt" }, { status: 400 });
  }
  if (!rij.change.prNumber) {
    return NextResponse.json({ error: "Geen concept aanwezig" }, { status: 400 });
  }

  await mergePullRequest(rij.site.githubRepo, rij.change.prNumber);
  if (rij.site.netlifySiteId) {
    // Live zetten: bestanden direct naar Cloudflare (gratis, geen wachtrij)
    await deployRepoNaarCloudflare(rij.site.githubRepo, rij.site.netlifySiteId).catch(
      (e) => console.error("Deploy na publiceren mislukt:", e)
    );
  }
  await db
    .update(changes)
    .set({ status: "gepubliceerd" })
    .where(eq(changes.id, rij.change.id));

  return NextResponse.json({ ok: true });
}
