import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { laadDelen, vouwUit } from "./delen";
import { laadWerkmap, ruimWerkmapOp } from "./werkmap";

const API = "https://api.cloudflare.com/client/v4";

// Meldt in het portaal-venster welke pagina open staat en ondersteunt de
// aanwijs-modus (element aanklikken in de preview). Doet niets buiten een iframe.
const PAGINA_MELDER =
  '<script>(function(){try{if(parent===window)return;parent.postMessage({type:"wp2ai-pagina",pad:location.pathname},"*");var aan=false,vorig=null;function reset(){if(vorig){vorig.style.outline="";vorig=null}document.body.style.cursor=""}addEventListener("message",function(e){if(e.data&&e.data.type==="wp2ai-aanwijzen"){aan=!!e.data.aan;document.body.style.cursor=aan?"crosshair":"";if(!aan)reset()}});addEventListener("mouseover",function(e){if(!aan)return;if(vorig)vorig.style.outline="";vorig=e.target;vorig.style.outline="3px solid #7c3aed"},true);addEventListener("click",function(e){if(!aan)return;e.preventDefault();e.stopPropagation();var el=e.target;var cs=getComputedStyle(el);parent.postMessage({type:"wp2ai-selectie",pad:location.pathname,tag:el.tagName.toLowerCase(),tekst:(el.innerText||el.getAttribute("alt")||"").trim().slice(0,200),html:el.outerHTML.slice(0,1500),kleuren:{achtergrond:cs.backgroundColor,tekst:cs.color}},"*");aan=false;reset()},true)}catch(e){}})();</script>';
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
  return deployRepoNaarCloudflareRef(repo, naam);
}

/** Als deployRepoNaarCloudflare, maar vanaf een specifieke branch/commit. */
export async function deployRepoNaarCloudflareRef(
  repo: string,
  naam: string,
  ref?: string
) {
  const werkmap = await laadWerkmap(repo, ref);
  try {
    return await deployMapNaarCloudflare(werkmap, naam);
  } finally {
    await ruimWerkmapOp(werkmap).catch(() => {});
  }
}

/** Deployt een lokale map als statische site op Cloudflare Workers. */
export async function deployMapNaarCloudflare(
  werkmap: string,
  naam: string,
  opties: { subdomeinAanzetten?: boolean } = {}
) {
  const { subdomeinAanzetten = true } = opties;
  {
    const bestanden = await alleBestanden(werkmap);
    const delen = await laadDelen(werkmap);
    const inhoudPerHash = new Map<string, { data: Buffer; pad: string }>();
    const manifest: Record<string, { hash: string; size: number }> = {};
    // Deploy-stempel: het portaal herkent hieraan of de nieuwe versie al
    // doorgedrongen is bij Cloudflare (en ververst anders zelf nog een keer)
    const stempel = `<script>try{parent!==window&&parent.postMessage({type:"wp2ai-stempel",stempel:${Date.now()}},"*")}catch(e){}</script>`;
    for (const pad of bestanden) {
      let data = await readFile(path.join(werkmap, pad));
      if (/\.html?$/i.test(pad) && !pad.startsWith("delen/")) {
        // Eerder ingebakken wp2ai-hulpscripts (oude versies) altijd eerst
        // verwijderen, zodat elke deploy de nieuwste versie meekrijgt
        let html = vouwUit(data.toString("utf8"), delen).replace(
          /<script>[^<]*wp2ai[^<]*<\/script>/g,
          ""
        );
        const injectie = PAGINA_MELDER + stempel;
        html = html.includes("</body>")
          ? html.replace("</body>", `${injectie}</body>`)
          : html + injectie;
        data = Buffer.from(html);
      }
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

    // 3. Worker publiceren — met een klein script dat workers.dev-adressen
    // op noindex zet (voorkomt duplicate content naast het echte klantdomein)
    const metadata = {
      main_module: "worker.js",
      compatibility_date: "2025-01-01",
      assets: {
        jwt: completionJwt,
        config: {
          html_handling: "auto-trailing-slash",
          not_found_handling: "404-page",
          run_worker_first: true,
        },
      },
      bindings: [{ name: "ASSETS", type: "assets" }],
    };
    const workerScript = `export default {
  async fetch(request, env) {
    let res;
    try {
      res = await env.ASSETS.fetch(request);
    } catch (e) {
      return new Response("Pagina niet gevonden", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    try {
      if (
        new URL(request.url).hostname.endsWith(".workers.dev") &&
        res.status === 200
      ) {
        const r = new Response(res.body, {
          status: res.status,
          statusText: res.statusText,
          headers: new Headers(res.headers),
        });
        r.headers.set("X-Robots-Tag", "noindex, nofollow");
        return r;
      }
    } catch (e) {}
    return res;
  },
};
`;
    const publiceerForm = new FormData();
    publiceerForm.append(
      "metadata",
      new File([JSON.stringify(metadata)], "metadata.json", {
        type: "application/json",
      })
    );
    publiceerForm.append(
      "worker.js",
      new File([workerScript], "worker.js", { type: "application/javascript+module" })
    );
    const publiceer = (await fetch(
      `${API}/accounts/${ACCOUNT}/workers/scripts/${naam}`,
      { method: "PUT", headers: hdr(false), body: publiceerForm }
    ).then((r) => r.json())) as { success: boolean; errors?: unknown[] };
    if (!publiceer.success) {
      throw new Error(`Publiceren mislukt: ${JSON.stringify(publiceer.errors)}`);
    }

    // 4. workers.dev-URL aanzetten (overslaan bij her-deploys: staat dan al aan)
    if (subdomeinAanzetten) {
      await fetch(`${API}/accounts/${ACCOUNT}/workers/scripts/${naam}/subdomain`, {
        method: "POST",
        headers: hdr(),
        body: JSON.stringify({ enabled: true, previews_enabled: false }),
      });
    }

    return { url: `https://${naam}.${CF_SUBDOMEIN}.workers.dev` };
  }
}

/** Verwijdert een Cloudflare-site (worker). */
export async function verwijderCloudflareSite(naam: string) {
  await fetch(`${API}/accounts/${ACCOUNT}/workers/scripts/${naam}`, {
    method: "DELETE",
    headers: hdr(false),
  }).catch(() => {});
}

/** Verwijdert alle persoonlijke demo-voorbeeld-workers (wvd-<repo>-…) van een demo-site. */
export async function verwijderDemoWorkers(repo: string, spaarHashes?: Set<string>) {
  const lijst = (await fetch(`${API}/accounts/${ACCOUNT}/workers/scripts`, {
    headers: hdr(),
  }).then((r) => r.json())) as { result?: { id: string }[] };
  const prefixen = [`wvd-${repo}-`, `wvl-${repo}-`];
  for (const script of lijst.result ?? []) {
    const prefix = prefixen.find((p) => script.id.startsWith(p));
    if (!prefix) continue;
    const hash = script.id.slice(prefix.length);
    if (spaarHashes?.has(hash)) continue; // sandbox is net nog gebruikt
    await fetch(`${API}/accounts/${ACCOUNT}/workers/scripts/${script.id}`, {
      method: "DELETE",
      headers: hdr(),
    }).catch(() => {});
  }
}
