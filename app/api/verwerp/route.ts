import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { isBeheerder } from "@/lib/auth";
import { changes, sites } from "@/db/schema";
import { gh, GITHUB_ORG, verwijderBranch } from "@/lib/github";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { changeId } = (await req.json()) as { changeId: number };

  const [rij] = await db
    .select({ change: changes, site: sites })
    .from(changes)
    .innerJoin(sites, eq(changes.siteId, sites.id))
    .where(eq(changes.id, changeId));

  if (!rij) {
    return NextResponse.json(
      {
        error: "verlopen",
        melding:
          "Dit concept bestaat niet meer — de demo-site is net automatisch teruggezet. Er valt niets meer te verwijderen.",
      },
      { status: 410 }
    );
  }
  if (!rij.site.isDemo && rij.site.clerkUserId !== userId && !(await isBeheerder())) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
  if (rij.change.status !== "concept") {
    return NextResponse.json({ error: "Al verwerkt" }, { status: 400 });
  }

  if (rij.change.prNumber) {
    await gh(`/repos/${GITHUB_ORG}/${rij.site.githubRepo}/pulls/${rij.change.prNumber}`, {
      method: "PATCH",
      body: JSON.stringify({ state: "closed" }),
    });
  }
  await verwijderBranch(rij.site.githubRepo, rij.change.branch);
  await db
    .update(changes)
    .set({ status: "afgewezen" })
    .where(eq(changes.id, rij.change.id));

  return NextResponse.json({ ok: true });
}
