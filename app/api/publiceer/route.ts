import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { changes, sites } from "@/db/schema";
import { mergePullRequest } from "@/lib/github";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { changeId } = (await req.json()) as { changeId: number };

  const [rij] = await db
    .select({ change: changes, site: sites })
    .from(changes)
    .innerJoin(sites, eq(changes.siteId, sites.id))
    .where(and(eq(changes.id, changeId), eq(sites.clerkUserId, userId)));

  if (!rij) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  if (rij.change.status !== "concept") {
    return NextResponse.json({ error: "Al verwerkt" }, { status: 400 });
  }
  if (!rij.change.prNumber) {
    return NextResponse.json({ error: "Geen concept aanwezig" }, { status: 400 });
  }

  await mergePullRequest(rij.site.githubRepo, rij.change.prNumber);
  await db
    .update(changes)
    .set({ status: "gepubliceerd" })
    .where(eq(changes.id, rij.change.id));

  return NextResponse.json({ ok: true });
}
