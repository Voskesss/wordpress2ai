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
      const data = await readFile(path.join(siteDir, p));
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
- AFBEELDINGEN: vergelijk per pagina het aantal zichtbare afbeeldingen op de oude screenshots met de nieuwe. Mist er beeld (hero-achtergrond, fotogrid, portretten), plaats het terug vanuit site/afbeeldingen/ — oud-ontwerp/afbeeldingen-op-paginas.json en media-map.json vertellen welk bestand waar hoort.
- Verander GEEN teksten of URL-paden; alleen vormgeving en structuur.
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
        if (message.type === "result") break;
      }
    }
  } finally {
    server.close();
  }
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

  // Hervatten: staat er al een eerder gebouwde tussenstand in de repo?
  let hervatten = false;
  if (await repoBestaat(repoNaam)) {
    const bestaand = await lijstBestanden(repoNaam).catch(() => [] as string[]);
    if (bestaand.includes("index.html")) {
      hervatten = true;
      await stuurStatus("Eerdere bouw gevonden — hervatten zonder opnieuw te bouwen...");
      const eerdereMap = await laadWerkmap(repoNaam);
      const { cp } = await import("node:fs/promises");
      await cp(eerdereMap, siteDir, { recursive: true });
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

  // Media downloaden en optimaliseren
  const mediaUrls = hervatten
    ? []
    : [...new Set([...manifest.mediaUrls, ...ontwerp.afbeeldingUrls])].slice(0, 60);
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
  await stuurStatus(
    `${Object.keys(mediaMap).length} afbeeldingen gedownload en gekoppeld aan pagina's`
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
- EMBEDS BEHOUDEN: video's en kaarten (YouTube-, Vimeo-, Google Maps-iframes, <video>-tags) staan per pagina in oud-ontwerp/bestek-*.json onder "embeds". Plaats ze letterlijk terug op de juiste plek, responsief (max-width: 100%, behoud beeldverhouding). Sla ze nooit over.
- ONTWERP OVERNEMEN (belangrijk): in oud-ontwerp/ staat het echte ontwerp van de oude site — gerenderde HTML-pagina's, de CSS-bestanden en (indien aanwezig) screenshots (PNG, desktop en mobiel). BEKIJK eerst de screenshots met Read en bestudeer de CSS. Neem het ontwerp zo trouw mogelijk over: kleurenpalet, lettertypen (via Google Fonts als de originelen daar staan), de opbouw van de header (logo/topbar/menu), de hero-sectie met achtergrondafbeelding of visuals, knopstijlen en de fotogrids. Hero- en sfeerbeelden die in de gerenderde HTML of CSS staan maar niet in de media-map: voeg hun URL toe aan een lijst in ontbrekende-media.txt in de werkmapwortel. De site moet voor de eigenaar direct herkenbaar zijn als "zijn" site — geen generiek sjabloon.
- AFBEELDINGEN ZIJN VERPLICHT: oud-ontwerp/afbeeldingen-op-paginas.json toont per pagina exact welke afbeeldingen (en achtergronden) er op de oude site stonden; media-map.json koppelt hun URL's aan de lokale bestanden in site/afbeeldingen/. Een pagina die in het origineel afbeeldingen had maar in jouw versie kaal is, is FOUT. Plaats elke gedownloade afbeelding van die pagina terug op de overeenkomstige plek (hero-achtergrond als CSS background-image, fotogrids als grid, losse foto's inline), met alt-tekst. Alleen afbeeldingen die écht niet gedownload zijn mag je weglaten.
- Maak één gedeeld stijlblad site/stijl.css: rustig, professioneel, passend bij het type bedrijf. Mobielvriendelijk (viewport-meta, geen vaste breedtes, leesbare tekst, aantikbare knoppen, hamburger-menu bij veel menu-items).
- Navigatie op elke pagina met de hoofdpagina's; voetregel met bedrijfsnaam.
- Berichten (type post): maak ook een blogoverzichtspagina op site/blog/index.html met links, als er berichten zijn.
- Zet vlak voor </body> van elke pagina exact dit snippet: ${PORTAL_SNIPPET}
- Maak site/_headers met beveiligingsheaders (X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Strict-Transport-Security: max-age=31536000; includeSubDomains).
- Maak site/sitemap.xml (relatieve paden zijn prima als placeholder-domein https://VERVANG.nl) en site/robots.txt.
- Maak site/llms.txt (markdown): begin met "# <bedrijfsnaam>", dan een blockquote met een beknopte, feitelijke beschrijving van het bedrijf en zijn diensten op basis van de content, gevolgd door een "## Pagina's"-lijst met per pagina een link en één zin waar de pagina over gaat. Dit bestand helpt AI-assistenten het bedrijf goed te begrijpen; niets verzinnen dat niet in de content staat.

${HUISREGELS}`;

  let verslag = "";
  if (!hervatten)
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

  if (!(await alleBestanden(siteDir)).some((b) => b === "index.html")) {
    throw new Error("De bouw leverde geen homepage op — probeer opnieuw");
  }

  // Tussenstand veiligstellen: als de verify-lus of push hierna sneuvelt,
  // hervat een volgende run vanaf dit punt (geen AI-bouwkosten opnieuw)
  if (!hervatten) {
    await stuurStatus("Tussenstand veiligstellen...");
    await maakKlantRepo(repoNaam, `Website van ${siteNaam} (via WordSwap)`).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));
    const tussenstand = await alleBestanden(siteDir);
    await pushBestanden(
      repoNaam,
      await Promise.all(
        tussenstand.map(async (b) => ({
          pad: b,
          inhoud: await readFile(path.join(siteDir, b)),
        }))
      ),
      "Tussenstand na hoofdbouw"
    ).catch((e) => console.error("Tussenstand pushen mislukt:", e));
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
