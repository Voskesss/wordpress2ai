/**
 * De ontwerp-route: een nieuw ontwerp voor een bestaande klantsite, gebouwd
 * op een vaste branch "ontwerp" in de klantrepo, zichtbaar op een eigen
 * worker (ontwerp-<slug>, met banner en noindex), volledig los van de
 * werkversie en de live site. Promotie loopt via het BESTAANDE publiceerpad:
 * de ontwerp-inhoud wordt één gewone wijziging bovenop main (concept op de
 * werkversie), de klant geeft akkoord in zijn portaal, en Publiceren zet hem
 * live. Vóór promotie geldt de bouw-controle (lib/bouw-controle) als harde
 * poort. Zie docs/ontwerp-route.md.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { changes, sites } from "../db/schema";
import { controleerSiteMap, type Bevinding } from "./bouw-controle";
import {
  deployRepoNaarCloudflareRef,
  verwijderCloudflareSite,
} from "./cloudflare";
import {
  gh,
  GITHUB_ORG,
  maakBranch,
  mergeBranches,
  verwijderBranch,
  zetBranchOpInhoudVan,
} from "./github";
import { laadWerkmap, ruimWerkmapOp } from "./werkmap";

export const ONTWERP_BRANCH = "ontwerp";

export type OntwerpSite = {
  id: number;
  githubRepo: string;
  siteSlug: string | null;
  ontwerpSlug: string | null;
};

/** Onraadbare workernaam: verbergen roteert hem, dus een gedeelde link vervalt. */
function nieuweOntwerpNaam(siteSlug: string) {
  const willekeur = Math.random().toString(36).slice(2, 8);
  return `ontwerp-${siteSlug}-${willekeur}`.slice(0, 54);
}

export type OntwerpStatus =
  | { bestaat: false }
  | {
      bestaat: true;
      /** commits die het ontwerp vóórligt op main */
      voor: number;
      /** commits die main vóórligt op het ontwerp (bijwerken gewenst) */
      achter: number;
    };

export async function ontwerpStatus(repo: string): Promise<OntwerpStatus> {
  try {
    const verschil = (await gh(
      `/repos/${GITHUB_ORG}/${repo}/compare/main...${ONTWERP_BRANCH}`,
    )) as { ahead_by: number; behind_by: number };
    return { bestaat: true, voor: verschil.ahead_by, achter: verschil.behind_by };
  } catch {
    return { bestaat: false };
  }
}

/** Maakt de ontwerp-branch (vanaf main) als hij nog niet bestaat en zet hem
 * op de eigen ontwerp-worker. Idempotent: bestaat alles al, dan wordt alleen
 * opnieuw gedeployd (handig na lokale pushes vanuit Claude Code). */
export async function maakOfVerversOntwerp(site: OntwerpSite) {
  if (!site.siteSlug) throw new Error("Site heeft geen slug.");
  const status = await ontwerpStatus(site.githubRepo);
  if (!status.bestaat) await maakBranch(site.githubRepo, ONTWERP_BRANCH);
  let naam = site.ontwerpSlug;
  if (!naam) {
    naam = nieuweOntwerpNaam(site.siteSlug);
    await db.update(sites).set({ ontwerpSlug: naam }).where(eq(sites.id, site.id));
  }
  await deployRepoNaarCloudflareRef(site.githubRepo, naam, ONTWERP_BRANCH);
  return naam;
}

/** Nieuw adres voor het ontwerp; het oude adres houdt op te bestaan. Voor
 * "verbergen": de klant (of wie de link ook heeft) kan er dan echt niet
 * meer bij. */
export async function roteerOntwerpAdres(site: OntwerpSite) {
  if (!site.siteSlug) throw new Error("Site heeft geen slug.");
  const oud = site.ontwerpSlug;
  const nieuw = nieuweOntwerpNaam(site.siteSlug);
  await deployRepoNaarCloudflareRef(site.githubRepo, nieuw, ONTWERP_BRANCH);
  await db.update(sites).set({ ontwerpSlug: nieuw }).where(eq(sites.id, site.id));
  if (oud) await verwijderCloudflareSite(oud).catch(() => {});
  return nieuw;
}

/** Haalt de laatste wijzigingen van de klant (main) het ontwerp in, zodat
 * teksten die hij intussen aanpaste niet verloren gaan bij promotie. */
