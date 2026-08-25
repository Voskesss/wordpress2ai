import { query } from "@anthropic-ai/claude-agent-sdk";
import { currentUser } from "@clerk/nextjs/server";
import sharp from "sharp";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { migrations, sites } from "@/db/schema";
import { maakKlantRepo, pushBestanden, schrijfBestand } from "@/lib/github";
import { HUISREGELS } from "@/lib/huisregels";
import { ruimWerkmapOp } from "@/lib/werkmap";
import { maakSeoManifest, parseWxr } from "@/lib/wxr";

export const maxDuration = 800;

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

export async function POST(req: Request) {
  const user = await currentUser();
  if (user?.publicMetadata?.role !== "admin") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("wxr");
  const siteNaam = String(form.get("siteNaam") ?? "").trim();
  const repoNaam = String(form.get("repoNaam") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!(file instanceof File) || !siteNaam || !repoNaam) {
    return NextResponse.json({ error: "Ontbrekende gegevens" }, { status: 400 });
  }

  const xml = await file.text();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const stuur = (data: object) =>
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
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

        // Media downloaden en optimaliseren
        const mediaUrls = manifest.mediaUrls.slice(0, MAX_MEDIA);
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
- Ontdo de WordPress-content van shortcodes ([...]), inline styles en overbodige wrapper-divs; behoud de teksten, koppen en structuur.
- Afbeeldingen: media-map.json koppelt oude URL's aan lokale paden (al gedownload in site/afbeeldingen/). Vervang verwijzingen; geef elke afbeelding een beschrijvende alt-tekst. Verwijzingen naar niet-gedownloade media laat je weg.
- Maak één gedeeld stijlblad site/stijl.css: rustig, professioneel, passend bij het type bedrijf. Mobielvriendelijk (viewport-meta, geen vaste breedtes, leesbare tekst, aantikbare knoppen, hamburger-menu bij veel menu-items).
- Navigatie op elke pagina met de hoofdpagina's; voetregel met bedrijfsnaam.
- Berichten (type post): maak ook een blogoverzichtspagina op site/blog/index.html met links, als er berichten zijn.
- Zet vlak voor </body> van elke pagina exact dit snippet: ${PORTAL_SNIPPET}
- Maak site/_headers met beveiligingsheaders (X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Strict-Transport-Security: max-age=31536000; includeSubDomains).
- Maak site/sitemap.xml (relatieve paden zijn prima als placeholder-domein https://VERVANG.nl) en site/robots.txt.

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
            clerkUserId: user.id,
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

        stuur({
          type: "klaar",
          repo: repoNaam,
          repoUrl: `https://github.com/wordpress2ai/${repoNaam}`,
          paginas: siteBestanden.filter((b) => b.endsWith(".html")).length,
          afbeeldingen: gedownload,
          verslag,
        });
      } catch (e) {
        console.error(e);
        stuur({
          type: "fout",
          tekst: e instanceof Error ? e.message : "Er ging iets mis",
        });
      } finally {
        if (werkmap) await ruimWerkmapOp(werkmap).catch(() => {});
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" },
  });
}
