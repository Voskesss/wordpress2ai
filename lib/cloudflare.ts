import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { laadDelen, vouwUit } from "./delen";
import { laadWerkmap, ruimWerkmapOp } from "./werkmap";

const API = "https://api.cloudflare.com/client/v4";

// Meldt in het portaal-venster welke pagina open staat en ondersteunt de
// aanwijs-modus (element aanklikken in de preview). Doet niets buiten een iframe.
export const PAGINA_MELDER =
  '<script>(function(){try{if(parent===window)return;parent.postMessage({type:"wp2ai-pagina",pad:location.pathname},"*");var aan=false,vorig=null,kandidaat=null,tx=0,ty=0;function reset(){if(vorig){vorig.style.outline="";vorig=null}kandidaat=null;document.body.style.cursor=""}function stuur(el){var cs=getComputedStyle(el);parent.postMessage({type:"wp2ai-selectie",pad:location.pathname,tag:el.tagName.toLowerCase(),tekst:(el.innerText||el.getAttribute("alt")||"").trim().slice(0,200),html:el.outerHTML.slice(0,1500),kleuren:{achtergrond:cs.backgroundColor,tekst:cs.color}},"*");aan=false;reset()}addEventListener("message",function(e){if(e.data&&e.data.type==="wp2ai-tekst-live"&&e.data.zoek){try{var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),n;var z=String(e.data.zoek),v=String(e.data.vervang||"");while((n=w.nextNode())){var t=n.textContent||"";var i=t.replace(/\s+/g," ").indexOf(z);if(t.indexOf(z)>=0||i>=0){var el=n.parentElement;n.textContent=t.indexOf(z)>=0?t.replace(z,v):v;if(el){el.style.transition="background .3s";var oud=el.style.background;el.style.background="#fef3c7";setTimeout(function(){el.style.background=oud},1200);el.scrollIntoView({behavior:"smooth",block:"center"})}break}}}catch(x){}}if(e.data&&e.data.type==="wp2ai-aanwijzen"){aan=!!e.data.aan;document.body.style.cursor=aan?"crosshair":"";if(!aan)reset()}if(e.data&&e.data.type==="wp2ai-aanwijs-bevestig"&&kandidaat){stuur(kandidaat)}});addEventListener("mouseover",function(e){if(!aan)return;if(vorig)vorig.style.outline="";vorig=e.target;vorig.style.outline="3px solid #7c3aed"},true);addEventListener("click",function(e){if(!aan)return;e.preventDefault();e.stopPropagation();stuur(e.target)},true);addEventListener("touchstart",function(e){if(!aan||!e.touches[0])return;tx=e.touches[0].clientX;ty=e.touches[0].clientY},true);addEventListener("touchend",function(e){if(!aan)return;var t=e.changedTouches&&e.changedTouches[0];if(!t)return;if(Math.abs(t.clientX-tx)>12||Math.abs(t.clientY-ty)>12)return;e.preventDefault();e.stopPropagation();var el=document.elementFromPoint(t.clientX,t.clientY);if(!el||el===document.body||el===document.documentElement)return;if(vorig)vorig.style.outline="";vorig=el;kandidaat=el;el.style.outline="3px solid #7c3aed";parent.postMessage({type:"wp2ai-aanwijs-focus",tag:el.tagName.toLowerCase(),tekst:(el.innerText||el.getAttribute("alt")||"").trim().slice(0,80)},"*")},{capture:true,passive:false})}catch(e){}})();</script>';
const ACCOUNT = "2a71da7bfe94ae3540d4af02be53d53e";
export const CF_SUBDOMEIN = "wordswap";

function hdr(json = true): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
  };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

/** Werkmappen en instructiebestanden die nooit publiek horen te staan.
 * "delen" bevat de bouwstenen die bij deploy al in de pagina's zijn gezet. */
const NIET_PUBLIEK_MAPPEN = new Set([".git", ".github", "delen", "wp2ai-controle"]);
const NIET_PUBLIEK_BESTANDEN = new Set([
  "_redirects",
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  ".gitignore",
  ".DS_Store",
]);

