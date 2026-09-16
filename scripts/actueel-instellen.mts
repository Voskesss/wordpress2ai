/**
 * Nieuwsfeed aan een site koppelen (en de kolom aanmaken als die nog ontbreekt):
 *
 *   npx tsx --env-file=.env.local scripts/actueel-instellen.mts <repo-naam> <feed-url>
 *   npx tsx --env-file=.env.local scripts/actueel-instellen.mts <repo-naam> --uit
 *
 * Zonder argumenten toont het welke sites nu een feed hebben.
 * De ALTER is niet-destructief (voegt alleen een lege kolom toe).
 */
import { eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { sites } from '../db/schema';

await db.execute(sql`ALTER TABLE sites ADD COLUMN IF NOT EXISTS nieuws_feed_url text`);

const repo = process.argv[2];
const feed = process.argv[3];

if (!repo) {
  const lijst = await db.select().from(sites);
  const metFeed = lijst.filter((s) => s.nieuwsFeedUrl);
  console.log(`sites met nieuwsfeed: ${metFeed.length} van ${lijst.length}`);
  for (const s of metFeed) console.log(`  ${s.githubRepo} → ${s.nieuwsFeedUrl}`);
  process.exit(0);
}

const [site] = await db.select().from(sites).where(eq(sites.githubRepo, repo));
if (!site) { console.error(`Site "${repo}" niet gevonden`); process.exit(1); }

if (feed === '--uit') {
  await db.update(sites).set({ nieuwsFeedUrl: null }).where(eq(sites.id, site.id));
  console.log(`nieuwsfeed uitgezet voor ${repo}`);
  process.exit(0);
}
if (!feed) { console.error('Geef een feed-url op (of --uit)'); process.exit(1); }

await db.update(sites).set({ nieuwsFeedUrl: feed }).where(eq(sites.id, site.id));
console.log(`nieuwsfeed ingesteld voor ${repo}:\n  ${feed}`);
console.log('\nDe dagelijkse sync (06:30) pakt hem vanaf nu mee.');
console.log(`Handmatig proberen: npx tsx --env-file=.env.local scripts/actueel-sync.mts ${repo} --droog`);
process.exit(0);
