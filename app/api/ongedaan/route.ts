import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { changes, messages, sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { gh, GITHUB_ORG, zetTerugNaarVersie } from "@/lib/github";

export const maxDuration = 120;

/** Draait de zojuist gepubliceerde wijziging terug (één stap terug).
 * Kan alleen zolang dit de nieuwste wijziging van de site is. */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { changeId } = (await req.json()) as { changeId: number };

  const [rij] = await db
    .select({ change: changes, site: sites })
    .from(changes)
    .innerJoin(sites, eq(changes.siteId, sites.id))
    .where(eq(changes.id, changeId));
  if (!rij) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  if (!rij.site.isDemo && rij.site.clerkUserId !== userId && !(await isBeheerder())) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
  if (rij.change.status !== "gepubliceerd") {
    return NextResponse.json({ error: "Alleen een gepubliceerde wijziging kan teruggedraaid worden" }, { status: 400 });
  }
  // Alleen de nieuwste wijziging van de site mag terug — anders draai je
  // stilletjes ook latere wijzigingen mee terug.
  const [nieuwste] = await db
    .select({ id: changes.id })
    .from(changes)
    .where(eq(changes.siteId, rij.site.id))
    .orderBy(desc(changes.id))
    .limit(1);
  if (nieuwste.id !== rij.change.id) {
    return NextResponse.json(
      { error: "verouderd", melding: "Er is inmiddels een nieuwere wijziging — draai die eerst terug, of vraag het gewoon in de chat." },
      { status: 409 }
    );
  }

  if (rij.site.isDemo) {
    // Demo: sandbox-branch terug naar de stand vóór deze wijziging en de
    // persoonlijke sites bijwerken
    const { demoWorker, demoLiveWorker } = await import("@/lib/demo");
    const { deployRepoNaarCloudflareRef } = await import("@/lib/cloudflare");
    const eigenaar = rij.change.clerkUserId ?? userId;
    if (rij.change.baseSha) {
      await gh(
        `/repos/${GITHUB_ORG}/${rij.site.githubRepo}/git/refs/heads/${rij.change.branch}`,
        { method: "PATCH", body: JSON.stringify({ sha: rij.change.baseSha, force: true }) }
      ).catch(() => {});
    }
    const doelRef = rij.change.baseSha ?? undefined;
    await Promise.all([
      deployRepoNaarCloudflareRef(rij.site.githubRepo, demoWorker(rij.site.githubRepo, eigenaar), doelRef),
      deployRepoNaarCloudflareRef(rij.site.githubRepo, demoLiveWorker(rij.site.githubRepo, eigenaar), doelRef),
    ]).catch((e) => console.error("Demo-terugdraai-deploy mislukt:", e));
  } else {
    // Echte site: main één commit terug (als nieuwe commit — geschiedenis blijft)
    const kop = (await gh(`/repos/${GITHUB_ORG}/${rij.site.githubRepo}/commits?per_page=1`)) as {
      parents: { sha: string }[];
    }[];
    const vorige = kop[0]?.parents?.[0]?.sha;
    if (!vorige) {
      return NextResponse.json({ error: "Geen eerdere versie gevonden" }, { status: 400 });
    }
    await zetTerugNaarVersie(rij.site.githubRepo, vorige);
    if (rij.site.netlifySiteId) {
      const { deployRepoNaarCloudflare } = await import("@/lib/cloudflare");
      await deployRepoNaarCloudflare(rij.site.githubRepo, rij.site.netlifySiteId).catch((e) =>
        console.error("Deploy na terugdraaien mislukt:", e)
      );
    }
  }

  await db.update(changes).set({ status: "afgewezen" }).where(eq(changes.id, rij.change.id));
  await db.insert(messages).values({
    siteId: rij.site.id,
    rol: "assistent",
    tekst: "De laatste wijziging is teruggedraaid — je site staat weer zoals ervoor.",
    clerkUserId: userId,
  });

  return NextResponse.json({ ok: true });
}
