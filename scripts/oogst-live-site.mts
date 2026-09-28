/**
 * Oogst een live site (WordPress, Webflow, YOOtheme, wat dan ook) naar de
 * standaard bron-map voor een migratie. Vast gereedschap sinds 28-09-2026;
 * hiervoor knutselde elke migratie zijn eigen kopie (Summit, undsqvrd).
 *
 * Gebruik (vanuit ~/wordpress2ai, daar staat playwright):
 *   npx tsx scripts/oogst-live-site.mts <basis-url> <bron-map> [topshots...]
 *
 *   basis-url  bv. https://www.voorbeeld.nl (zonder slash aan het eind)
 *   bron-map   bv. ~/wordswap-klanten/voorbeeld-bron
 *   topshots   slugs die naast de fullpage ook een viewport-top-screenshot
 *              krijgen (standaard: home)
 *
 * Verwacht <bron-map>/paden.txt (één pad per regel, "/" voor de homepage);
 * ontbreekt die, dan probeert het script hem zelf te vullen vanuit de
 * sitemap (robots.txt → Sitemap-regel, /sitemap.xml, /wp-sitemap.xml).
 * Schrijft: oud-ontwerp/alle/<slug>.html, screenshots desktop+mobiel,
 * seo-manifest.json, afbeeldingen-op-paginas.json, embeds-op-paginas.json.
 */
import { chromium } from "playwright";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const [basisRuw, bronRuw, ...topshotsArg] = process.argv.slice(2);
if (!basisRuw || !bronRuw) {
  console.error("Gebruik: npx tsx scripts/oogst-live-site.mts <basis-url> <bron-map> [topshots...]");
  process.exit(1);
}
const BASIS = basisRuw.replace(/\/$/, "");
const BRON = bronRuw.replace(/^~(?=\/)/, homedir());
const OUD = join(BRON, "oud-ontwerp");
const ALLE = join(OUD, "alle");
mkdirSync(ALLE, { recursive: true });
const TOPSHOTS = new Set(topshotsArg.length ? topshotsArg : ["home"]);

