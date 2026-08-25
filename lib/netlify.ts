import JSZip from "jszip";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { laadWerkmap, ruimWerkmapOp } from "./werkmap";

const API = "https://api.netlify.com/api/v1";

function headers(json = true): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
  };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

async function zipVanMap(dir: string): Promise<Buffer> {
  const zip = new JSZip();
  async function voegToe(sub: string) {
    for (const item of await readdir(path.join(dir, sub), { withFileTypes: true })) {
      const rel = path.join(sub, item.name);
      if (item.isDirectory()) {
        if (item.name === ".git") continue;
        await voegToe(rel);
      } else {
        zip.file(rel, await readFile(path.join(dir, rel)));
      }
    }
  }
  await voegToe("");
  return zip.generateAsync({ type: "nodebuffer" });
}

/** Maakt een Netlify-site aan (zonder Git-koppeling) en zet previews open. */
export async function maakNetlifySite(naam: string) {
  const res = await fetch(`${API}/sites`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ name: naam }),
  });
  if (!res.ok) throw new Error(`Netlify site aanmaken: ${res.status} ${await res.text()}`);
  const site = (await res.json()) as { id: string; name: string };
  await fetch(`${API}/sites/${site.id}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ sso_login: false }),
  });
  return site;
}

export async function vindNetlifySiteId(naam: string): Promise<string | null> {
  const sites = (await fetch(`${API}/sites`, { headers: headers(false) }).then((r) =>
    r.json()
  )) as { id: string; name: string }[];
  return sites.find((s) => s.name === naam)?.id ?? null;
}

/** Deployt de inhoud van de klant-repo (main) rechtstreeks naar Netlify — geen build nodig. */
export async function deployRepoNaarNetlify(repo: string, netlifySiteNaam: string) {
  const siteId = await vindNetlifySiteId(netlifySiteNaam);
  if (!siteId) throw new Error(`Netlify-site ${netlifySiteNaam} niet gevonden`);
  const werkmap = await laadWerkmap(repo);
  try {
    const zip = await zipVanMap(werkmap);
    const res = await fetch(`${API}/sites/${siteId}/deploys`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
        "Content-Type": "application/zip",
      },
      body: new Uint8Array(zip),
    });
    if (!res.ok) throw new Error(`Netlify deploy: ${res.status} ${await res.text()}`);
    return (await res.json()) as { id: string; state: string };
  } finally {
    await ruimWerkmapOp(werkmap).catch(() => {});
  }
}
