import { query } from "@anthropic-ai/claude-agent-sdk";
import sharp from "sharp";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { db } from "@/db";
import { migrations, sites } from "@/db/schema";
import { maakKlantRepo, pushBestanden, repoBestaat, lijstBestanden } from "@/lib/github";
import { laadWerkmap } from "@/lib/werkmap";
import { HUISREGELS } from "@/lib/huisregels";
import { ruimWerkmapOp } from "@/lib/werkmap";
import { maakSeoManifest, parseWxr } from "@/lib/wxr";

const MAX_MEDIA = 30;

// Opgeteld AI-verbruik van de lopende bouw (hoofdbouw + verbeterrondes);
// wordt per job gereset in voerBouwUit en daarna per site geregistreerd.
export const bouwVerbruik = { tokensIn: 0, tokensUit: 0, kostenUsd: 0 };

export function telResultaatMee(message: unknown) {
  const m = message as {
    type?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
    total_cost_usd?: number;
  };
  if (m.type !== "result") return;
  bouwVerbruik.tokensIn +=
    (m.usage?.input_tokens ?? 0) +
    (m.usage?.cache_creation_input_tokens ?? 0) +
    (m.usage?.cache_read_input_tokens ?? 0);
  bouwVerbruik.tokensUit += m.usage?.output_tokens ?? 0;
  bouwVerbruik.kostenUsd += m.total_cost_usd ?? 0;
}

const PORTAL_SNIPPET =
  '<script>try{parent.postMessage({type:"wp2ai-pagina",pad:location.pathname},"*")}catch(e){}</script>';

async function alleBestanden(dir: string, basis = dir): Promise<string[]> {
  const items = await readdir(dir, { withFileTypes: true });
  const paden: string[] = [];
  for (const item of items) {
    const vol = path.join(dir, item.name);
    if (item.isDirectory()) paden.push(...(await alleBestanden(vol, basis)));
    else paden.push(path.relative(basis, vol));
  }
  return paden;
}


