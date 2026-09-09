import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { changes, messages, sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { gh, GITHUB_ORG, zetTerugNaarVersie } from "@/lib/github";
import { claimOperation, operationScope } from "@/lib/operation-guards";
export const maxDuration = 300;

/** Persist the restore target BEFORE changing Git. Retrying never steps back twice. */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const changeId = body?.changeId;
  if (!Number.isSafeInteger(changeId) || changeId <= 0)
    return NextResponse.json({ error: "Ongeldig concept" }, { status: 400 });
  const [rij] = await db
    .select({ change: changes, site: sites })
    .from(changes)
    .innerJoin(sites, eq(changes.siteId, sites.id))
    .where(eq(changes.id, changeId));
  if (
    !rij ||
    (rij.site.isDemo
      ? rij.change.clerkUserId !== userId
      : rij.site.clerkUserId !== userId && !(await isBeheerder()))
  )
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  const release = await claimOperation(operationScope(rij.site, userId));
  if (!release)
    return NextResponse.json(
      { melding: "Er wordt al aan deze website gewerkt." },
      { status: 409 },
    );
  try {
    const [fresh] = await db
      .select()
      .from(changes)
      .where(eq(changes.id, changeId));
    if (!fresh)
      return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
    if (!["gepubliceerd", "herstel_mislukt"].includes(fresh.status))
      return NextResponse.json(
        { error: "Deze wijziging kan niet teruggedraaid worden." },
        { status: 409 },
      );
    const [latest] = await db
      .select({ id: changes.id })
      .from(changes)
      .where(
        and(
          eq(changes.siteId, rij.site.id),
          rij.site.isDemo ? eq(changes.clerkUserId, userId) : undefined,
        ),
      )
      .orderBy(desc(changes.id))
      .limit(1);
    if (latest?.id !== changeId)
      return NextResponse.json(
        {
          melding:
            "Er is inmiddels een nieuwere wijziging. Draai die eerst terug.",
        },
        { status: 409 },
      );
    if (!rij.site.isDemo && !rij.site.netlifySiteId)
      return NextResponse.json(
        {
          melding:
            "De publicatiebestemming ontbreekt. Neem contact op met Jos.",
        },
        { status: 503 },
      );
    let target = fresh.baseSha;
    if (!rij.site.isDemo && fresh.status === "gepubliceerd") {
      const commits = (await gh(
        `/repos/${GITHUB_ORG}/${rij.site.githubRepo}/commits?per_page=1`,
      )) as { parents: { sha: string }[] }[];
      target = commits[0]?.parents?.[0]?.sha ?? null;
      if (!target)
        return NextResponse.json(
          { error: "Geen eerdere versie gevonden" },
          { status: 400 },
        );
    }
    await db
      .update(changes)
      .set({ status: "herstel_mislukt", baseSha: target })
      .where(eq(changes.id, changeId));
    if (rij.site.isDemo) {
      const { demoWorker, demoLiveWorker } = await import("@/lib/demo");
      const { deployRepoNaarCloudflareRef } = await import("@/lib/cloudflare");
      if (target)
        await gh(
          `/repos/${GITHUB_ORG}/${rij.site.githubRepo}/git/refs/heads/${fresh.branch}`,
          {
            method: "PATCH",
            body: JSON.stringify({ sha: target, force: true }),
          },
        );
      else {
        // Point sandbox back to the baseline too, so the next edit starts there.
        const baseline = (await gh(
          `/repos/${GITHUB_ORG}/${rij.site.githubRepo}/commits/HEAD`,
        )) as { sha: string };
        target = baseline.sha;
        await db
          .update(changes)
          .set({ baseSha: target })
          .where(eq(changes.id, changeId));
        await gh(
          `/repos/${GITHUB_ORG}/${rij.site.githubRepo}/git/refs/heads/${fresh.branch}`,
          {
            method: "PATCH",
            body: JSON.stringify({ sha: target, force: true }),
          },
        );
      }
      await Promise.all([
        deployRepoNaarCloudflareRef(
          rij.site.githubRepo,
          demoWorker(rij.site.githubRepo, userId),
          target,
        ),
        deployRepoNaarCloudflareRef(
          rij.site.githubRepo,
          demoLiveWorker(rij.site.githubRepo, userId),
          target,
        ),
      ]);
    } else {
      if (!target) throw new Error("Hersteldoel ontbreekt");
      await zetTerugNaarVersie(rij.site.githubRepo, target);
      const { deployRepoNaarCloudflare } = await import("@/lib/cloudflare");
      await deployRepoNaarCloudflare(
        rij.site.githubRepo,
        rij.site.netlifySiteId!,
      );
    }
    await db
      .update(changes)
      .set({ status: "afgewezen" })
      .where(eq(changes.id, changeId));
    await db
      .insert(messages)
      .values({
        siteId: rij.site.id,
        rol: "assistent",
        tekst: "De laatste wijziging is teruggedraaid en gepubliceerd.",
        clerkUserId: userId,
      })
      .catch((e) => console.error("Herstelbericht opslaan:", e));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Herstel niet bevestigd:", e);
    return NextResponse.json(
      {
        melding:
          "Herstel is nog niet afgerond. Je hersteldoel is bewaard; probeer opnieuw of neem contact op met Jos.",
      },
      { status: 503 },
    );
  } finally {
    await release();
  }
}
