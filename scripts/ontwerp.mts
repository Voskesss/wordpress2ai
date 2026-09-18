/**
 * Ontwerp-route vanaf de commandoregel (voor Claude Code / Jos), zelfde
 * kernfuncties als de admin-knoppen (lib/ontwerp.ts):
 *
 *   npx tsx --env-file=.env.local scripts/ontwerp.mts start     <repo>
 *   npx tsx --env-file=.env.local scripts/ontwerp.mts status    <repo>
 *   npx tsx --env-file=.env.local scripts/ontwerp.mts deploy    <repo>   (na lokale push op de ontwerp-branch)
 *   npx tsx --env-file=.env.local scripts/ontwerp.mts bijwerken <repo>   (live-wijzigingen het ontwerp in)
 *   npx tsx --env-file=.env.local scripts/ontwerp.mts controle  <repo>   (bouw-controle over de ontwerp-branch)
 *   npx tsx --env-file=.env.local scripts/ontwerp.mts promoveer <repo>   (poort + concept op de werkversie)
 *   npx tsx --env-file=.env.local scripts/ontwerp.mts weg       <repo>   (branch + worker opruimen)
 *
 * Lokaal bewerken van het ontwerp: in ~/wordswap-klanten/<repo>
 *   git fetch origin && git checkout ontwerp   (of: git checkout -b ontwerp origin/ontwerp)
 *   ... bouwen ...  → git push → hier "deploy".
 */
import { eq } from "drizzle-orm";
import { db } from "../db";
import { sites } from "../db/schema";
import {
  controleerOntwerp,
  maakOfVerversOntwerp,
  ontwerpStatus,
  ontwerpWorker,
  promoveerOntwerp,
  verwijderOntwerp,
  werkOntwerpBij,
} from "../lib/ontwerp";
import { CF_SUBDOMEIN } from "../lib/cloudflare";

const [commando, repo] = process.argv.slice(2);
if (!commando || !repo) {
  console.error("Gebruik: ontwerp.mts <start|status|deploy|bijwerken|controle|promoveer|weg> <repo>");
  process.exit(1);
}
const [site] = await db.select().from(sites).where(eq(sites.githubRepo, repo));
if (!site?.siteSlug) {
  console.error(`Geen site met repo "${repo}" (of zonder slug) in de database.`);
  process.exit(1);
}
const url = `https://${ontwerpWorker(site.siteSlug)}.${CF_SUBDOMEIN}.workers.dev`;

switch (commando) {
  case "start":
  case "deploy": {
    await maakOfVerversOntwerp(repo, site.siteSlug);
    console.log(`Ontwerp staat op ${url}`);
    break;
  }
  case "status": {
    const s = await ontwerpStatus(repo);
    if (!s.bestaat) console.log("Geen ontwerp-branch.");
    else console.log(`Ontwerp bestaat: ${s.voor} wijziging(en) vóór op live, ${s.achter} achter. ${url}`);
    break;
  }
  case "bijwerken": {
    const uitkomst = await werkOntwerpBij(repo, site.siteSlug);
    console.log(
      uitkomst === "conflict"
        ? "CONFLICT: los lokaal op (git merge main op de ontwerp-branch), push, en draai daarna deploy."
        : `Bijgewerkt (${uitkomst}) en opnieuw gedeployd: ${url}`,
    );
    if (uitkomst === "conflict") process.exit(1);
    break;
  }
  case "controle": {
    const bevindingen = await controleerOntwerp(repo);
    const fouten = bevindingen.filter((b) => b.ernst === "fout");
    for (const b of bevindingen)
      console.log(`${b.ernst === "fout" ? "FOUT" : "let op"} [${b.regel}] ${b.waar} — ${b.detail}`);
    console.log(fouten.length ? `\n${fouten.length} fout(en): promotie zou blokkeren.` : "\nGeen fouten.");
    process.exit(fouten.length ? 1 : 0);
    break;
  }
  case "promoveer": {
    const uitkomst = await promoveerOntwerp(site);
    if (uitkomst.soort === "ok")
      console.log(`Concept #${uitkomst.changeId} staat op de werkversie (wv-${site.siteSlug}). Klant kan akkoord geven; Publiceren zet het live.`);
    else if (uitkomst.soort === "open-concept")
      console.log("Er staat al een concept open; publiceer of verwerp dat eerst.");
    else if (uitkomst.soort === "achter")
      console.log(`Ontwerp loopt ${uitkomst.achter} wijziging(en) achter op live: draai eerst "bijwerken".`);
    else {
      for (const f of uitkomst.fouten) console.log(`FOUT [${f.regel}] ${f.waar} — ${f.detail}`);
      console.log(`\nPromotie geblokkeerd door ${uitkomst.fouten.length} fout(en).`);
    }
    process.exit(uitkomst.soort === "ok" ? 0 : 1);
    break;
  }
  case "weg": {
    await verwijderOntwerp(repo, site.siteSlug);
    console.log("Ontwerp-branch en -worker opgeruimd.");
    break;
  }
  default:
    console.error(`Onbekend commando: ${commando}`);
    process.exit(1);
}
process.exit(0);