/** Haalt het echte ontwerp van de live site op: gerenderde HTML, CSS en screenshots. */
async function haalLiveOntwerp(
  bronUrl: string,
  paden: string[],
  doelDir: string,
  stuur: (tekst: string) => void | Promise<void>
) {
  const afbeeldingUrls = new Set<string>();
  const afbeeldingenPerPagina: Record<string, { src: string; alt: string }[]> = {};
  const embedsPerPagina: Record<string, { html: string }[]> = {};
  if (!bronUrl.startsWith("http"))
    return { paginas: 0, screenshots: 0, afbeeldingUrls: [] as string[] };
  await mkdir(doelDir, { recursive: true });
  let paginasOpgehaald = 0;
  const cssUrls = new Set<string>();

  const tePakken = paden.slice(0, 12);
  for (const pad of tePakken) {
    try {
      const res = await fetch(new URL(pad, bronUrl).href, {
        signal: AbortSignal.timeout(15000),
        headers: { "User-Agent": "Mozilla/5.0 (WordSwap Migrator)" },
      });
      if (!res.ok) continue;
      const html = await res.text();
      const naam = (pad.replace(/\//g, "-").replace(/^-|-$/g, "") || "home") + ".html";
      await writeFile(path.join(doelDir, naam), html);
      paginasOpgehaald++;
      for (const m of html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/g)) {
        try {
          cssUrls.add(new URL(m[1], bronUrl).href);
        } catch {}
      }
      for (const m of html.matchAll(/href=["']([^"']+)["'][^>]*rel=["']stylesheet["']/g)) {
        try {
          cssUrls.add(new URL(m[1], bronUrl).href);
        } catch {}
      }
      // Afbeeldingen op deze pagina vastleggen (img-tags én inline achtergronden)
      const paginaImgs: { src: string; alt: string }[] = [];
      // Lazy-load- en slider-attributen (Revolution Slider e.d.)
      for (const m of html.matchAll(/(?:data-src|data-lazy-src|data-lazyload|data-bg|data-thumb|data-background)=["']([^"']+)["']/gi)) {
        try {
          const u = new URL(m[1], bronUrl).href;
          if (/\.(png|jpe?g|webp|gif|svg)([?#]|$)/i.test(u)) {
            afbeeldingUrls.add(u);
            paginaImgs.push({ src: u, alt: "(slider/lazy)" });
          }
        } catch {}
      }
      for (const m of html.matchAll(/srcset=["']([^"']+)["']/gi)) {
        for (const deel of m[1].split(",")) {
          try {
            const u = new URL(deel.trim().split(/\s+/)[0], bronUrl).href;
            if (/\.(png|jpe?g|webp)([?#]|$)/i.test(u)) afbeeldingUrls.add(u);
          } catch {}
        }
      }
      for (const m of html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/g)) {
        try {
          const u = new URL(m[1], bronUrl).href;
          if (/\.(png|jpe?g|webp|gif|svg)([?#]|$)/i.test(u)) {
            afbeeldingUrls.add(u);
            const alt = /alt=["']([^"']*)["']/.exec(m[0])?.[1] ?? "";
            paginaImgs.push({ src: u, alt });
          }
        } catch {}
      }
      for (const m of html.matchAll(/url\((['"]?)([^)'"]+)\1\)/g)) {
        try {
          const u = new URL(m[2], bronUrl).href;
          if (/\.(png|jpe?g|webp|gif)([?#]|$)/i.test(u)) {
            afbeeldingUrls.add(u);
            paginaImgs.push({ src: u, alt: "(achtergrond)" });
          }
        } catch {}
      }
      afbeeldingenPerPagina[pad] = paginaImgs;
      // Embeds (YouTube/Vimeo/Maps-iframes, video's) op deze pagina vastleggen
      const paginaEmbeds: { html: string }[] = [];
      for (const m of html.matchAll(/<iframe[^>]*src=["'][^"']*(youtube|youtu\.be|vimeo|google\.com\/maps|maps\.google)[^"']*["'][^>]*>(<\/iframe>)?/gi)) {
        paginaEmbeds.push({ html: m[0].slice(0, 600) });
      }
      for (const m of html.matchAll(/<video[^>]*>[\s\S]{0,400}?<\/video>/gi)) {
        paginaEmbeds.push({ html: m[0].slice(0, 600) });
      }
      if (paginaEmbeds.length > 0) embedsPerPagina[pad] = paginaEmbeds;
    } catch {}
  }

  let cssN = 0;
  for (const url of [...cssUrls].slice(0, 12)) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) continue;
      const css = await res.text();
      await writeFile(path.join(doelDir, `stijl-${cssN++}.css`), css);
      // Decoratieve beelden die alleen in de CSS leven (wolken, patronen,
      // iconen): url(...)-verwijzingen oplossen t.o.v. het CSS-bestand zelf
      for (const m of css.matchAll(/url\((['"]?)([^)'"]+)\1\)/g)) {
        try {
          const u = new URL(m[2], url).href;
          if (/\.(png|jpe?g|webp|gif|svg)([?#]|$)/i.test(u)) {
            afbeeldingUrls.add(u);
          }
        } catch {}
      }
    } catch {}
  }

  // Screenshots met een echte browser (alleen beschikbaar in de worker/Actions)
  let screenshots = 0;
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch();
    for (const [label, viewport] of [
      ["desktop", { width: 1280, height: 900 }],
      ["mobiel", { width: 375, height: 812 }],
    ] as const) {
      const page = await browser.newPage({ viewport });
      for (const pad of tePakken.slice(0, 5)) {
        try {
          await page.goto(new URL(pad, bronUrl).href, {
            waitUntil: "networkidle",
            timeout: 20000,
          });
          const naam = (pad.replace(/\//g, "-").replace(/^-|-$/g, "") || "home");
          await page.screenshot({
            path: path.join(doelDir, `screenshot-${label}-${naam}.png`),
            fullPage: true,
          });
          screenshots++;
          await stuur(`Screenshot van de oude site: ${naam} (${label})`);
          if (label === "desktop") {
            // Ontwerp-bestek: gemeten stijlen, secties en embeds — feiten i.p.v. interpretatie
            const bestek = await page.evaluate(() => {
              const stijl = (el: Element) => {
                const c = getComputedStyle(el as HTMLElement);
                return {
                  font: c.fontFamily.split(",")[0].replace(/["']/g, ""),
                  size: c.fontSize,
                  weight: c.fontWeight,
                  kleur: c.color,
                  achtergrond: c.backgroundColor,
                };
              };
              const pak = (sel: string) => {
                const el = document.querySelector(sel);
                return el ? stijl(el) : null;
              };
              const kleuren = new Map<string, number>();
              document.querySelectorAll("*").forEach((el) => {
                const c = getComputedStyle(el as HTMLElement);
                for (const k of [c.backgroundColor, c.color]) {
                  if (k && k !== "rgba(0, 0, 0, 0)")
                    kleuren.set(k, (kleuren.get(k) ?? 0) + 1);
                }
              });
              const knop = document.querySelector(
                "a[class*='btn'],button,a[class*='button'],.wp-block-button a"
              );
              const secties: object[] = [];
              document
                .querySelectorAll("body > *, main > *, #page > *, .site > *")
                .forEach((el) => {
                  const h = (el as HTMLElement).offsetHeight;
                  if (h < 40) return;
                  const c = getComputedStyle(el as HTMLElement);
                  secties.push({
                    tag: el.tagName.toLowerCase(),
                    class: (el.className || "").toString().slice(0, 80),
                    hoogte: h,
                    achtergrond: c.backgroundColor,
                    achtergrondAfbeelding:
                      c.backgroundImage !== "none" ? c.backgroundImage.slice(0, 200) : null,
                    tekst: (el.textContent || "").trim().slice(0, 120),
                  });
                });
              // Alle beelden zoals de browser ze ECHT toont (vangt sliders,
              // lazy-load en JS-injectie af, ongeacht de plugin)
              const gerenderdeBeelden: { src: string; alt: string }[] = [];
              document.querySelectorAll("img").forEach((img) => {
                const src = (img as HTMLImageElement).currentSrc || img.getAttribute("src") || "";
                if (src) gerenderdeBeelden.push({ src, alt: img.getAttribute("alt") ?? "" });
              });
              document.querySelectorAll("*").forEach((el) => {
                const bg = getComputedStyle(el as HTMLElement).backgroundImage;
                const m = /url\(["']?([^"')]+)["']?\)/.exec(bg ?? "");
                if (m) gerenderdeBeelden.push({ src: m[1], alt: "(achtergrond)" });
              });
              const embeds: object[] = [];
              document.querySelectorAll("iframe, video, audio").forEach((el) => {
                const src = el.getAttribute("src") ?? "";
                embeds.push({
                  tag: el.tagName.toLowerCase(),
                  src,
                  breedte: (el as HTMLElement).offsetWidth,
                  hoogte: (el as HTMLElement).offsetHeight,
                  html: el.outerHTML.slice(0, 600),
                });
              });
              return {
                gerenderdeBeelden: gerenderdeBeelden.slice(0, 60),
                body: pak("body"),
                h1: pak("h1"),
                h2: pak("h2"),
                nav: pak("nav, header"),
                knop: knop ? stijl(knop) : null,
                topKleuren: [...kleuren.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 12)
                  .map(([k]) => k),
                secties: secties.slice(0, 20),
                embeds,
              };
            });
            await writeFile(
              path.join(doelDir, `bestek-${naam}.json`),
              JSON.stringify(bestek, null, 1)
            );
            for (const b of (bestek as { gerenderdeBeelden?: { src: string; alt: string }[] }).gerenderdeBeelden ?? []) {
              try {
                const u = new URL(b.src, bronUrl).href;
                if (/\.(png|jpe?g|webp|gif|svg)([?#]|$)/i.test(u)) {
                  afbeeldingUrls.add(u);
                  (afbeeldingenPerPagina[pad] ??= []).push({ src: u, alt: b.alt || "(gerenderd)" });
                }
              } catch {}
            }
          }
        } catch {}
      }
      await page.close();
    }
    await browser.close();
  } catch {
    // playwright niet beschikbaar (bv. lokaal zonder browsers) — geen screenshots
  }

  await writeFile(
    path.join(doelDir, "afbeeldingen-op-paginas.json"),
    JSON.stringify(afbeeldingenPerPagina, null, 1)
  );
  await writeFile(
    path.join(doelDir, "embeds-op-paginas.json"),
    JSON.stringify(embedsPerPagina, null, 1)
  );
  return {
    paginas: paginasOpgehaald,
    screenshots,
    afbeeldingUrls: [...afbeeldingUrls],
  };
}


/** Serveert een map lokaal, maakt screenshots van de nieuwe site en laat de AI verschillen wegwerken. */
async function vergelijkEnVerbeter(
  werkmap: string,
  paden: string[],
  siteNaam: string,
  stuur: (tekst: string) => void | Promise<void>,
  rondes = 2
) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return; // geen browser beschikbaar (lokaal) — lus overslaan
  }
  const { createServer } = await import("node:http");
  const siteDir = path.join(werkmap, "site");
  const MIME: Record<string, string> = {
    html: "text/html", css: "text/css", js: "text/javascript",
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    webp: "image/webp", svg: "image/svg+xml", gif: "image/gif",
  };
  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent((req.url ?? "/").split("?")[0]);
      if (p.endsWith("/")) p += "index.html";
      if (!p.includes(".")) p += "/index.html";
      let data: Buffer | string = await readFile(path.join(siteDir, p));
      if (/\.html?$/i.test(p)) {
        const { laadDelen, vouwUit } = await import("./delen");
        data = vouwUit(data.toString("utf8"), await laadDelen(siteDir));
      }
      res.writeHead(200, {
        "Content-Type": MIME[p.split(".").pop() ?? ""] ?? "application/octet-stream",
      });
      res.end(data);
    } catch {
      res.writeHead(404).end("niet gevonden");
    }
  });
  await new Promise<void>((r) => server.listen(0, () => r()));
  const adres = server.address();
  const poort = typeof adres === "object" && adres ? adres.port : 0;

  try {
    const tePakken = paden.slice(0, 5);
    for (let ronde = 1; ronde <= rondes; ronde++) {
      await stuur(`Vergelijkingsronde ${ronde}: nieuwe site naast de oude leggen...`);
      const browser = await chromium.launch();
      const nieuwDir = path.join(werkmap, "nieuw-schermen");
      await mkdir(nieuwDir, { recursive: true });
      for (const [label, viewport] of [
        ["desktop", { width: 1280, height: 900 }],
        ["mobiel", { width: 375, height: 812 }],
      ] as const) {
        const page = await browser.newPage({ viewport });
        for (const pad of tePakken) {
          try {
            await page.goto(`http://127.0.0.1:${poort}${pad}`, {
              waitUntil: "networkidle",
              timeout: 15000,
            });
            const naam = (pad.replace(/\//g, "-").replace(/^-|-$/g, "") || "home");
            await page.screenshot({
              path: path.join(nieuwDir, `screenshot-${label}-${naam}.png`),
              fullPage: true,
            });
            if (label === "desktop") {
              // Meetbare layoutproblemen: tekst tegen de rand, overlopende blokken
              const problemen = await page.evaluate(() => {
                const uit: string[] = [];
                const vw = document.documentElement.clientWidth;
                document
                  .querySelectorAll("h1,h2,h3,p,section,main,article,div")
                  .forEach((el) => {
                    const r = el.getBoundingClientRect();
                    const tekst = (el.textContent || "").trim();
                    if (!tekst || r.width === 0) return;
                    if (r.left <= 4 && r.width > vw * 0.85 && /^(H1|H2|H3|P)$/.test(el.tagName)) {
                      uit.push(
                        `${el.tagName.toLowerCase()} plakt tegen de linkerrand zonder container-padding: "${tekst.slice(0, 60)}"`
                      );
                    }
                    if (r.right > vw + 4) {
                      uit.push(
                        `${el.tagName.toLowerCase()} loopt buiten beeld (${Math.round(r.right - vw)}px): "${tekst.slice(0, 60)}"`
                      );
                    }
                  });
                return uit.slice(0, 25);
              });
              if (problemen.length > 0) {
                await writeFile(
                  path.join(nieuwDir, `layout-rapport-${naam}.json`),
                  JSON.stringify(problemen, null, 1)
                );
              }
            }
          } catch {}
        }
        await page.close();
      }
      await browser.close();

      await stuur(`Vergelijkingsronde ${ronde}: verschillen wegwerken...`);
      for await (const message of query({
        prompt: `Vergelijk het ontwerp van de nieuwe site met de oude en werk de verschillen weg.

- In oud-ontwerp/ staan screenshots van de OUDE site (screenshot-desktop-*.png en screenshot-mobiel-*.png) en per pagina een bestek-*.json met gemeten kleuren, lettertypen, secties en embeds.
- In nieuw-schermen/ staan dezelfde screenshots van de NIEUWE site (uit site/).
- Bekijk per pagina beide screenshots met Read. Benoem voor jezelf de concrete verschillen (kleuren, lettertype, hero-opbouw, achtergrondafbeeldingen, spacing, fotogrids, ontbrekende embeds zoals YouTube/Vimeo/Maps-iframes) en pas de bestanden in site/ aan om de nieuwe site visueel gelijk te maken aan de oude.
- Embeds uit het bestek (iframes/video) moeten letterlijk aanwezig zijn op de juiste plek, responsief gemaakt (max-width: 100%, vaste beeldverhouding).
- LAYOUT: nieuw-schermen/layout-rapport-*.json bevat GEMETEN problemen (tekst die tegen de linkerrand plakt, blokken die buiten beeld lopen). Los elk gemeld probleem op: geef content-secties een nette container (max-width + horizontale padding, zoals het origineel op de screenshots) en voorkom horizontale overflow.
- AFBEELDINGEN: vergelijk per pagina het aantal zichtbare afbeeldingen op de oude screenshots met de nieuwe. Mist er beeld (hero-achtergrond, fotogrid, portretten), plaats het terug vanuit site/afbeeldingen/ — oud-ontwerp/afbeeldingen-op-paginas.json en media-map.json vertellen welk bestand waar hoort.
- Verander GEEN teksten of URL-paden; alleen vormgeving en structuur. Uitzondering: dode interne links (naar /tag/, /category/ of andere niet-gebouwde pagina's) mag je repareren door ze naar het blogoverzicht te laten wijzen of er platte tekst van te maken.
- De site is "${siteNaam}". Werk grondig maar breek niets.`,
        options: {
          cwd: werkmap,
          model: "claude-sonnet-5",
          systemPrompt:
            "Je bent de ontwerp-controleur van WordSwap. Je maakt de nieuwe statische site visueel gelijk aan de oude.",
          allowedTools: ["Read", "Write", "Edit", "Glob", "Grep"],
          permissionMode: "bypassPermissions",
          maxTurns: 60,
          env: {
            ...process.env,
            HOME: "/tmp",
            XDG_CONFIG_HOME: "/tmp/.config",
            XDG_CACHE_HOME: "/tmp/.cache",
            CLAUDE_CONFIG_DIR: "/tmp/.claude",
          },
        },
      })) {
        if (message.type === "result") {
          telResultaatMee(message);
          break;
        }
      }
    }
  } finally {
    server.close();
  }
}

export type BouwResultaat = {
  repo: string;
  repoUrl: string;
  siteId: number;
  paginas: number;
  afbeeldingen: number;
  verslag: string;
};

/** Voert een complete migratie-bouw uit. Roept stuur() aan met voortgangsteksten. */
/** Checkpoint: de huidige stand van de site naar de klant-repo pushen. */
async function slaTussenstandOp(
  repoNaam: string,
  siteNaam: string,
  siteDir: string,
  bericht: string
) {
  await maakKlantRepo(repoNaam, `Website van ${siteNaam} (via WordSwap)`).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));
  const bestanden = await alleBestanden(siteDir);
  if (bestanden.length === 0) return;
  await pushBestanden(
    repoNaam,
    await Promise.all(
      bestanden.map(async (b) => ({
        pad: b,
        inhoud: await readFile(path.join(siteDir, b)),
      }))
    ),
    bericht
  );
}

export async function voerBouwUit(
  opdracht: { xml: string; siteNaam: string; repoNaam: string; clerkUserId: string },
  stuurStatus: (tekst: string) => void | Promise<void>
): Promise<BouwResultaat> {
  const { xml, siteNaam, repoNaam } = opdracht;
  const stuur = (data: { type: string; tekst: string }) => stuurStatus(data.tekst);
  let werkmap: string | null = null;
  try {
  stuur({ type: "status", tekst: "Export uitlezen..." });
  const wxr = parseWxr(xml);
  const manifest = maakSeoManifest(wxr);
  const paginas = [...wxr.paginas, ...wxr.berichten].filter(
    (p) => p.status === "publish"
  );
  if (paginas.length === 0) throw new Error("Geen gepubliceerde pagina's gevonden");

  bouwVerbruik.tokensIn = 0;
  bouwVerbruik.tokensUit = 0;
  bouwVerbruik.kostenUsd = 0;
  werkmap = await mkdtemp(path.join(tmpdir(), "wp2ai-bouw-"));
  const bronDir = path.join(werkmap, "bronmateriaal");
  const siteDir = path.join(werkmap, "site");
  await mkdir(bronDir, { recursive: true });
  await mkdir(siteDir, { recursive: true });

  // Hervatten: staat er al een eerder checkpoint in de repo?
  // - index.html aanwezig → hele bouw overslaan
  // - alleen afbeeldingen aanwezig → die overnemen, downloads overslaan
  let hervatten = false;
  let mediaHervat = false;
  if (await repoBestaat(repoNaam)) {
    const bestaand = await lijstBestanden(repoNaam).catch(() => [] as string[]);
    if (bestaand.includes("index.html")) {
      hervatten = true;
      await stuurStatus("Eerdere bouw gevonden — hervatten zonder opnieuw te bouwen...");
      const eerdereMap = await laadWerkmap(repoNaam);
      const { cp } = await import("node:fs/promises");
      await cp(eerdereMap, siteDir, { recursive: true });
      await ruimWerkmapOp(eerdereMap).catch(() => {});
    } else if (bestaand.some((b) => b.startsWith("afbeeldingen/"))) {
      mediaHervat = true;
      await stuurStatus("Eerder checkpoint gevonden — afbeeldingen overnemen...");
      const eerdereMap = await laadWerkmap(repoNaam);
      const { cp } = await import("node:fs/promises");
      await cp(eerdereMap, siteDir, { recursive: true }).catch(() => {});
      await ruimWerkmapOp(eerdereMap).catch(() => {});
    }
  }

  // Bronmateriaal per pagina wegschrijven
  for (const p of paginas) {
    const naam = (p.slug || p.titel).replace(/[^a-zA-Z0-9-]+/g, "-");
    await writeFile(
      path.join(bronDir, `${p.type}-${naam}.html`),
      `<!-- pad: ${p.pad} -->\n<!-- titel: ${p.titel} -->\n<!-- samenvatting: ${p.excerpt.replace(/-->/g, "")} -->\n${p.content}`
    );
  }
  await writeFile(
    path.join(werkmap, "seo-manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  // Het echte ontwerp van de live site ophalen (HTML, CSS, screenshots)
  await stuurStatus("Vormgeving van de oude site ophalen...");
  const ontwerp = await haalLiveOntwerp(
    wxr.siteUrl,
    paginas.map((p) => p.pad),
    path.join(werkmap, "oud-ontwerp"),
    stuurStatus
  );

  // Media downloaden en optimaliseren.
  // WordPress bewaart elke foto in meerdere formaten (-300x200, -768x512, ...):
  // die groeperen we en we downloaden alleen het beste formaat per foto —
  // anders gaat het budget op aan duplicaten en vallen echte foto's buiten de boot.
  const basisVan = (u: string) => u.replace(/-\d+x\d+(?=\.\w+(?:[?#]|$))/, "");
  const alleUrls = hervatten || mediaHervat
    ? []
    : [...new Set([...ontwerp.afbeeldingUrls, ...manifest.mediaUrls])];
  const groepen = new Map<string, { beste: string; besteOpp: number; varianten: string[] }>();
  for (const u of alleUrls) {
    const b = basisVan(u);
    const m = u.match(/-(\d+)x(\d+)\.\w+(?:[?#]|$)/);
    const opp = m ? Number(m[1]) * Number(m[2]) : Number.MAX_SAFE_INTEGER; // origineel wint
    const g = groepen.get(b) ?? { beste: u, besteOpp: -1, varianten: [] };
    g.varianten.push(u);
    if (opp > g.besteOpp) {
      g.beste = u;
      g.besteOpp = opp;
    }
    groepen.set(b, g);
  }
  const teDownloaden = [...groepen.values()].slice(0, 250);
  const mediaMap: Record<string, string> = {};
  let gedownload = 0;
  await mkdir(path.join(siteDir, "afbeeldingen"), { recursive: true });
  stuur({
    type: "status",
    tekst: `Afbeeldingen ophalen (${teDownloaden.length} uniek van ${alleUrls.length})...`,
  });
  for (let i = 0; i < teDownloaden.length; i += 5) {
    await Promise.all(
      teDownloaden.slice(i, i + 5).map(async (groep) => {
        try {
          const url = groep.beste;
          const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
          if (!res.ok) return;
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.length > 10 * 1024 * 1024) return;
          const basis = path
            .basename(new URL(basisVan(url)).pathname)
            .replace(/\.[^.]+$/, "")
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, "-")
            .slice(0, 60);
          const doel = `afbeeldingen/${basis}.webp`;
          const data = await sharp(buf)
            .rotate()
            .resize({ width: 2000, withoutEnlargement: true })
            .webp({ quality: 82 })
            .toBuffer();
          await writeFile(path.join(siteDir, doel), data);
          // Alle formaat-varianten van deze foto wijzen naar hetzelfde bestand
          for (const variant of groep.varianten) mediaMap[variant] = `/${doel}`;
          gedownload++;
        } catch {
          // overslaan
        }
      })
    );
    stuur({
      type: "status",
      tekst: `Afbeeldingen ophalen (${Math.min(i + 5, teDownloaden.length)}/${teDownloaden.length})...`,
    });
  }
  await writeFile(
    path.join(werkmap, "media-map.json"),
    JSON.stringify(mediaMap, null, 2)
  );
  await stuurStatus(
    `${gedownload} unieke afbeeldingen gedownload en gekoppeld aan pagina's`
  );

  // Checkpoint 1: afbeeldingen veiligstellen — bij een latere fout hoeven ze
  // niet opnieuw gedownload te worden
  if (!hervatten && !mediaHervat && gedownload > 0) {
    await stuurStatus("Checkpoint: afbeeldingen veiligstellen...");
    await slaTussenstandOp(repoNaam, siteNaam, siteDir, "Checkpoint: afbeeldingen").catch(
      (e) => console.error("Checkpoint afbeeldingen mislukt:", e)
    );
  }

  stuur({
    type: "status",
    tekst: `De AI bouwt de site (${paginas.length} pagina's)...`,
  });

  const prompt = `Bouw in de map site/ een complete statische website voor "${siteNaam}" op basis van de WordPress-content in bronmateriaal/.

Instructies:
- Elk bestand in bronmateriaal/ is één pagina; de commentaarregels bovenaan geven het URL-pad, de titel en samenvatting. Bouw elke pagina op EXACT dat pad: "/over-ons/" wordt site/over-ons/index.html, "/" wordt site/index.html.
- Behoud per pagina de titel als <title> en gebruik de samenvatting (of de eerste zinnen) als meta description. Zie ook seo-manifest.json.
- Ontdo de WordPress-content van shortcodes ([...]), inline styles, CSS-escape-artefacten (zoals \\25BE in menuteksten) en overbodige wrapper-divs; behoud de teksten, koppen en structuur.
- EMBEDS ZIJN VERPLICHT: oud-ontwerp/embeds-op-paginas.json toont per pagina exact welke video's en kaarten (YouTube-, Vimeo-, Google Maps-iframes, <video>-tags) er op de oude site stonden; oud-ontwerp/bestek-*.json geeft ook afmetingen. Plaats élke embed letterlijk terug op de overeenkomstige pagina, responsief (max-width: 100%, behoud beeldverhouding via aspect-ratio). Een pagina die in het origineel een video of kaart had maar in jouw versie niet, is FOUT.
- ONTWERP OVERNEMEN (belangrijk): in oud-ontwerp/ staat het echte ontwerp van de oude site — gerenderde HTML-pagina's, de CSS-bestanden en (indien aanwezig) screenshots (PNG, desktop en mobiel). BEKIJK eerst de screenshots met Read en bestudeer de CSS. Neem het ontwerp zo trouw mogelijk over: kleurenpalet, lettertypen (via Google Fonts als de originelen daar staan), de opbouw van de header (logo/topbar/menu), de hero-sectie met achtergrondafbeelding of visuals, knopstijlen en de fotogrids. Hero- en sfeerbeelden die in de gerenderde HTML of CSS staan maar niet in de media-map: voeg hun URL toe aan een lijst in ontbrekende-media.txt in de werkmapwortel. De site moet voor de eigenaar direct herkenbaar zijn als "zijn" site — geen generiek sjabloon.
- MAATVAST NABOUWEN: neem details letterlijk over uit het bestek (oud-ontwerp/bestek-*.json bevat de computed styles van de echte site) — border-radius van kaarten en knoppen, schaduwen, het exacte aantal kolommen per sectie (staan de diensten in 4 kolommen naast elkaar, dan bouw jij 4 kolommen — niet 2), de volgorde en uitlijning van blokken, hoogtes van hero's, en of een sectie een achtergrondkleur of foto heeft. "Ongeveer hetzelfde" is niet goed genoeg; bij twijfel meet je na in het bestek of de screenshots.
- KLEINE BEELDEN HOREN ERBIJ: iconen bij USP-blokjes, logo-iconen, partnerlogo's (boekhoudpakketten e.d.) en portretfoto's van teamleden zijn net zo verplicht als grote foto's. Staat zo'n beeld in site/afbeeldingen/, gebruik het; ontbreekt het, zet de URL in ontbrekende-media.txt — maar vervang het NOOIT door een gekleurd rondje, initialen of een leeg blok zonder dit te melden.
- NAMAKEN VERBODEN: teken of fabriceer NOOIT zelf afbeeldingen, logo's of illustraties (geen zelfgemaakte SVG-boompjes, placeholder-blokken of emoji als vervanging van echte foto's/logo's). Gebruik uitsluitend de echte bestanden uit site/afbeeldingen/. Het logo van de site is een van die bestanden — gebruik dat, nooit een nagemaakte versie.
- TAGS, CATEGORIEËN EN ARCHIEVEN: WordPress-sites hebben vaak tagwolken, categorielinks en archieflinks (/tag/..., /category/..., /author/..., /2023/05/...). Die archiefpagina's bestaan niet in de nieuwe site. Regel: laat NOOIT een dode link achter. Een tagwolk-widget laat je weg of maak je van gewone tekst zonder links; losse tag-/categorielinks bij berichten verwijzen naar het blogoverzicht (/blog/) of worden platte tekst. Controleer aan het eind dat elke interne link naar een pagina wijst die je ook echt gebouwd hebt.
- CENTRALE ONDERDELEN (delen/): alles wat op twee of meer pagina's identiek terugkomt zet je ÉÉN keer in de map delen/ als los HTML-fragment, en op de pagina's plaats je alleen de marker <!--invoeg:naam-->. Verplicht voor menu/navigatie (delen/menu.html), footer (delen/footer.html) en topbalk (delen/topbalk.html), maar herken óók andere herhaalde blokken: een referenties-strook, een "actueel"/laatste-blogs-blok, een call-to-action-banner, een sidebar — allemaal delen/<naam>.html + marker. Bij het serveren worden de markers automatisch vervangen door de inhoud; jij hoeft alleen de fragmenten en markers te maken. Een actieve menustand per pagina (class "actief") kan niet in een gedeeld fragment — los dat op met een klein stukje CSS of JS op basis van het huidige pad, niet door het menu per pagina te kopiëren.
- DECORATIE HOORT ERBIJ: sfeer-elementen uit het thema (wolken, bladeren, golven, patronen, iconen die als CSS-achtergrond staan) zijn onderdeel van het ontwerp en staan gedownload in site/afbeeldingen/. Plaats ze terug als CSS-achtergronden op de overeenkomstige secties — de screenshots tonen waar ze horen.
- SLIDERS per soort (de echte beelden staan in de afbeeldingen-kaart; nooit leeg of nagemaakt):
  - Hero-/fotoslider: statische hero met de eerste (of mooiste) slide, of een eenvoudige CSS-crossfade met de echte slides.
  - Logo-carrousel (partners, keurmerken, klanten): een statische rij of grid met ALLE logo's naast elkaar (grijs/klein zoals origineel), eventueel een subtiele CSS-marquee; nooit logo's weglaten.
  - Testimonial-/quoteslider: alle quotes statisch onder elkaar of in een grid; tekst mag nooit verloren gaan.
  - Fotogalerij-slider: een fotogrid met alle beelden.
- AFBEELDINGEN ZIJN VERPLICHT: oud-ontwerp/afbeeldingen-op-paginas.json toont per pagina exact welke afbeeldingen (en achtergronden) er op de oude site stonden; media-map.json koppelt hun URL's aan de lokale bestanden in site/afbeeldingen/. Een pagina die in het origineel afbeeldingen had maar in jouw versie kaal is, is FOUT. Plaats elke gedownloade afbeelding van die pagina terug op de overeenkomstige plek (hero-achtergrond als CSS background-image, fotogrids als grid, losse foto's inline), met alt-tekst. Alleen afbeeldingen die écht niet gedownload zijn mag je weglaten.
- Maak één gedeeld stijlblad site/stijl.css: rustig, professioneel, passend bij het type bedrijf. Mobielvriendelijk (viewport-meta, geen vaste breedtes, leesbare tekst, aantikbare knoppen, hamburger-menu bij veel menu-items).
- Navigatie op elke pagina met de hoofdpagina's; voetregel met bedrijfsnaam.
- Berichten (type post): maak ook een blogoverzichtspagina op site/blog/index.html met links, als er berichten zijn.
- Zet vlak voor </body> van elke pagina exact dit snippet: ${PORTAL_SNIPPET}
- Maak site/_headers met beveiligingsheaders (X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Strict-Transport-Security: max-age=31536000; includeSubDomains).
- Maak site/sitemap.xml (relatieve paden zijn prima als placeholder-domein https://VERVANG.nl) en site/robots.txt.
- Maak site/llms.txt (markdown): begin met "# <bedrijfsnaam>", dan een blockquote met een beknopte, feitelijke beschrijving van het bedrijf en zijn diensten op basis van de content, gevolgd door een "## Pagina's"-lijst met per pagina een link en één zin waar de pagina over gaat. Dit bestand helpt AI-assistenten het bedrijf goed te begrijpen; niets verzinnen dat niet in de content staat.

- FORMULIEREN: bouw elk contactformulier van de oude site na als statisch formulier met dezelfde velden, in de stijl van de site, met method="POST" en action="https://wordpress2ai-beta.vercel.app/api/formulier", een verborgen input name="_site" value="${repoNaam}", en een verborgen honeypot-veld name="_extra" (leeg laten, via CSS verborgen).

${HUISREGELS}`;

  let verslag = "";
  // De hoofdbouw mag meerdere rondes duren: loopt de agent tegen de
  // beurtlimiet aan, dan gaat de volgende ronde verder in dezelfde werkmap
  // (al gebouwde pagina's blijven staan) in plaats van de hele job te laten falen.
  if (!hervatten) {
    for (let ronde = 1; ronde <= 3; ronde++) {
      const rondePrompt =
        ronde === 1
          ? prompt
          : `Je was deze website aan het bouwen maar bent afgebroken op de beurtlimiet. De werkmap bevat wat al af is — bekijk welke pagina's er al staan en maak ALLEEN het resterende af (ontbrekende pagina's, kapotte verwijzingen). Bouw niets opnieuw dat er al goed staat.\n\nDe oorspronkelijke opdracht was:\n\n${prompt}`;
      let limietBereikt = false;
      try {
        for await (const message of query({
          prompt: rondePrompt,
          options: {
            cwd: werkmap,
            model: "claude-sonnet-5",
            systemPrompt:
              "Je bent de site-bouwer van WordSwap. Je bouwt nette, snelle, mobielvriendelijke statische websites in het Nederlands.",
            allowedTools: ["Read", "Write", "Edit", "Glob", "Grep"],
            permissionMode: "bypassPermissions",
            maxTurns: 100,
            env: {
              ...process.env,
              HOME: "/tmp",
              XDG_CONFIG_HOME: "/tmp/.config",
              XDG_CACHE_HOME: "/tmp/.cache",
              CLAUDE_CONFIG_DIR: "/tmp/.claude",
            },
          },
        })) {
          if (message.type === "assistant") {
            for (const block of message.message.content) {
              if (block.type === "tool_use" && (block.name === "Write" || block.name === "Edit")) {
                const pad = String(
                  (block.input as Record<string, unknown>).file_path ?? ""
                );
                const rel = pad.split("/site/").pop();
                if (rel) stuur({ type: "status", tekst: `Bouwt ${rel}...` });
              }
            }
          }
          if (message.type === "result") {
            telResultaatMee(message);
            if (message.subtype === "success") verslag = message.result;
            else limietBereikt = true;
          }
        }
      } catch (e) {
        if (/maximum number of turns/i.test(String(e))) limietBereikt = true;
        else throw e;
      }
      // Checkpoint 2: na elke bouwronde de stand veiligstellen
      await stuurStatus(`Checkpoint: bouwronde ${ronde} veiligstellen...`);
      await slaTussenstandOp(
        repoNaam,
        siteNaam,
        siteDir,
        `Checkpoint na bouwronde ${ronde}`
      ).catch((e) => console.error("Checkpoint bouwronde mislukt:", e));
      if (!limietBereikt) break;
      if (ronde < 3)
        await stuurStatus(
          `Grote site — de bouw gaat verder waar hij gebleven was (ronde ${ronde + 1})...`
        );
    }
  }

  if (!(await alleBestanden(siteDir)).some((b) => b === "index.html")) {
    throw new Error("De bouw leverde geen homepage op — probeer opnieuw");
  }

  // Vergelijk-en-verbeter: nieuwe site naast de oude leggen tot het klopt
  await vergelijkEnVerbeter(
    werkmap,
    paginas.map((p) => p.pad),
    siteNaam,
    stuurStatus
  );

  const siteBestanden = await alleBestanden(siteDir);

  stuur({ type: "status", tekst: "Site-omgeving aanmaken..." });
  if (!(await repoBestaat(repoNaam))) {
    await maakKlantRepo(repoNaam, `Website van ${siteNaam} (via WordSwap)`);
    await new Promise((r) => setTimeout(r, 2000));
  }

  stuur({
    type: "status",
    tekst: `Publiceren van ${siteBestanden.length} bestanden...`,
  });
  const tePushen = await Promise.all(
    siteBestanden.map(async (bestand) => ({
      pad: bestand,
      inhoud: await readFile(path.join(siteDir, bestand)),
    }))
  );
  tePushen.push({
    pad: "seo-manifest.json",
    inhoud: await readFile(path.join(werkmap, "seo-manifest.json")),
  });
  await pushBestanden(repoNaam, tePushen, `Migratie van ${siteNaam} via WordSwap`);

  const { eq } = await import("drizzle-orm");
  const bestaandeSites = await db
    .select({ id: sites.id })
    .from(sites)
    .where(eq(sites.githubRepo, repoNaam));
  const [siteRow] =
    bestaandeSites.length > 0
      ? bestaandeSites
      : await db
          .insert(sites)
          .values({
            clerkUserId: opdracht.clerkUserId,
            naam: siteNaam,
            githubRepo: repoNaam,
            status: "migratie",
          })
          .returning({ id: sites.id });
  if (bestaandeSites.length === 0) await db.insert(migrations).values({
    siteId: siteRow.id,
    stap: "opbouw",
    checklist: {
      paginas: siteBestanden.filter((b) => b.endsWith(".html")).length,
      afbeeldingen: gedownload,
      bron: manifest.bron,
    },
    notities: verslag.slice(0, 2000),
  });
  const { registreerAiKosten } = await import("@/lib/kosten");
  await registreerAiKosten(siteRow.id, "bouw", { ...bouwVerbruik }).catch((e) =>
    console.error("Kostenregistratie bouw mislukt:", e)
  );
    return {
      repo: repoNaam,
      repoUrl: `https://github.com/wordpress2ai/${repoNaam}`,
      siteId: siteRow.id,
      paginas: siteBestanden.filter((b) => b.endsWith(".html")).length,
      afbeeldingen: gedownload,
      verslag,
    };
  } catch (e) {
    // Noodcheckpoint: wat er ook misgaat, de huidige stand wordt bewaard
    // zodat een volgende run (Probeer opnieuw) verder kan zonder AI-kosten.
    if (werkmap) {
      const siteDir = path.join(werkmap, "site");
      try {
        await stuurStatus("Fout — huidige stand veiligstellen...");
      } catch {}
      await slaTussenstandOp(
        opdracht.repoNaam,
        opdracht.siteNaam,
        siteDir,
        "Noodcheckpoint na fout"
      ).catch(() => {});
    }
    throw e;
  } finally {
    if (werkmap) await ruimWerkmapOp(werkmap).catch(() => {});
  }
}
