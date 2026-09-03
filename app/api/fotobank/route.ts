import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { changes, messages, sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { deployMapNaarCloudflare } from "@/lib/cloudflare";
import { maakBranch, pushBestanden } from "@/lib/github";
import { alleBestandenVan, laadWerkmap, ruimWerkmapOp } from "@/lib/werkmap";

export const maxDuration = 120;

const IS_BEELD = /\.(webp|jpe?g|png|gif|avif)$/i;

/** Stam van een fotobestand: pad zonder de -v<versie>-toevoeging. */
function stamVan(pad: string): string {
  return pad.replace(/-v[0-9a-z]{6,}(\.[^.]+)$/i, "$1");
}

async function magErbij(siteId: number, userId: string) {
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site || (!site.isDemo && site.clerkUserId !== userId && !(await isBeheerder()))) return null;
  return site;
}

async function openWerkmap(site: typeof sites.$inferSelect, userId: string) {
  const [openConcept] = await db
    .select()
    .from(changes)
    .where(
      site.isDemo
        ? and(eq(changes.siteId, site.id), eq(changes.status, "concept"), eq(changes.clerkUserId, userId))
        : and(eq(changes.siteId, site.id), eq(changes.status, "concept"))
    )
    .orderBy(desc(changes.id))
    .limit(1);
  const { demoBranch } = await import("@/lib/demo");
  const eigenBranch = site.isDemo ? demoBranch(userId) : null;
  let werkmap: string;
  if (openConcept?.branch) werkmap = await laadWerkmap(site.githubRepo, openConcept.branch);
  else if (eigenBranch)
    werkmap = await laadWerkmap(site.githubRepo, eigenBranch).catch(() => laadWerkmap(site.githubRepo));
  else werkmap = await laadWerkmap(site.githubRepo);
  return { werkmap, openConcept, eigenBranch };
}

/** Alle foto's van de site, gegroepeerd op stam, met in-gebruik-markering. */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const siteId = Number(new URL(req.url).searchParams.get("siteId"));
  const site = await magErbij(siteId, userId);
  if (!site) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  let werkmap: string | null = null;
  try {
    ({ werkmap } = await openWerkmap(site, userId));
    const alle = await alleBestandenVan(werkmap);
    const beelden = alle.filter((b) => IS_BEELD.test(b));
    const bronnen = alle.filter((b) => /\.(html?|css)$/i.test(b));
    let inhoud = "";
    for (const b of bronnen) inhoud += await readFile(path.join(werkmap, b), "utf8");
    const lijst = await Promise.all(
      beelden.map(async (pad) => {
        const { size } = await import("node:fs").then((fs) =>
          fs.promises.stat(path.join(werkmap!, pad))
        );
        return {
          pad,
          stam: stamVan(pad),
          grootte: size,
          inGebruik: inhoud.includes(pad),
        };
      })
    );
    lijst.sort((a, b) => a.stam.localeCompare(b.stam) || Number(b.inGebruik) - Number(a.inGebruik));
    return NextResponse.json({ afbeeldingen: lijst });
  } finally {
    if (werkmap) await ruimWerkmapOp(werkmap).catch(() => {});
  }
}

