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
const { openConcept } = await import('../lib/open-concept');
const open = await openConcept(site.id);
if (open) {
  console.log(`werkversie OVERGESLAGEN: er staat een open concept (#${open.id}), die zou anders overschreven worden`);
} else {
  await deployRepoNaarCloudflare(repo, `wv-${site.siteSlug}`);
  console.log('werkversie ok');
}