export async function werkOntwerpBij(
  site: OntwerpSite,
): Promise<"samengevoegd" | "al-bij" | "conflict"> {
  const uitkomst = await mergeBranches(site.githubRepo, ONTWERP_BRANCH, "main");
  if (uitkomst !== "conflict" && site.ontwerpSlug)
    await deployRepoNaarCloudflareRef(site.githubRepo, site.ontwerpSlug, ONTWERP_BRANCH);
  return uitkomst;
}

/** Draait de bouw-controle over de ontwerp-branch (bestandscontroles). */
export async function controleerOntwerp(repo: string): Promise<Bevinding[]> {
  const map = await laadWerkmap(repo, ONTWERP_BRANCH);
  try {
    return await controleerSiteMap(map);
  } finally {
    await ruimWerkmapOp(map).catch(() => {});
  }
}

export type PromotieUitkomst =
  | { soort: "open-concept" }
  | { soort: "achter"; achter: number }
  | { soort: "fouten"; fouten: Bevinding[] }
  | { soort: "ok"; changeId: number };

/** Zet het ontwerp klaar als gewoon concept op de werkversie. Blokkeert op
 * een al openstaand concept, op een ontwerp dat achterloopt op main (eerst
 * bijwerken, anders raken tekstwijzigingen van de klant zoek) en op fouten
 * uit de bouw-controle. */
export async function promoveerOntwerp(site: {
  id: number;
  githubRepo: string;
  siteSlug: string | null;
  clerkUserId: string;
}): Promise<PromotieUitkomst> {
  if (!site.siteSlug) throw new Error("Site heeft geen slug.");
  const [open] = await db
    .select({ id: changes.id })
    .from(changes)
    .where(and(eq(changes.siteId, site.id), eq(changes.status, "concept")))
    .limit(1);
  if (open) return { soort: "open-concept" };

  const status = await ontwerpStatus(site.githubRepo);
  if (!status.bestaat) throw new Error("Er is geen ontwerp-branch.");
  if (status.achter > 0) return { soort: "achter", achter: status.achter };

  const fouten = (await controleerOntwerp(site.githubRepo)).filter(
    (b) => b.ernst === "fout",
  );
  if (fouten.length) return { soort: "fouten", fouten };

  const branch = `ontwerp-promotie-${Date.now()}`;
  await zetBranchOpInhoudVan(
    site.githubRepo,
    branch,
    ONTWERP_BRANCH,
    "Nieuw ontwerp: promotie vanaf de ontwerp-branch",
  );

  // Welke pagina's raakt dit? Voor het lijstje bij het concept in het portaal.
  let paginas: string[] = [];
  try {
    const verschil = (await gh(
      `/repos/${GITHUB_ORG}/${site.githubRepo}/compare/main...${branch}`,
    )) as { files?: { filename: string }[] };
    paginas = (verschil.files ?? [])
      .map((f) => f.filename)
      .filter((f) => f.endsWith(".html") && !f.startsWith("delen/"))
      .map((f) => "/" + f.replace(/index\.html$/, ""))
      .slice(0, 60);
  } catch {
    /* lijstje is informatief; promotie mag hier niet op stranden */
  }

  const [row] = await db
    .insert(changes)
    .values({
      siteId: site.id,
      branch,
      promptTekst:
        "Nieuw ontwerp voor de hele website (klaargezet via de ontwerp-route)",
      bestanden: paginas,
      clerkUserId: site.clerkUserId,
    })
    .returning({ id: changes.id });
  await db
    .update(changes)
    .set({ previewUrl: `/preview/${row.id}/` })
    .where(eq(changes.id, row.id));

  await deployRepoNaarCloudflareRef(
    site.githubRepo,
    `wv-${site.siteSlug}`,
    branch,
  );
  return { soort: "ok", changeId: row.id };
}

/** Ruimt branch, worker en administratie op. Het concept (indien al
 * gepromoveerd) blijft gewoon bestaan. */
export async function verwijderOntwerp(site: OntwerpSite) {
  await verwijderBranch(site.githubRepo, ONTWERP_BRANCH).catch(() => {});
  if (site.ontwerpSlug)
    await verwijderCloudflareSite(site.ontwerpSlug).catch(() => {});
  await db
    .update(sites)
    .set({ ontwerpSlug: null, ontwerpZichtbaar: false })
    .where(eq(sites.id, site.id));
}

/** Voor de admin: site-rij ophalen op id, met de velden die de route nodig heeft. */
export async function siteVoorOntwerp(siteId: number) {
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  return site ?? null;
}
