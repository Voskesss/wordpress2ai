import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
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

/** Concept live zetten (merge + deploy). Gedeeld door de Publiceer-knop in
 * het portaal en de Publiceren-knop in WhatsApp. */
export async function publiceerConcept(
  ruweChangeId: unknown,
  userId: string,
  isBeheerder: () => Promise<boolean>,
) {
  const changeId = ruweChangeId as number;
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
      if (!rij.site.siteSlug)
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
      // Nabewerking vóór de deploy: sitemap.xml en llms.txt kloppend maken met
      // de pagina's die er nu echt zijn. Bewust hier en niet in de chatbeurt —
      // daar wacht de eigenaar op zichtbaar resultaat, niet op administratie.
      // Best effort: dit mag een publicatie nooit tegenhouden.
      try {
        const { laadWerkmap, ruimWerkmapOp } = await import("@/lib/werkmap");
        const { werkOverzichtenBij } = await import("@/lib/site-onderhoud");
        const map = await laadWerkmap(rij.site.githubRepo);
        try {
          const onderhoud = await werkOverzichtenBij(map);
          if (onderhoud.length) {
            const { pushBestanden } = await import("@/lib/github");
            await pushBestanden(
              rij.site.githubRepo,
              onderhoud,
              "Nabewerking bij publicatie: sitemap.xml en llms.txt bijgewerkt",
            );
          }
        } finally {
          await ruimWerkmapOp(map).catch(() => {});
        }
      } catch (e) {
        console.error("Nabewerking sitemap/llms bij publicatie:", e);
      }
      await deployRepoNaarCloudflare(
        rij.site.githubRepo,
        rij.site.siteSlug,
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
    // Demo: het portaal moet vanaf nu naar de PERSOONLIJKE live-site kijken,
    // niet naar de gedeelde demo (die toont anders de oude versie, ook na verversen)
    if (rij.site.isDemo) {
      const { demoLiveWorker } = await import("@/lib/demo");
      const { CF_SUBDOMEIN } = await import("@/lib/cloudflare");
      return NextResponse.json({
        ok: true,
        liveUrl: `${demoLiveWorker(rij.site.githubRepo, userId)}.${CF_SUBDOMEIN}.workers.dev`,
      });
    }
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

/** Concept weggooien. Gedeeld door het portaal en WhatsApp. */
export async function verwerpConcept(
  changeId: number,
  userId: string,
  isBeheerder: () => Promise<boolean>,
) {

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
      { status: 410 },
    );
  }
  if (
    rij.site.isDemo
      ? rij.change.clerkUserId !== userId
      : rij.site.clerkUserId !== userId && !(await isBeheerder())
  ) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
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
      return NextResponse.json(
        { melding: "Dit concept bestaat niet meer." },
        { status: 410 },
      );
    rij.change = fresh;
    if (rij.change.status !== "concept") {
      return NextResponse.json({ error: "Al verwerkt" }, { status: 400 });
    }

    if (rij.site.isDemo && rij.change.branch.startsWith("demo-")) {
      // Demo-sandbox: branch terugzetten naar de stand vóór dit concept
      // (of helemaal weg als dit het eerste concept was) en de eigen
      // voorbeeld-site weer bijwerken.
      if (rij.change.baseSha) {
        await gh(
          `/repos/${GITHUB_ORG}/${rij.site.githubRepo}/git/refs/heads/${rij.change.branch}`,
          {
            method: "PATCH",
            body: JSON.stringify({ sha: rij.change.baseSha, force: true }),
          },
        ).catch(() => {});
      } else {
        await verwijderBranch(rij.site.githubRepo, rij.change.branch);
      }
      try {
        const { demoWorker } = await import("@/lib/demo");
        const { deployRepoNaarCloudflareRef } =
          await import("@/lib/cloudflare");
        await deployRepoNaarCloudflareRef(
          rij.site.githubRepo,
          demoWorker(rij.site.githubRepo, rij.change.clerkUserId ?? userId),
          rij.change.baseSha ?? undefined,
        );
      } catch (e) {
        console.error("Demo-terugdraai-deploy mislukt:", e);
      }
    } else {
      if (rij.change.prNumber) {
        await gh(
          `/repos/${GITHUB_ORG}/${rij.site.githubRepo}/pulls/${rij.change.prNumber}`,
          {
            method: "PATCH",
            body: JSON.stringify({ state: "closed" }),
          },
        );
      }
      await verwijderBranch(rij.site.githubRepo, rij.change.branch);
    }
    await db
      .update(changes)
      .set({ status: "afgewezen" })
      .where(eq(changes.id, rij.change.id));

    return NextResponse.json({ ok: true });
  } finally {
    await release();
  }
}
