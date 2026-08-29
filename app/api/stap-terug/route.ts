import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { changes, sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { gh, GITHUB_ORG } from "@/lib/github";
import { deployRepoNaarCloudflareRef } from "@/lib/cloudflare";

export const maxDuration = 120;

/** Draait binnen een openstaand concept de laatste stap terug (vóór publiceren).
 * Elke chat- of zelf-aanpassing is één commit op de conceptbranch; we zetten de
 * branch één commit terug en werken de werkversie bij. */
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
  if (rij.change.status !== "concept") {
    return NextResponse.json({ error: "Alleen bij een openstaand concept" }, { status: 400 });
  }

  const repo = rij.site.githubRepo;
  const branch = rij.change.branch;

  // Hoeveel stappen staan er op deze branch? (t.o.v. main)
  const vergelijk = (await gh(
    `/repos/${GITHUB_ORG}/${repo}/compare/main...${encodeURIComponent(branch)}`
  )) as { ahead_by: number };
  if (!vergelijk || vergelijk.ahead_by === 0) {
    return NextResponse.json(
      { error: "leeg", melding: "Er valt niets meer terug te draaien in dit concept — gebruik Verwijder om het hele concept weg te doen." },
      { status: 400 }
    );
  }

  // Branch één commit terug
  const kop = (await gh(
    `/repos/${GITHUB_ORG}/${repo}/commits/${encodeURIComponent(branch)}`
  )) as { sha: string; parents: { sha: string }[] };
  // Demo: nooit verder terug dan het begin van dit concept (eerder gepubliceerd
  // werk op de sandbox-branch blijft staan)
  if (rij.site.isDemo && rij.change.baseSha && kop.sha === rij.change.baseSha) {
    return NextResponse.json(
      { error: "leeg", melding: "Je bent terug bij het begin van dit concept — gebruik Verwijder om het hele concept weg te doen." },
      { status: 400 }
    );
  }
  const vorige = kop.parents?.[0]?.sha;
  if (!vorige) {
    return NextResponse.json({ error: "Geen eerdere stap gevonden" }, { status: 400 });
  }
  await gh(`/repos/${GITHUB_ORG}/${repo}/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: vorige, force: true }),
  });

  // Werkversie bijwerken naar de teruggedraaide stand
  let wvNaam: string | null = null;
  if (rij.site.isDemo) {
    const { demoWorker } = await import("@/lib/demo");
    wvNaam = demoWorker(repo, rij.change.clerkUserId ?? userId);
  } else if (rij.site.netlifySiteId) {
    wvNaam = `wv-${rij.site.netlifySiteId}`;
  }
  if (wvNaam) {
    await deployRepoNaarCloudflareRef(repo, wvNaam, vorige).catch((e) =>
      console.error("Werkversie-deploy na stap terug mislukt:", e)
    );
  }

  const overgebleven = vergelijk.ahead_by - 1;
  await db
    .update(changes)
    .set({
      promptTekst: `${rij.change.promptTekst} → (laatste stap teruggedraaid)`.slice(0, 500),
    })
    .where(eq(changes.id, rij.change.id));

  return NextResponse.json({ ok: true, overgebleven });
}