async function alleBestanden(dir: string, basis = dir): Promise<string[]> {
  const items = await readdir(dir, { withFileTypes: true });
  const paden: string[] = [];
  for (const item of items) {
    const vol = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (NIET_PUBLIEK_MAPPEN.has(item.name)) continue;
      paden.push(...(await alleBestanden(vol, basis)));
    } else {
      if (NIET_PUBLIEK_BESTANDEN.has(item.name)) continue;
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

/** Het echte klantdomein bij een worker-naam (live of wv-werkversie), zoals
 * ingevuld op de admin-klantpagina. Null zolang de site nog op workers.dev
 * draait. Hiermee vervangt de deploy automatisch het placeholder-domein
 * https://VERVANG.nl in canonical/og-tags, sitemap en robots — zodat dat nooit
 * meer vergeten kan worden bij het koppelen van een domein. */
export async function echtDomeinVoor(naam: string): Promise<string | null> {
  const repo = naam.replace(/^wv-/, "");
  try {
    const { db } = await import("../db");
    const { sites } = await import("../db/schema");
    const { eq, or } = await import("drizzle-orm");
    const [site] = await db
      .select({ domein: sites.domein })
      .from(sites)
      .where(or(eq(sites.githubRepo, repo), eq(sites.netlifySiteId, naam)))
      .limit(1);
    const d = (site?.domein ?? "").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
    if (!d || !d.includes(".") || /\.workers\.dev$/.test(d)) return null;
    return d;
  } catch {
    return null;
  }
}

/** Vervangt het placeholder-domein door het echte domein (alleen als dat bekend is). */
export function vervangPlaceholderDomein(tekst: string, domein: string | null): string {
  if (!domein) return tekst;
  return tekst.replace(/https?:\/\/VERVANG\.nl/gi, `https://${domein}`).replace(/\bVERVANG\.nl\b/g, domein);
}

/** Mime-type op basis van de extensie (voor uploads en de assets-variant). */
export function mimeVoorPad(pad: string): string {
  const ext = (pad.split(".").pop() ?? "").toLowerCase();
  return (
    {
      html: "text/html; charset=utf-8",
      htm: "text/html; charset=utf-8",
      css: "text/css; charset=utf-8",
      js: "text/javascript; charset=utf-8",
      mjs: "text/javascript; charset=utf-8",
      json: "application/json",
      svg: "image/svg+xml",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      gif: "image/gif",
      ico: "image/x-icon",
      avif: "image/avif",
      xml: "application/xml",
      txt: "text/plain; charset=utf-8",
      md: "text/markdown; charset=utf-8",
      woff2: "font/woff2",
      woff: "font/woff",
      ttf: "font/ttf",
      mp4: "video/mp4",
      webm: "video/webm",
      mp3: "audio/mpeg",
      pdf: "application/pdf",
    }[ext] ?? "application/octet-stream"
  );
}

/** Maakt de publiceerbare bestanden van een werkmap klaar: delen-markers
 * uitvouwen, meldscript en deploy-stempel injecteren, placeholder-domein
 * vervangen. Gedeeld door de R2- en de assets-variant. */
async function bereidBestandenVoor(
  werkmap: string,
  naam: string
): Promise<{ pad: string; data: Buffer }[]> {
  const bestanden = await alleBestanden(werkmap);
  const delen = await laadDelen(werkmap);
  const echtDomein = await echtDomeinVoor(naam);
  const uit: { pad: string; data: Buffer }[] = [];
  for (const pad of bestanden) {
    let data = await readFile(path.join(werkmap, pad));
    if (/\.html?$/i.test(pad) && !pad.startsWith("delen/")) {
      // Eerder ingebakken wp2ai-hulpscripts (oude versies) altijd eerst
      // verwijderen, zodat elke deploy de nieuwste versie meekrijgt
      let html = vouwUit(data.toString("utf8"), delen).replace(
        /<script>[^<]*wp2ai[^<]*<\/script>/g,
        ""
      );
      const injectie = PAGINA_MELDER;
      html = html.includes("</body>")
        ? html.replace("</body>", `${injectie}</body>`)
        : html + injectie;
      data = Buffer.from(vervangPlaceholderDomein(html, echtDomein));
    } else if (echtDomein && /\.(xml|txt)$/i.test(pad)) {
      // sitemap.xml, robots.txt, llms.txt
      data = Buffer.from(vervangPlaceholderDomein(data.toString("utf8"), echtDomein));
    }
    uit.push({ pad, data });
  }
  // _redirects is bewust geen publiek bestand, maar het R2-script heeft hem nodig
  try {
    uit.push({ pad: "_redirects", data: await readFile(path.join(werkmap, "_redirects")) });
  } catch {
    // geen _redirects: prima
  }
  return uit;
}

/** Deployt een lokale map als statische site op Cloudflare Workers: alleen
 * gewijzigde bestanden naar R2 schrijven en het vaste leesscript één keer per
 * site (of bij een nieuwe scriptversie) publiceren. R2 is direct consistent,
 * dus de nieuwe versie is meteen overal zichtbaar. Zie docs/r2-architectuur.md. */
export async function deployMapNaarCloudflare(
  werkmap: string,
  naam: string,
  opties: { subdomeinAanzetten?: boolean } = {}
) {
  const { subdomeinAanzetten = true } = opties;
  const { zorgBucket, schrijfObject, leesObject, verwijderObject, parallel, R2_TEGELIJK } = await import("./r2");
  const bestanden = await bereidBestandenVoor(werkmap, naam);
  const prefix = naam;

  await zorgBucket();
  // Manifest van de vorige deploy: alleen het verschil hoeft naar R2
  let oudManifest: Record<string, string> = {};
  try {
    const m = await leesObject(`${prefix}/.manifest.json`);
    if (m) oudManifest = JSON.parse(m.toString("utf8")) as Record<string, string>;
  } catch {
    oudManifest = {};
  }
  const nieuwManifest: Record<string, string> = {};
  const teSchrijven: { pad: string; data: Buffer }[] = [];
  for (const b of bestanden) {
    const hash = createHash("sha256").update(b.data).digest("hex").slice(0, 32);
    nieuwManifest[b.pad] = hash;
    if (oudManifest[b.pad] !== hash) teSchrijven.push(b);
  }
  const teVerwijderen = Object.keys(oudManifest).filter((pad) => !(pad in nieuwManifest));

  // Eerst de niet-HTML-bestanden (css, beelden), dan de pagina's: zo verwijst
  // een nieuwe pagina nooit naar iets dat nog onderweg is
  const isHtml = (pad: string) => /\.html?$/i.test(pad);
  const volgorde = [...teSchrijven.filter((b) => !isHtml(b.pad)), ...teSchrijven.filter((b) => isHtml(b.pad))];
  // Wat al gelukt is, wordt bij een storing toch in het manifest vastgelegd:
  // een volgende poging hoeft dan alleen de rest nog te doen
  const gelukt = new Set<string>();
  try {
    await parallel(volgorde, R2_TEGELIJK, async (b) => {
      await schrijfObject(`${prefix}/${b.pad}`, b.data, mimeVoorPad(b.pad));
      gelukt.add(b.pad);
    });
    await parallel(teVerwijderen, R2_TEGELIJK, (pad) => verwijderObject(`${prefix}/${pad}`));
    await schrijfObject(`${prefix}/.manifest.json`, JSON.stringify(nieuwManifest), "application/json");
  } catch (e) {
    const deels: Record<string, string> = { ...oudManifest };
    for (const pad of gelukt) deels[pad] = nieuwManifest[pad];
    await schrijfObject(`${prefix}/.manifest.json`, JSON.stringify(deels), "application/json").catch(() => {});
    throw e;
  }

  await zorgWorkerR2(naam, prefix, subdomeinAanzetten);
  return { url: `https://${naam}.${CF_SUBDOMEIN}.workers.dev` };
}

/** Publiceert het vaste R2-leesscript voor een site, maar alleen als de worker
 * nog niet bestaat of een oudere scriptversie draait. */
async function zorgWorkerR2(naam: string, prefix: string, subdomeinAanzetten: boolean) {
  const { R2_SCRIPT_VERSIE, R2_WORKER_SCRIPT } = await import("./worker-r2");
  const { R2_BUCKET } = await import("./r2");
  try {
    const huidig = (await fetch(`${API}/accounts/${ACCOUNT}/workers/scripts/${naam}/settings`, {
      headers: hdr(),
    }).then((r) => (r.ok ? r.json() : null))) as {
      result?: { bindings?: { type: string; name: string; text?: string }[] };
    } | null;
    const b = huidig?.result?.bindings ?? [];
    const versie = b.find((x) => x.type === "plain_text" && x.name === "VERSIE")?.text;
    const pre = b.find((x) => x.type === "plain_text" && x.name === "PREFIX")?.text;
    if (versie === R2_SCRIPT_VERSIE && pre === prefix) return; // al goed
  } catch {
    // bij twijfel gewoon (opnieuw) publiceren
  }
  const metadata = {
    main_module: "worker.js",
    compatibility_date: "2025-01-01",
    bindings: [
      { type: "r2_bucket", name: "SITES", bucket_name: R2_BUCKET },
      { type: "plain_text", name: "PREFIX", text: prefix },
      { type: "plain_text", name: "VERSIE", text: R2_SCRIPT_VERSIE },
    ],
  };
  const form = new FormData();
  form.append("metadata", new File([JSON.stringify(metadata)], "metadata.json", { type: "application/json" }));
  form.append("worker.js", new File([R2_WORKER_SCRIPT], "worker.js", { type: "application/javascript+module" }));
  const publiceer = (await fetch(`${API}/accounts/${ACCOUNT}/workers/scripts/${naam}`, {
    method: "PUT",
    headers: hdr(false),
    body: form,
  }).then((r) => r.json())) as { success: boolean; errors?: unknown[] };
  if (!publiceer.success) {
    throw new Error(`Worker publiceren mislukt: ${JSON.stringify(publiceer.errors)}`);
  }
  if (subdomeinAanzetten) {
    await fetch(`${API}/accounts/${ACCOUNT}/workers/scripts/${naam}/subdomain`, {
      method: "POST",
      headers: hdr(),
      body: JSON.stringify({ enabled: true, previews_enabled: false }),
    });
  }
}

/** Verwijdert een Cloudflare-site (worker). */
export async function verwijderCloudflareSite(naam: string) {
  await fetch(`${API}/accounts/${ACCOUNT}/workers/scripts/${naam}`, {
    method: "DELETE",
    headers: hdr(false),
  }).catch(() => {});
  const { verwijderPrefix } = await import("./r2");
  await verwijderPrefix(naam).catch(() => {});
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
    const { verwijderPrefix } = await import("./r2");
    await verwijderPrefix(script.id).catch(() => {});
  }
}
