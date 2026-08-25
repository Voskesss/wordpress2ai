import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import * as tar from "tar";
import { GITHUB_ORG, installationToken } from "./github";

/** Downloadt de repo als tarball en pakt hem uit in een tijdelijke werkmap. */
export async function laadWerkmap(repo: string): Promise<string> {
  const token = await installationToken();
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_ORG}/${repo}/tarball`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Tarball ophalen mislukt: ${res.status}`);

  const dir = await mkdtemp(path.join(tmpdir(), "wp2ai-"));
  const buffer = Buffer.from(await res.arrayBuffer());
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

export async function ruimWerkmapOp(dir: string) {
  await rm(dir, { recursive: true, force: true });
}
