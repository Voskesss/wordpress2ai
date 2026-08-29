import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { isBeheerder } from "@/lib/auth";
import { changes, sites } from "@/db/schema";
import { mergeBranchInMain, mergePullRequest, verwijderBranch } from "@/lib/github";
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

  if (!rij) {
    // Concept bestaat niet meer — bij de demo betekent dat: de uurlijkse reset
    // heeft het net gewist. Duidelijk melden i.p.v. een vage fout.
    return NextResponse.json(
      {
        error: "verlopen",
        melding:
          "Dit concept bestaat niet meer. De demo-site wordt elk uur automatisch teruggezet en dat is net gebeurd — je wijziging is daarbij gewist. Vraag hem gerust opnieuw!",
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
  if (!rij.change.prNumber && !rij.change.branch) {
    return NextResponse.json({ error: "Geen concept aanwezig" }, { status: 400 });
  }

  if (rij.site.isDemo) {
    // Demo: ieders sandbox is al "live" op de eigen voorbeeld-site — niets
    // mergen of delen; alleen de status bijwerken. De uurlijkse reset ruimt op.
    await db
      .update(changes)
      .set({ status: "gepubliceerd" })
      .where(eq(changes.id, rij.change.id));
    return NextResponse.json({ ok: true });
  }

  try {
    if (rij.change.prNumber) {
      // Oudere concepten hebben nog een pull request
      await mergePullRequest(rij.site.githubRepo, rij.change.prNumber);
    } else {
      await mergeBranchInMain(rij.site.githubRepo, rij.change.branch);
    }
  } catch (e) {
    if (rij.site.isDemo) {
      // De reset heeft de branch/PR net gesloten
      try {
        await db
          .update(changes)
          .set({ status: "afgewezen" })
          .where(eq(changes.id, rij.change.id));
      } catch {}
      return NextResponse.json(
        {
          error: "verlopen",
          melding:
            "Publiceren lukte niet meer: de demo-site is net automatisch teruggezet (dat gebeurt elk uur) en je wijziging is daarbij gewist. Vraag hem gerust opnieuw!",
        },
        { status: 410 }
      );
    }
    throw e;
  }
  await verwijderBranch(rij.site.githubRepo, rij.change.branch);
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
