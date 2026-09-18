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

export function ontwerpWorker(slug: string) {
  return `ontwerp-${slug}`;
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
export async function maakOfVerversOntwerp(repo: string, slug: string) {
  const status = await ontwerpStatus(repo);
  if (!status.bestaat) await maakBranch(repo, ONTWERP_BRANCH);
  await deployRepoNaarCloudflareRef(repo, ontwerpWorker(slug), ONTWERP_BRANCH);
  return ontwerpWorker(slug);
}

/** Haalt de laatste wijzigingen van de klant (main) het ontwerp in, zodat
 * teksten die hij intussen aanpaste niet verloren gaan bij promotie. */
export async function werkOntwerpBij(
  repo: string,
  slug: string,
): Promise<"samengevoegd" | "al-bij" | "conflict"> {
  const uitkomst = await mergeBranches(repo, ONTWERP_BRANCH, "main");
  if (uitkomst !== "conflict")
    await deployRepoNaarCloudflareRef(repo, ontwerpWorker(slug), ONTWERP_BRANCH);
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

/** Ruimt branch en worker op. Het concept (indien al gepromoveerd) blijft
 * gewoon bestaan; dit verwijdert alleen de ontwerp-omgeving zelf. */
export async function verwijderOntwerp(repo: string, slug: string) {
  await verwijderBranch(repo, ONTWERP_BRANCH).catch(() => {});
  await verwijderCloudflareSite(ontwerpWorker(slug)).catch(() => {});
}

/** Voor de admin: site-rij ophalen op id, met de velden die de route nodig heeft. */
export async function siteVoorOntwerp(siteId: number) {
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  return site ?? null;
}