/** Oude fotoversie terugzetten: verwijzingen naar de nu-gebruikte
 * familiegenoot worden omgezet naar de gekozen versie (als concept). */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const { siteId, pad, vervangDoel } = (await req.json()) as {
    siteId: number;
    pad: string;
    /** Optioneel: de foto die nu op de pagina staat en vervangen moet worden */
    vervangDoel?: string;
  };
  if (!Number.isInteger(siteId) || !pad || pad.includes("..")) {
    return NextResponse.json({ error: "Onvolledig verzoek" }, { status: 400 });
  }
  const site = await magErbij(siteId, userId);
  if (!site) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  if ((site.status === "gepauzeerd" || site.status === "opgezegd") && !(await isBeheerder())) {
    return NextResponse.json({ error: "Site niet actief" }, { status: 403 });
  }

  let werkmap: string | null = null;
  try {
    const { werkmap: map, openConcept, eigenBranch } = await openWerkmap(site, userId);
    werkmap = map;
    const stam = stamVan(pad);
    const alle = await alleBestandenVan(werkmap);
    const familie = alle.filter((b) => IS_BEELD.test(b) && stamVan(b) === stam && b !== pad);
    const bronnen = alle.filter((b) => /\.(html?|css)$/i.test(b));

    const perBron = new Map<string, string>();
    for (const b of bronnen) perBron.set(b, await readFile(path.join(werkmap, b), "utf8"));

    // Gericht vervangen (uit de aanwijs-flow) of een oude familiegenoot terughalen
    let huidig: string | null = null;
    if (vervangDoel) {
      const schoon = vervangDoel
        .replace(/^https?:\/\/[^/]+/, "")
        .split("?")[0]
        .split("#")[0]
        .replace(/^\/preview\/\d+\//, "/")
        .replace(/^\/+/, "");
      if (!schoon || schoon.includes("..") || schoon === pad) {
        return NextResponse.json({ error: "Ongeldige doelfoto" }, { status: 400 });
      }
      if ([...perBron.values()].some((t) => t.includes(schoon))) huidig = schoon;
    } else {
      for (const kandidaat of familie) {
        if ([...perBron.values()].some((t) => t.includes(kandidaat))) {
          huidig = kandidaat;
          break;
        }
      }
    }
    if (!huidig) {
      return NextResponse.json(
        { error: "Deze foto heeft geen actieve tegenhanger op de site — vraag in de chat waar je hem wilt gebruiken." },
        { status: 400 }
      );
    }

    const esc = huidig.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const verwijzing = new RegExp(`(/?)${esc}`, "g");
    const gewijzigd: { pad: string; inhoud: Buffer }[] = [];
    for (const [bron, tekst] of perBron) {
      if (!tekst.includes(huidig)) continue;
      const nieuw = tekst.replace(verwijzing, `$1${pad}`);
      await writeFile(path.join(werkmap, bron), nieuw);
      gewijzigd.push({ pad: bron, inhoud: Buffer.from(nieuw) });
    }

    const { demoWorker } = await import("@/lib/demo");
    const wvNaam = site.isDemo
      ? demoWorker(site.githubRepo, userId)
      : site.netlifySiteId
        ? `wv-${site.netlifySiteId}`
        : null;
    const wvDeploy = wvNaam
      ? deployMapNaarCloudflare(werkmap, wvNaam, { subdomeinAanzetten: site.isDemo }).catch((e) =>
          console.error("Werkversie-deploy mislukt:", e)
        )
      : Promise.resolve();

    const omschrijving = vervangDoel
      ? `Foto vervangen door een uit de fotobank: ${pad}`
      : `Oude foto teruggezet: ${pad}`;
    const paden = gewijzigd.map((b) => b.pad);
    let changeId: number;
    let previewUrl: string;
    if (openConcept) {
      await pushBestanden(site.githubRepo, gewijzigd, omschrijving, openConcept.branch);
      const samengevoegd = [
        ...new Set([
          ...(Array.isArray(openConcept.bestanden) ? (openConcept.bestanden as string[]) : []),
          ...paden,
        ]),
      ];
      await db
        .update(changes)
        .set({ bestanden: samengevoegd, promptTekst: `${openConcept.promptTekst} → ${omschrijving}`.slice(0, 500) })
        .where(eq(changes.id, openConcept.id));
      changeId = openConcept.id;
      previewUrl = openConcept.previewUrl ?? `/preview/${openConcept.id}/`;
    } else {
      const branch = eigenBranch ?? `wijziging-${Date.now()}`;
      let baseSha: string | null = null;
      if (eigenBranch) {
        const { gh, GITHUB_ORG } = await import("@/lib/github");
        try {
          const ref = (await gh(`/repos/${GITHUB_ORG}/${site.githubRepo}/git/ref/heads/${branch}`)) as {
            object: { sha: string };
          };
          baseSha = ref.object.sha;
        } catch {
          await maakBranch(site.githubRepo, branch);
        }
      } else {
        await maakBranch(site.githubRepo, branch);
      }
      await pushBestanden(site.githubRepo, gewijzigd, omschrijving, branch);
      const [row] = await db
        .insert(changes)
        .values({ siteId: site.id, branch, promptTekst: omschrijving, bestanden: paden, clerkUserId: userId, baseSha })
        .returning({ id: changes.id });
      changeId = row.id;
      previewUrl = `/preview/${row.id}/`;
      await db.update(changes).set({ previewUrl }).where(eq(changes.id, row.id));
    }

    const reply = vervangDoel
      ? `Foto vervangen! ${pad} staat nu op de plek van ${huidig}. Bekijk het voorbeeld en publiceer als je tevreden bent.`
      : `Oude foto teruggezet: ${pad} staat weer overal waar ${huidig} stond. Bekijk het voorbeeld en publiceer als je tevreden bent.`;
    await db.insert(messages).values([
      { siteId: site.id, rol: "klant" as const, tekst: `[Zelf aangepast] ${omschrijving}`, clerkUserId: userId },
      { siteId: site.id, rol: "assistent" as const, tekst: reply, clerkUserId: userId },
    ]);
    await wvDeploy;
    return NextResponse.json({ ok: true, reply, previewUrl, changeId, bestanden: paden });
  } finally {
    if (werkmap) await ruimWerkmapOp(werkmap).catch(() => {});
  }
}
