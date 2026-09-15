/**
 * Handmatig een klant-repo deployen (vangnet naast de push-webhook):
 *   npx tsx --env-file=.env.local scripts/deploy-klant.mts <repo-naam>
 */
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { sites } from '../db/schema';
import { deployRepoNaarCloudflare } from '../lib/cloudflare';

const repo = process.argv[2];
if (!repo) { console.error('Gebruik: deploy-klant.mts <repo-naam>'); process.exit(1); }
const [site] = await db.select().from(sites).where(eq(sites.githubRepo, repo));
if (!site?.siteSlug) { console.error('Site niet gevonden of nog niet online'); process.exit(1); }
console.log((await deployRepoNaarCloudflare(repo, site.siteSlug)).url);
// De werkversie (wv-*) draagt een open concept van de klant; die nooit overschrijven
const { changes } = await import('../db/schema');
const { and, inArray } = await import('drizzle-orm');
const open = await db
  .select({ id: changes.id })
  .from(changes)
  .where(and(eq(changes.siteId, site.id), inArray(changes.status, ['concept', 'publicatie_mislukt'])));
if (open.length > 0) {
  console.log(`werkversie OVERGESLAGEN: er staat een open concept (#${open[0].id}) — die zou anders overschreven worden`);
} else {
  await deployRepoNaarCloudflare(repo, `wv-${site.siteSlug}`);
  console.log('werkversie ok');
}
