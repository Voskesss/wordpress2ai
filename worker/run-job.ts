/**
 * Bouw-worker: pakt wachtende bouwopdrachten uit de database en voert ze uit.
 * Draait in GitHub Actions (geen tijdslimiet van de webserver).
 * Start: npx tsx worker/run-job.ts
 */
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { bouwJobs } from "@/db/schema";
import { voerBouwUit } from "@/lib/bouw";

async function claimJob() {
  // Atomair claimen: één statement, zodat parallelle workers nooit
  // dezelfde opdracht pakken. Gecrashte runs (15 min stil) tellen ook mee.
  const geclaimd = await db
    .update(bouwJobs)
    .set({ status: "bezig", voortgang: "Gestart...", bijgewerkt: new Date() })
    .where(
      sql`${bouwJobs.id} = (
        SELECT id FROM bouw_jobs
        WHERE status = 'wachtend'
           OR (status = 'bezig' AND bijgewerkt < now() - interval '15 minutes')
        ORDER BY id
        LIMIT 1
      )`
    )
    .returning();
  return geclaimd[0] ?? null;
}

async function main() {
  let verwerkt = 0;
  for (;;) {
    const job = await claimJob();
    if (!job) break;
    console.log(`Job ${job.id}: ${job.siteNaam} (${job.repoNaam})`);
    try {
      const resultaat = await voerBouwUit(
        {
          xml: job.wxr,
          siteNaam: job.siteNaam,
          repoNaam: job.repoNaam,
          clerkUserId: job.clerkUserId,
        },
        async (tekst) => {
          console.log(`  ${tekst}`);
          await db
            .update(bouwJobs)
            .set({ voortgang: tekst, bijgewerkt: new Date() })
            .where(eq(bouwJobs.id, job.id));
        }
      );
      await db
        .update(bouwJobs)
        .set({
          status: "klaar",
          voortgang: "Klaar",
          resultaat,
          wxr: "", // grote payload opruimen
          bijgewerkt: new Date(),
        })
        .where(eq(bouwJobs.id, job.id));
      console.log(`Job ${job.id} klaar: ${resultaat.paginas} pagina's`);
    } catch (e) {
      console.error(`Job ${job.id} mislukt:`, e);
      await db
        .update(bouwJobs)
        .set({
          status: "fout",
          voortgang: e instanceof Error ? e.message.slice(0, 300) : "Onbekende fout",
          bijgewerkt: new Date(),
        })
        .where(eq(bouwJobs.id, job.id));
    }
    verwerkt++;
  }
  console.log(`Worker klaar; ${verwerkt} job(s) verwerkt.`);
}

main().then(() => process.exit(0));
