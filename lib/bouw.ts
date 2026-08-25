import { query } from "@anthropic-ai/claude-agent-sdk";
import sharp from "sharp";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { db } from "@/db";
import { migrations, sites } from "@/db/schema";
import { maakKlantRepo, pushBestanden } from "@/lib/github";
import { HUISREGELS } from "@/lib/huisregels";
import { ruimWerkmapOp } from "@/lib/werkmap";
import { maakSeoManifest, parseWxr } from "@/lib/wxr";

const MAX_MEDIA = 30;

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
    } catch {}
  }

  let cssN = 0;
  for (const url of [...cssUrls].slice(0, 12)) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) continue;
      await writeFile(path.join(doelDir, `stijl-${cssN++}.css`), await res.text());
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
        } catch {}
      }
      await page.close();
    }
    await browser.close();
  } catch {
    // playwright niet beschikbaar (bv. lokaal zonder browsers) — geen screenshots
  }

  return {
    paginas: paginasOpgehaald,
    screenshots,
    afbeeldingUrls: [...afbeeldingUrls],
  };
}

export type BouwResultaat = {
  repo: string;
  repoUrl: string;
  paginas: number;
  afbeeldingen: number;
  verslag: string;
};

/** Voert een complete migratie-bouw uit. Roept stuur() aan met voortgangsteksten. */
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

  werkmap = await mkdtemp(path.join(tmpdir(), "wp2ai-bouw-"));
  const bronDir = path.join(werkmap, "bronmateriaal");
  const siteDir = path.join(werkmap, "site");
  await mkdir(bronDir, { recursive: true });
  await mkdir(siteDir, { recursive: true });

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

  // Media downloaden en optimaliseren
  const mediaUrls = [
    ...new Set([...manifest.mediaUrls, ...ontwerp.afbeeldingUrls]),
  ].slice(0, 60);
  const mediaMap: Record<string, string> = {};
  let gedownload = 0;
  await mkdir(path.join(siteDir, "afbeeldingen"), { recursive: true });
  stuur({ type: "status", tekst: `Afbeeldingen ophalen (${mediaUrls.length})...` });
  for (let i = 0; i < mediaUrls.length; i += 5) {
    await Promise.all(
      mediaUrls.slice(i, i + 5).map(async (url) => {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
          if (!res.ok) return;
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.length > 10 * 1024 * 1024) return;
          const basis = path
            .basename(new URL(url).pathname)
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
          mediaMap[url] = `/${doel}`;
          gedownload++;
        } catch {
          // overslaan
        }
      })
    );
    stuur({
      type: "status",
      tekst: `Afbeeldingen ophalen (${Math.min(i + 5, mediaUrls.length)}/${mediaUrls.length})...`,
    });
  }
  await writeFile(
    path.join(werkmap, "media-map.json"),
    JSON.stringify(mediaMap, null, 2)
  );

  stuur({
    type: "status",
    tekst: `De AI bouwt de site (${paginas.length} pagina's)...`,
  });

  const prompt = `Bouw in de map site/ een complete statische website voor "${siteNaam}" op basis van de WordPress-content in bronmateriaal/.

Instructies:
- Elk bestand in bronmateriaal/ is één pagina; de commentaarregels bovenaan geven het URL-pad, de titel en samenvatting. Bouw elke pagina op EXACT dat pad: "/over-ons/" wordt site/over-ons/index.html, "/" wordt site/index.html.
- Behoud per pagina de titel als <title> en gebruik de samenvatting (of de eerste zinnen) als meta description. Zie ook seo-manifest.json.
- Ontdo de WordPress-content van shortcodes ([...]), inline styles, CSS-escape-artefacten (zoals \\25BE in menuteksten) en overbodige wrapper-divs; behoud de teksten, koppen en structuur.
- ONTWERP OVERNEMEN (belangrijk): in oud-ontwerp/ staat het echte ontwerp van de oude site — gerenderde HTML-pagina's, de CSS-bestanden en (indien aanwezig) screenshots (PNG, desktop en mobiel). BEKIJK eerst de screenshots met Read en bestudeer de CSS. Neem het ontwerp zo trouw mogelijk over: kleurenpalet, lettertypen (via Google Fonts als de originelen daar staan), de opbouw van de header (logo/topbar/menu), de hero-sectie met achtergrondafbeelding of visuals, knopstijlen en de fotogrids. Hero- en sfeerbeelden die in de gerenderde HTML of CSS staan maar niet in de media-map: voeg hun URL toe aan een lijst in ontbrekende-media.txt in de werkmapwortel. De site moet voor de eigenaar direct herkenbaar zijn als "zijn" site — geen generiek sjabloon.
- Afbeeldingen: media-map.json koppelt oude URL's aan lokale paden (al gedownload in site/afbeeldingen/). Vervang verwijzingen; geef elke afbeelding een beschrijvende alt-tekst. Verwijzingen naar niet-gedownloade media laat je weg.
- Maak één gedeeld stijlblad site/stijl.css: rustig, professioneel, passend bij het type bedrijf. Mobielvriendelijk (viewport-meta, geen vaste breedtes, leesbare tekst, aantikbare knoppen, hamburger-menu bij veel menu-items).
- Navigatie op elke pagina met de hoofdpagina's; voetregel met bedrijfsnaam.
- Berichten (type post): maak ook een blogoverzichtspagina op site/blog/index.html met links, als er berichten zijn.
- Zet vlak voor </body> van elke pagina exact dit snippet: ${PORTAL_SNIPPET}
- Maak site/_headers met beveiligingsheaders (X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Strict-Transport-Security: max-age=31536000; includeSubDomains).
- Maak site/sitemap.xml (relatieve paden zijn prima als placeholder-domein https://VERVANG.nl) en site/robots.txt.
- Maak site/llms.txt (markdown): begin met "# <bedrijfsnaam>", dan een blockquote met een beknopte, feitelijke beschrijving van het bedrijf en zijn diensten op basis van de content, gevolgd door een "## Pagina's"-lijst met per pagina een link en één zin waar de pagina over gaat. Dit bestand helpt AI-assistenten het bedrijf goed te begrijpen; niets verzinnen dat niet in de content staat.

${HUISREGELS}`;

  let verslag = "";
  for await (const message of query({
    prompt,
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
      verslag = message.subtype === "success" ? message.result : "";
    }
  }

  const siteBestanden = await alleBestanden(siteDir);
  if (!siteBestanden.some((b) => b === "index.html")) {
    throw new Error("De bouw leverde geen homepage op — probeer opnieuw");
  }

  stuur({ type: "status", tekst: "Site-omgeving aanmaken..." });
  await maakKlantRepo(repoNaam, `Website van ${siteNaam} (via WordSwap)`);
  await new Promise((r) => setTimeout(r, 2000));

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

  const [siteRow] = await db
    .insert(sites)
    .values({
      clerkUserId: opdracht.clerkUserId,
      naam: siteNaam,
      githubRepo: repoNaam,
      status: "migratie",
    })
    .returning({ id: sites.id });
  await db.insert(migrations).values({
    siteId: siteRow.id,
    stap: "opbouw",
    checklist: {
      paginas: siteBestanden.filter((b) => b.endsWith(".html")).length,
      afbeeldingen: gedownload,
      bron: manifest.bron,
    },
    notities: verslag.slice(0, 2000),
  });
    return {
      repo: repoNaam,
      repoUrl: `https://github.com/wordpress2ai/${repoNaam}`,
      paginas: siteBestanden.filter((b) => b.endsWith(".html")).length,
      afbeeldingen: gedownload,
      verslag,
    };
  } finally {
    if (werkmap) await ruimWerkmapOp(werkmap).catch(() => {});
  }
}
