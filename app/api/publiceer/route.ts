import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { isBeheerder } from "@/lib/auth";
import { changes, sites } from "@/db/schema";
import {
  gh,
  GITHUB_ORG,
  mergeBranchInMain,
  mergePullRequest,
  verwijderBranch,
} from "@/lib/github";
import {
  deployRepoNaarCloudflare,
  deployRepoNaarCloudflareRef,
} from "@/lib/cloudflare";
import { claimOperation, operationScope } from "@/lib/operation-guards";
export const maxDuration = 300;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const changeId = body?.changeId;
  if (!Number.isSafeInteger(changeId) || changeId <= 0)
    return NextResponse.json({ error: "Ongeldig concept" }, { status: 400 });
  const read = async () =>
    (
      await db
        .select({ change: changes, site: sites })
        .from(changes)
        .innerJoin(sites, eq(changes.siteId, sites.id))
        .where(eq(changes.id, changeId))
    )[0];
  const initial = await read();
  if (!initial)
    return NextResponse.json(
      { melding: "Dit concept bestaat niet meer." },
      { status: 410 },
    );
  if (
    initial.site.isDemo
      ? initial.change.clerkUserId !== userId
      : initial.site.clerkUserId !== userId && !(await isBeheerder())
  )
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  const release = await claimOperation(operationScope(initial.site, userId));
  if (!release)
    return NextResponse.json(
      {
        melding:
          "Er wordt al aan deze website gewerkt. Probeer het over een moment opnieuw.",
      },
      { status: 409 },
    );
  try {
    // Re-read after acquiring the shared edit/publish lock.
    const rij = await read();
    if (!rij)
      return NextResponse.json(
        { melding: "Dit concept bestaat niet meer." },
        { status: 410 },
      );
    if (rij.change.status === "gepubliceerd")
      return NextResponse.json({ ok: true });
    if (!["concept", "publicatie_mislukt"].includes(rij.change.status))
      return NextResponse.json({ error: "Al verwerkt" }, { status: 409 });
    if (!rij.change.branch)
      return NextResponse.json(
        { error: "Geen concept aanwezig" },
        { status: 400 },
      );
    if (
      ["gepauzeerd", "opgezegd"].includes(rij.site.status) &&
      !(await isBeheerder())
    )
      return NextResponse.json({ error: "Site niet actief" }, { status: 403 });
    if (rij.site.isDemo) {
      const { demoLiveWorker } = await import("@/lib/demo");
      await deployRepoNaarCloudflareRef(
        rij.site.githubRepo,
        demoLiveWorker(rij.site.githubRepo, userId),
        rij.change.branch,
      );
    } else {
      if (!rij.site.netlifySiteId)
        return NextResponse.json(
          {
            melding:
              "De publicatiebestemming ontbreekt. Neem contact op met Jos; je concept blijft bewaard.",
          },
          { status: 503 },
        );
      if (rij.change.status === "concept") {
        if (rij.change.prNumber) {
          const pr = (await gh(
            `/repos/${GITHUB_ORG}/${rij.site.githubRepo}/pulls/${rij.change.prNumber}`,
          )) as { merged?: boolean };
          if (!pr.merged)
            await mergePullRequest(rij.site.githubRepo, rij.change.prNumber);
        } else await mergeBranchInMain(rij.site.githubRepo, rij.change.branch);
        // Durable checkpoint: retry deployment without merging/re-editing this concept.
        await db
          .update(changes)
          .set({ status: "publicatie_mislukt" })
          .where(eq(changes.id, changeId));
      }
      await deployRepoNaarCloudflare(
        rij.site.githubRepo,
        rij.site.netlifySiteId,
      );
    }
    await db
      .update(changes)
      .set({ status: "gepubliceerd" })
      .where(eq(changes.id, changeId));
    // Cleanup cannot turn a successful publication into an apparent failure.
    if (!rij.site.isDemo)
      await verwijderBranch(rij.site.githubRepo, rij.change.branch).catch((e) =>
        console.error("Branch opruimen na publicatie:", e),
      );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Publicatie niet bevestigd:", e);
    return NextResponse.json(
      {
        melding:
          "Publiceren is niet bevestigd. Je wijziging blijft bewaard. Klik opnieuw op Publiceer om het af te ronden; blijft dit gebeuren, neem contact op met Jos.",
      },
      { status: 503 },
    );
  } finally {
    await release().catch((e) => console.error("Publicatieslot vrijgeven:", e));
  }
}
