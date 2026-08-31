import { currentUser } from "@clerk/nextjs/server";
import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { changes, messages, sites } from "@/db/schema";
import { gh, GITHUB_ORG, pushBestanden } from "@/lib/github";
import { deployMapNaarCloudflare, verwijderDemoWorkers } from "@/lib/cloudflare";
import { laadWerkmap, ruimWerkmapOp } from "@/lib/werkmap";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export const maxDuration = 300;

async function alleBestanden(dir: string, basis = dir): Promise<string[]> {
  const items = await readdir(dir, { withFileTypes: true });
  const paden: string[] = [];
  for (const item of items) {
    const vol = path.join(dir, item.name);
    if (item.isDirectory()) paden.push(...(await alleBestanden(vol, basis)));
    else paden.push(path.relative(basis, vol));
  }
  return paden;
}

/** Zet alle demo-sites terug naar hun sjabloon (elk uur via cron). */
async function reset() {
  const demoSites = await db.select().from(sites).where(eq(sites.isDemo, true));
  const resultaten: string[] = [];
  for (const site of demoSites) {
    let werkmap: string | null = null;
    try {
      // 1. Sjabloon terugzetten op main
      werkmap = await laadWerkmap(site.githubRepo, "sjabloon");
      const bestanden = await Promise.all(
        (await alleBestanden(werkmap)).map(async (pad) => ({
          pad,
          inhoud: await readFile(path.join(werkmap!, pad)),
        }))
      );
      await pushBestanden(site.githubRepo, bestanden, "Demo-reset (uurlijks)");

      // 2. Open PR's/branches sluiten en opruimen
      const prs = (await gh(
        `/repos/${GITHUB_ORG}/${site.githubRepo}/pulls?state=open`
      )) as { number: number; head: { ref: string } }[];
      for (const pr of prs) {
        await gh(`/repos/${GITHUB_ORG}/${site.githubRepo}/pulls/${pr.number}`, {
          method: "PATCH",
          body: JSON.stringify({ state: "closed" }),
        }).catch(() => {});
        await gh(
          `/repos/${GITHUB_ORG}/${site.githubRepo}/git/refs/heads/${pr.head.ref}`,
          { method: "DELETE" }
        ).catch(() => {});
      }

      // 2b. Persoonlijke sandbox-branches (demo-…) en wijzigings-branches wissen —
      // maar een sandbox waar het afgelopen uur nog aan gewerkt is laten we met
      // rust, anders verdwijnt iemands werk midden in een sessie.
      const refs = (await gh(
        `/repos/${GITHUB_ORG}/${site.githubRepo}/git/matching-refs/heads/`
      ).catch(() => [])) as { ref: string }[];
      const actieveHashes = new Set<string>();
      for (const r of refs) {
        const naam = r.ref.replace("refs/heads/", "");
        if (!naam.startsWith("demo-") && !naam.startsWith("wijziging-")) continue;
        let versGebruikt = false;
        if (naam.startsWith("demo-")) {
          try {
            const kop = (await gh(
              `/repos/${GITHUB_ORG}/${site.githubRepo}/commits/${naam}`
            )) as { commit: { author: { date: string } } };
            versGebruikt =
              Date.now() - new Date(kop.commit.author.date).getTime() < 65 * 60 * 1000;
          } catch {}
        }
        if (versGebruikt) {
          actieveHashes.add(naam.replace("demo-", ""));
          continue;
        }
        await gh(`/repos/${GITHUB_ORG}/${site.githubRepo}/git/refs/heads/${naam}`, {
          method: "DELETE",
        }).catch(() => {});
      }

      // 2c. Persoonlijke voorbeeld-workers (wvd-/wvl-…) verwijderen, behalve van
      // sandboxes die net nog gebruikt zijn
      await verwijderDemoWorkers(site.githubRepo, actieveHashes).catch((e) =>
        console.error("Demo-workers opruimen mislukt:", e)
      );

      // 3. Chatgeschiedenis en wijzigingen wissen (leads blijven in Clerk)
      const siteChanges = await db
        .select({ id: changes.id })
        .from(changes)
        .where(eq(changes.siteId, site.id));
      if (siteChanges.length > 0) {
        await db.delete(changes).where(
          inArray(changes.id, siteChanges.map((c) => c.id))
        );
      }
      await db.delete(messages).where(eq(messages.siteId, site.id));

      // 4. Live én werkversie opnieuw neerzetten
      await deployMapNaarCloudflare(werkmap, site.githubRepo);
      await deployMapNaarCloudflare(werkmap, `wv-${site.githubRepo}`);
      resultaten.push(`${site.githubRepo}: gereset (${bestanden.length} bestanden)`);
    } catch (e) {
      resultaten.push(`${site.githubRepo}: FOUT ${e instanceof Error ? e.message : e}`);
    } finally {
      if (werkmap) await ruimWerkmapOp(werkmap).catch(() => {});
    }
  }
  return resultaten;
}

export async function GET(req: Request) {
  const cronHeader = req.headers.get("authorization");
  const isCron =
    process.env.CRON_SECRET && cronHeader === `Bearer ${process.env.CRON_SECRET}`;
  if (!isCron) {
    const user = await currentUser();
    if (user?.publicMetadata?.role !== "admin") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
  }
  return NextResponse.json({ resultaten: await reset() });
}
