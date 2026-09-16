/**
 * Actueel-sync handmatig draaien (naast de dagelijkse cron):
 *   npx tsx --env-file=.env.local scripts/actueel-sync.mts <repo-naam> [--droog] [--deploy]
 *
 * --droog   alleen tonen wat er zou gebeuren, niets pushen
 * --deploy  na het pushen meteen naar Cloudflare deployen
 */
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { sites } from '../db/schema';
import { syncActueel } from '../lib/actueel';
import { deployRepoNaarCloudflare } from '../lib/cloudflare';

const repo = process.argv[2];
const droog = process.argv.includes('--droog');
const deploy = process.argv.includes('--deploy');
// Feed-URL meegeven i.p.v. uit de database halen (handig om te proberen
// voordat de feed bij de site is ingesteld).
const feedArg = process.argv.find((a) => a.startsWith('--feed='))?.slice('--feed='.length);
if (!repo) {
  console.error('Gebruik: actueel-sync.mts <repo-naam> [--feed=<url>] [--droog] [--deploy]');
  process.exit(1);
}

const [site] = await db.select().from(sites).where(eq(sites.githubRepo, repo));
if (!site) { console.error(`Site "${repo}" niet gevonden`); process.exit(1); }
const feedUrl = feedArg ?? site.nieuwsFeedUrl;
if (!feedUrl) {
  console.error(`Site "${repo}" heeft geen nieuwsfeed ingesteld (kolom nieuws_feed_url)`);
  process.exit(1);
}

const uitslag = await syncActueel({
  repo: site.githubRepo,
  feedUrl,
  drogeloop: droog,
});

console.log(`feed: ${uitslag.gevonden} artikelen`);
console.log(`al aanwezig: ${uitslag.overgeslagen}`);
console.log(`nieuw: ${uitslag.nieuw.length}${uitslag.nieuw.length ? ' → ' + uitslag.nieuw.join(', ') : ''}`);
if (uitslag.fout) console.error(`FOUT: ${uitslag.fout}`);
if (droog) console.log('(droge loop — er is niets gepusht)');

if (deploy && !droog && uitslag.nieuw.length && site.siteSlug) {
  const { url } = await deployRepoNaarCloudflare(site.githubRepo, site.siteSlug);
  console.log(`gedeployd: ${url}`);
}
process.exit(0);