const slugVan = (pad: string) => (pad === "/" ? "home" : pad.replace(/^\/|\/$/g, "").replace(/\//g, "__"));

async function vindPaden(): Promise<string[]> {
  const padenBestand = join(BRON, "paden.txt");
  if (existsSync(padenBestand)) {
    return readFileSync(padenBestand, "utf8").trim().split("\n").map((r) => r.trim()).filter(Boolean);
  }
  console.log("Geen paden.txt; ik probeer de sitemap...");
  const kandidaten: string[] = [];
  try {
    const robots = await (await fetch(BASIS + "/robots.txt")).text();
    for (const m of robots.matchAll(/^sitemap:\s*(\S+)/gim)) kandidaten.push(m[1]);
  } catch {}
  kandidaten.push(BASIS + "/sitemap.xml", BASIS + "/wp-sitemap.xml", BASIS + "/sitemap_index.xml");
  const urls = new Set<string>();
  const leesSitemap = async (url: string, diepte: number) => {
    if (diepte > 2) return;
    try {
      const r = await fetch(url);
      if (!r.ok) return;
      const xml = await r.text();
      for (const m of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) {
        const loc = m[1].trim();
        if (/\.xml(\?|$)/.test(loc)) await leesSitemap(loc, diepte + 1);
        else if (loc.startsWith(BASIS) || loc.startsWith(BASIS.replace("://www.", "://"))) urls.add(loc);
      }
    } catch {}
  };
  for (const k of kandidaten) {
    await leesSitemap(k, 0);
    if (urls.size) break;
  }
  if (!urls.size) {
    console.error("Geen sitemap gevonden. Maak zelf " + padenBestand + " (één pad per regel) en draai opnieuw.");
    process.exit(1);
  }
  const paden = [...urls].map((u) => new URL(u).pathname).filter((p, i, a) => a.indexOf(p) === i).sort();
  if (!paden.includes("/")) paden.unshift("/");
  writeFileSync(padenBestand, paden.join("\n") + "\n");
  console.log(paden.length + " paden uit de sitemap → paden.txt (controleer en vul aan!)");
  return paden;
}

// Alles als string aan evaluate geven (tsx/__name-valkuil)
const EXTRACT = `(() => {
  const abs = (u) => { try { return new URL(u, location.href).href.split("?")[0]; } catch { return null; } };
  const imgs = new Set();
  document.querySelectorAll("img").forEach((img) => {
    for (const k of ["data-wpfc-original-src", "data-src", "src"]) {
      const u = img.getAttribute(k);
      if (u) { const a = abs(u); if (a) imgs.add(a); break; }
    }
    const ss = img.getAttribute("srcset") || img.getAttribute("data-srcset");
    if (ss) ss.split(",").forEach((d) => { const a = abs(d.trim().split(" ")[0]); if (a) imgs.add(a); });
  });
  document.querySelectorAll("source[srcset]").forEach((s) => {
    (s.getAttribute("srcset")||"").split(",").forEach((d) => { const a = abs(d.trim().split(" ")[0]); if (a) imgs.add(a); });
  });
  const bgs = new Set();
  document.querySelectorAll("*").forEach((el) => {
    const bi = getComputedStyle(el).backgroundImage;
    if (bi && bi !== "none") {
      const m = bi.match(/url\\(["']?([^"')]+)/g);
      if (m) m.forEach((x) => { const a = abs(x.replace(/url\\(["']?/, "")); if (a && !a.startsWith("data:")) bgs.add(a); });
    }
  });
  const embeds = [];
  document.querySelectorAll("iframe").forEach((f) => embeds.push({ soort: "iframe", src: f.src, html: f.outerHTML.slice(0, 500) }));
  document.querySelectorAll("video").forEach((v) => embeds.push({ soort: "video", src: v.currentSrc || v.src, html: v.outerHTML.slice(0, 500) }));
  const jsonld = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) => s.textContent);
  const meta = (n) => document.querySelector('meta[name="' + n + '"]')?.getAttribute("content") || "";
  const prop = (p) => document.querySelector('meta[property="' + p + '"]')?.getAttribute("content") || "";
  return {
    titel: document.title,
    beschrijving: meta("description"),
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "",
    robots: meta("robots"),
    ogImage: prop("og:image"), ogTitle: prop("og:title"), ogDesc: prop("og:description"), ogType: prop("og:type"),
    h1: Array.from(document.querySelectorAll("h1")).map((h) => h.textContent.trim()),
    imgs: [...imgs], bgs: [...bgs], embeds, jsonld,
    favicon: document.querySelector('link[rel~="icon"]')?.getAttribute("href") || "",
    formulieren: Array.from(document.querySelectorAll("form")).map((f) => ({
      action: f.getAttribute("action") || "", velden: Array.from(f.querySelectorAll("input,textarea,select")).map((i) => ({ tag: i.tagName.toLowerCase(), type: i.getAttribute("type") || "", name: i.getAttribute("name") || "", placeholder: i.getAttribute("placeholder") || "", required: i.hasAttribute("required") || i.getAttribute("aria-required") === "true" })),
    })),
  };
})()`;

const SCROLL = `new Promise((klaar) => { let y = 0; const t = setInterval(() => { y += 600; window.scrollTo(0, y); if (y >= document.body.scrollHeight) { clearInterval(t); setTimeout(() => { window.scrollTo(0, 0); setTimeout(klaar, 400); }, 600); } }, 120); })`;

(async () => {
  const paden = await vindPaden();
  const browser = await chromium.launch();
  const seoManifest: any = { bron: BASIS, paginas: [] };
  const afbeeldingen: any = {}, embedsAlles: any = {};

  const ctxD = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36" });
  const ctxM = await browser.newContext({ viewport: { width: 375, height: 812 }, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", isMobile: true, hasTouch: true });
  const pD = await ctxD.newPage(); const pM = await ctxM.newPage();

  let fouten = 0;
  for (const pad of paden) {
    const slug = slugVan(pad); const url = BASIS + pad;
    try {
      await pD.goto(url, { waitUntil: "networkidle", timeout: 45000 });
      await pD.evaluate(SCROLL);
      const html = await pD.content();
      writeFileSync(join(ALLE, slug + ".html"), html);
      const d: any = await pD.evaluate(EXTRACT);
      await pD.screenshot({ path: join(OUD, "screenshot-desktop-" + slug + ".png"), fullPage: true });
      if (TOPSHOTS.has(slug)) {
        await pD.evaluate("window.scrollTo(0,0)");
        await pD.screenshot({ path: join(OUD, "viewport-top-" + slug + ".png") });
      }
      await pM.goto(url, { waitUntil: "networkidle", timeout: 45000 });
      await pM.evaluate(SCROLL);
      await pM.screenshot({ path: join(OUD, "screenshot-mobiel-" + slug + ".png"), fullPage: true });
      seoManifest.paginas.push({ pad, slug, titel: d.titel, beschrijving: d.beschrijving, canonical: d.canonical, robots: d.robots, ogImage: d.ogImage, ogTitle: d.ogTitle, ogDesc: d.ogDesc, ogType: d.ogType, h1: d.h1, favicon: d.favicon, jsonld: d.jsonld, formulieren: d.formulieren });
      afbeeldingen[pad] = { imgs: d.imgs, achtergronden: d.bgs };
      embedsAlles[pad] = d.embeds;
      const leeg = html.length < 5000 || !d.titel;
      if (leeg) fouten++;
      console.log((leeg ? "⚠️ LEEG? " : "✓ ") + pad + "  (" + Math.round(html.length / 1024) + " kB, " + d.imgs.length + " imgs, " + d.embeds.length + " embeds, " + d.formulieren.length + " forms)");
      await new Promise((r) => setTimeout(r, 800));
    } catch (e: any) {
      fouten++;
      console.log("✗ FOUT " + pad + ": " + e.message);
    }
  }
  writeFileSync(join(BRON, "seo-manifest.json"), JSON.stringify(seoManifest, null, 2));
  writeFileSync(join(OUD, "afbeeldingen-op-paginas.json"), JSON.stringify(afbeeldingen, null, 2));
  writeFileSync(join(OUD, "embeds-op-paginas.json"), JSON.stringify(embedsAlles, null, 2));
  await browser.close();
  console.log("Klaar: " + seoManifest.paginas.length + "/" + paden.length + " pagina's" + (fouten ? " — LET OP: " + fouten + " lege/mislukte pagina's, controleer vóór je bouwt" : ""));
  if (fouten) process.exitCode = 2;
})();
