/**
 * Eenmalig (of na een grote wijziging): de formulieren van alle klantsites inlezen voor de
 * bevestigingsmails. Nieuwe formulieren krijgen één AI-voorstel; bestaande teksten blijven staan.
 *
 *   npx tsx --env-file=.env.local scripts/formulieren-inlezen.mts
 */
import { db } from "../db";
import { sites } from "../db/schema";
import { laadWerkmap, ruimWerkmapOp } from "../lib/werkmap";
import { synchroniseerFormulieren } from "../lib/formulier-bevestiging";

for (const site of await db.select().from(sites)) {
  if (site.isDemo) continue;
  try {
    const map = await laadWerkmap(site.githubRepo);
    try {
      const nieuw = await synchroniseerFormulieren(site, map);
      console.log(`${site.naam}: ${nieuw} nieuw formulier(en)`);
    } finally {
      await ruimWerkmapOp(map).catch(() => {});
    }
  } catch (e) {
    console.log(`${site.naam}: overgeslagen (${(e as Error).message})`);
  }
}
process.exit(0);
