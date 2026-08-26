/**
 * Registreert een hier (via Claude Code) gebouwde klant volledig in het systeem:
 * repo aanmaken (indien nodig), site-rij in de database, Cloudflare-workers
 * (live + werkversie) deployen en het domeinveld invullen.
 *   npx tsx --env-file=.env.local scripts/registreer-klant.mts <repo> "<Naam>" [clerkUserId]
 * Idempotent: bestaat de site al, dan wordt alleen opnieuw gedeployed.
 */
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { sites } from '../db/schema';
import { maakKlantRepo, repoBestaat } from '../lib/github';
import { deployRepoNaarCloudflare, CF_SUBDOMEIN } from '../lib/cloudflare';

const [repo, naam, clerkUserId] = process.argv.slice(2);
if (!repo || !naam) {
  console.error('Gebruik: registreer-klant.mts <repo> "<Naam>" [clerkUserId]');
  process.exit(1);
}
if (!(await repoBestaat(repo))) {
  await maakKlantRepo(repo, `Website van ${naam} (via WordSwap)`);
  console.log('repo aangemaakt');
}
const [bestaand] = await db.select().from(sites).where(eq(sites.githubRepo, repo));
const eigenaar = clerkUserId ?? bestaand?.clerkUserId ?? 'user_3INLWb8dxVLIyc6yH0YwqwKMeQC';
const { url } = await deployRepoNaarCloudflare(repo, repo);
await deployRepoNaarCloudflare(repo, `wv-${repo}`);
const domein = `${repo}.${CF_SUBDOMEIN}.workers.dev`;
if (bestaand) {
  await db.update(sites).set({ naam, netlifySiteId: repo, domein }).where(eq(sites.id, bestaand.id));
  console.log(`site #${bestaand.id} bijgewerkt`);
} else {
  const [rij] = await db.insert(sites).values({
    clerkUserId: eigenaar, naam, githubRepo: repo,
    netlifySiteId: repo, domein, status: 'migratie',
  }).returning({ id: sites.id });
  console.log(`site #${rij.id} aangemaakt`);
}
console.log('live:', url, '| werkversie: https://wv-' + domein);
