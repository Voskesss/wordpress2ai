import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import * as tar from "tar";
import { GITHUB_ORG, installationToken } from "./github";

// Tarball-cache over warme serverless-invocaties heen: dezelfde commit hoeft
// maar één keer gedownload te worden. Uitpakken gebeurt altijd in een verse map.
const MAX_CACHE_TARBALL = 20 * 1024 * 1024;
const tarballCache = new Map<string, Buffer>();

/** Downloadt de repo als tarball en pakt hem uit in een tijdelijke werkmap. */
export async function laadWerkmap(repo: string, ref?: string): Promise<string> {
  const token = await installationToken();
  const kop = { Authorization: `Bearer ${token}` };

  let buffer: Buffer | undefined;
  let cacheSleutel: string | null = null;
  try {
    const commit = (await fetch(
      `https://api.github.com/repos/${GITHUB_ORG}/${repo}/commits/${ref ? encodeURIComponent(ref) : "HEAD"}`,
      { headers: kop }
    ).then((r) => (r.ok ? r.json() : null))) as { sha?: string } | null;
    if (commit?.sha) {
      cacheSleutel = `${repo}@${commit.sha}`;
      buffer = tarballCache.get(cacheSleutel);
    }
  } catch {
    // cache is een optimalisatie; bij twijfel gewoon downloaden
  }

  if (!buffer) {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_ORG}/${repo}/tarball${ref ? `/${encodeURIComponent(ref)}` : ""}`,
      { headers: kop }
    );
    if (!res.ok) throw new Error(`Tarball ophalen mislukt: ${res.status}`);
    buffer = Buffer.from(await res.arrayBuffer());
    if (cacheSleutel && buffer.length <= MAX_CACHE_TARBALL) {
      if (tarballCache.size >= 5) {
        const oudste = tarballCache.keys().next().value;
        if (oudste) tarballCache.delete(oudste);
      }
      tarballCache.set(cacheSleutel, buffer);
    }
  }

  const dir = await mkdtemp(path.join(tmpdir(), "wp2ai-"));
  await new Promise<void>((resolve, reject) => {
    const extract = tar.x({ cwd: dir, strip: 1 });
    extract.on("finish", () => resolve());
    extract.on("error", reject);
    extract.end(buffer);
  });
  return dir;
}

async function alleBestanden(dir: string, basis = dir): Promise<string[]> {
  const items = await readdir(dir, { withFileTypes: true });
  const paden: string[] = [];
  for (const item of items) {
    const vol = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name === ".git" || item.name === "node_modules") continue;
      paden.push(...(await alleBestanden(vol, basis)));
    } else {
      paden.push(path.relative(basis, vol));
    }
  }
  return paden;
}

export type Snapshot = Map<string, string>;

/** Hash-snapshot van alle bestanden, om wijzigingen te kunnen detecteren. */
export async function maakSnapshot(dir: string): Promise<Snapshot> {
  const snapshot: Snapshot = new Map();
  for (const pad of await alleBestanden(dir)) {
    const inhoud = await readFile(path.join(dir, pad));
    snapshot.set(pad, createHash("sha256").update(inhoud).digest("hex"));
  }
  return snapshot;
}

/** Paden die nieuw zijn of gewijzigd ten opzichte van het snapshot. */
export async function gewijzigdeBestanden(
  dir: string,
  snapshot: Snapshot
): Promise<string[]> {
  const gewijzigd: string[] = [];
  for (const pad of await alleBestanden(dir)) {
    const inhoud = await readFile(path.join(dir, pad));
    const hash = createHash("sha256").update(inhoud).digest("hex");
    if (snapshot.get(pad) !== hash) gewijzigd.push(pad);
  }
  return gewijzigd;
}

/**
 * Plattegrond van de site voor in de systeemprompt: per pagina de titel en
 * koppen, plus de beschikbare afbeeldingen. Scheelt de agent een hoop
 * verkennende Glob/Grep/Read-beurten per wijziging.
 */
export async function maakSiteOverzicht(dir: string): Promise<string> {
  const paden = await alleBestanden(dir);
  const regels: string[] = [];
  const afbeeldingen: string[] = [];
  const overig: string[] = [];

  const kaal = (s: string) =>
    s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

  for (const pad of paden.sort()) {
    if (/\.html?$/i.test(pad)) {
      const html = (await readFile(path.join(dir, pad), "utf8")).slice(0, 300_000);
      const titel = kaal(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
      const koppen = [...html.matchAll(/<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi)]
        .map((m) => `h${m[1]} ${kaal(m[2])}`)
        .filter((k) => k.length > 3)
        .slice(0, 12);
      const centraal = pad.startsWith("delen/")
        ? " — CENTRAAL ONDERDEEL, wordt via <!--invoeg:...--> op meerdere pagina's ingevoegd; wijzig gedeelde blokken hier"
        : "";
      regels.push(`- ${pad}${titel ? ` — "${titel}"` : ""}${centraal}${koppen.length ? `\n  ${koppen.join(" | ")}` : ""}`);
    } else if (/\.(png|jpe?g|webp|gif|svg|avif)$/i.test(pad)) {
      afbeeldingen.push(pad);
    } else if (/\.(css|js|json|xml|txt)$/i.test(pad)) {
      overig.push(pad);
    }
  }

  let overzicht = `PLATTEGROND VAN DE SITE (vooraf voor je in kaart gebracht — gebruik dit om direct het juiste bestand te openen in plaats van eerst te zoeken):

Pagina's:
${regels.join("\n")}

Overige bestanden: ${overig.join(", ") || "geen"}

Afbeeldingen (${afbeeldingen.length}): ${afbeeldingen.slice(0, 60).join(", ")}${afbeeldingen.length > 60 ? ", ..." : ""}`;

  if (overzicht.length > 8000) overzicht = overzicht.slice(0, 8000) + "\n(...ingekort)";
  return overzicht;
}

export async function ruimWerkmapOp(dir: string) {
  await rm(dir, { recursive: true, force: true });
}

/** Alle HTML-bestanden in de werkmap (inclusief delen/ — daar staat gedeelde tekst). */
export async function alleHtmlBestanden(dir: string): Promise<string[]> {
  return (await alleBestanden(dir)).filter((p) => /\.html?$/i.test(p));
}

/** Alle CSS-bestanden in de werkmap. */
export async function alleCssBestanden(dir: string): Promise<string[]> {
  return (await alleBestanden(dir)).filter((p) => /\.css$/i.test(p));
}
