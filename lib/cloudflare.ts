import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { laadWerkmap, ruimWerkmapOp } from "./werkmap";

const API = "https://api.cloudflare.com/client/v4";
const ACCOUNT = "2a71da7bfe94ae3540d4af02be53d53e";
export const CF_SUBDOMEIN = "wordswap";

function hdr(json = true): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
  };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

async function alleBestanden(dir: string, basis = dir): Promise<string[]> {
  const items = await readdir(dir, { withFileTypes: true });
  const paden: string[] = [];
  for (const item of items) {
    const vol = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name === ".git") continue;
      paden.push(...(await alleBestanden(vol, basis)));
    } else {
      paden.push(path.relative(basis, vol));
    }
  }
  return paden;
}

/** Deployt de inhoud van een klant-repo als statische site op Cloudflare Workers. */
export async function deployRepoNaarCloudflare(repo: string, naam: string) {
  const werkmap = await laadWerkmap(repo);
  try {
    const bestanden = await alleBestanden(werkmap);
    const inhoudPerHash = new Map<string, { data: Buffer; pad: string }>();
    const manifest: Record<string, { hash: string; size: number }> = {};
    for (const pad of bestanden) {
      const data = await readFile(path.join(werkmap, pad));
      const hash = createHash("sha256").update(data).digest("hex").slice(0, 32);
      manifest[`/${pad}`] = { hash, size: data.length };
      inhoudPerHash.set(hash, { data, pad });
    }

    // 1. Upload-sessie starten
    const sessie = (await fetch(
      `${API}/accounts/${ACCOUNT}/workers/scripts/${naam}/assets-upload-session`,
      { method: "POST", headers: hdr(), body: JSON.stringify({ manifest }) }
    ).then((r) => r.json())) as {
      success: boolean;
      errors?: unknown[];
      result?: { jwt: string; buckets?: string[][] };
    };
    if (!sessie.success) {
      throw new Error(`Upload-sessie mislukt: ${JSON.stringify(sessie.errors)}`);
    }

    // 2. Ontbrekende bestanden uploaden (per bucket); laatste antwoord bevat het completion-token
    let completionJwt = sessie.result!.jwt;
    const buckets = sessie.result!.buckets ?? [];
    for (const bucket of buckets) {
      const form = new FormData();
      for (const hash of bucket) {
        const item = inhoudPerHash.get(hash);
        if (!item) continue;
        const ext = item.pad.split(".").pop() ?? "";
        const mime =
          {
            html: "text/html",
            css: "text/css",
            js: "text/javascript",
            json: "application/json",
            svg: "image/svg+xml",
            png: "image/png",
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            webp: "image/webp",
            gif: "image/gif",
            ico: "image/x-icon",
            xml: "application/xml",
            txt: "text/plain",
            woff2: "font/woff2",
          }[ext] ?? "application/octet-stream";
        form.append(
          hash,
          new File([item.data.toString("base64")], hash, { type: mime })
        );
      }
      const res = (await fetch(
        `${API}/accounts/${ACCOUNT}/workers/assets/upload?base64=true`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${sessie.result!.jwt}` },
          body: form,
        }
      ).then((r) => r.json())) as {
        success: boolean;
        errors?: unknown[];
        result?: { jwt?: string };
      };
      if (!res.success) {
        throw new Error(`Bestanden uploaden mislukt: ${JSON.stringify(res.errors)}`);
      }
      if (res.result?.jwt) completionJwt = res.result.jwt;
    }

    // 3. Worker (assets-only) publiceren
    const metadata = {
      compatibility_date: "2025-01-01",
      assets: {
        jwt: completionJwt,
        config: {
          html_handling: "auto-trailing-slash",
          not_found_handling: "404-page",
        },
      },
    };
    const publiceerForm = new FormData();
    publiceerForm.append(
      "metadata",
      new File([JSON.stringify(metadata)], "metadata.json", {
        type: "application/json",
      })
    );
    const publiceer = (await fetch(
      `${API}/accounts/${ACCOUNT}/workers/scripts/${naam}`,
      { method: "PUT", headers: hdr(false), body: publiceerForm }
    ).then((r) => r.json())) as { success: boolean; errors?: unknown[] };
    if (!publiceer.success) {
      throw new Error(`Publiceren mislukt: ${JSON.stringify(publiceer.errors)}`);
    }

    // 4. workers.dev-URL aanzetten
    await fetch(`${API}/accounts/${ACCOUNT}/workers/scripts/${naam}/subdomain`, {
      method: "POST",
      headers: hdr(),
      body: JSON.stringify({ enabled: true, previews_enabled: false }),
    });

    return { url: `https://${naam}.${CF_SUBDOMEIN}.workers.dev` };
  } finally {
    await ruimWerkmapOp(werkmap).catch(() => {});
  }
}

/** Verwijdert een Cloudflare-site (worker). */
export async function verwijderCloudflareSite(naam: string) {
  await fetch(`${API}/accounts/${ACCOUNT}/workers/scripts/${naam}`, {
    method: "DELETE",
    headers: hdr(false),
  }).catch(() => {});
}
