import { currentUser } from "@clerk/nextjs/server";
import { and, eq, lt, ne, sql as sqlExpr } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { bouwJobs, changes, sites } from "@/db/schema";
import { verwijderBranch } from "@/lib/github";

export const maxDuration = 120;

/**
 * Periodiek opruimen: oude bouwopdrachten wissen, zware payloads leegmaken,
 * en achtergebleven wijzigingsbranches in klant-repo's opruimen.
 * Draait via Vercel Cron (wekelijks) of handmatig vanuit het admin.
 */
async function opruimen() {
  const nu = Date.now();
  const dertigDagen = new Date(nu - 30 * 24 * 60 * 60_000);
  const zevenDagen = new Date(nu - 7 * 24 * 60 * 60_000);

  // 1. Zware XML-payload leegmaken van afgeronde/mislukte opdrachten
  const legen = await db
    .update(bouwJobs)
    .set({ wxr: "" })
    .where(and(ne(bouwJobs.status, "wachtend"), ne(bouwJobs.wxr, "")))
    .returning({ id: bouwJobs.id });

  // 2. Bouwopdrachten ouder dan 30 dagen helemaal weg
  const gewist = await db
    .delete(bouwJobs)
    .where(lt(bouwJobs.aangemaakt, dertigDagen))
    .returning({ id: bouwJobs.id });

  // 3. Achtergebleven branches van afgehandelde wijzigingen (>7 dagen)
  const oudeChanges = await db
    .select({ change: changes, site: sites })
    .from(changes)
    .innerJoin(sites, eq(changes.siteId, sites.id))
    .where(
      and(ne(changes.status, "concept"), lt(changes.aangemaakt, zevenDagen))
    );
  let branches = 0;
  for (const rij of oudeChanges.slice(0, 100)) {
    await verwijderBranch(rij.site.githubRepo, rij.change.branch);
    branches++;
  }

  // 4. Postgres-ruimte teruggeven
  await db.execute(sqlExpr`VACUUM (ANALYZE) bouw_jobs`).catch(() => {});

  return {
    payloadsGeleegd: legen.length,
    opdrachtenGewist: gewist.length,
    branchesOpgeruimd: branches,
  };
}

export async function GET(req: Request) {
  // Vercel Cron stuurt een geheim mee; handmatig mag ook als admin
  const cronHeader = req.headers.get("authorization");
  const isCron =
    process.env.CRON_SECRET && cronHeader === `Bearer ${process.env.CRON_SECRET}`;
  if (!isCron) {
    const user = await currentUser();
    if (user?.publicMetadata?.role !== "admin") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
  }
  return NextResponse.json(await opruimen());
}
