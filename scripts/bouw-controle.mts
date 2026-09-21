/**
 * De opleveringspoort: draait alle harde bouweisen (lib/bouw-controle.ts)
 * over een klant-map, plus een mobiele controle in een echte browser
 * (horizontale scroll op 375px, werkend hamburgermenu). Dezelfde controle
 * geldt voor migraties én voor ontwerp-promoties — één poort, twee aanroepers.
 *
 *   npx tsx scripts/bouw-controle.mts <repo-of-map> [--zonder-mobiel]
 *
 * Bron-map ~/wordswap-klanten/<naam>-bron wordt automatisch gebruikt voor de
 * oud-adres-controle (seo-manifest.json) als hij bestaat.
 * Afsluitcode 1 zodra er fouten zijn; waarschuwingen blokkeren niet.
 */
import { createServer } from "node:http";
import { readFile, readdir, stat, mkdtemp, cp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { homedir } from "node:os";
import path from "node:path";
import { controleerSiteMap, type Bevinding, type SeoManifest } from "../lib/bouw-controle";

const argv = process.argv.slice(2);
const zonderMobiel = argv.includes("--zonder-mobiel");
const doel = argv.find((a) => !a.startsWith("--"));
if (!doel) {
  console.error("Gebruik: bouw-controle.mts <repo-of-map> [--zonder-mobiel]");
  process.exit(1);
}

const map = (await stat(doel).catch(() => null))?.isDirectory()
  ? path.resolve(doel)
  : path.join(homedir(), "wordswap-klanten", doel);
if (!(await stat(map).catch(() => null))?.isDirectory()) {
  console.error(`Map niet gevonden: ${map}`);
  process.exit(1);
}

let manifest: SeoManifest | undefined;
const bronPad = path.join(`${map}-bron`, "seo-manifest.json");
try {
  manifest = JSON.parse(await readFile(bronPad, "utf8"));
  console.log(`SEO-manifest gevonden: ${bronPad}`);
} catch {
  console.log("Geen seo-manifest.json in de bron-map — oud-adres-controle overgeslagen.");
}

// De bron-map (de opgehaalde oude site) maakt de verdwenen-controle mogelijk:
// onderdelen die er wél waren en nu nergens meer staan.
const bronMapPad = `${map}-bron`;
const bronMap = (await stat(bronMapPad).catch(() => null))?.isDirectory() ? bronMapPad : undefined;
console.log(
  bronMap
    ? `Bron-map gevonden: ${bronMap} (controle op verdwenen onderdelen aan)`
    : "Geen bron-map: controle op verdwenen onderdelen overgeslagen.",
);

const bevindingen: Bevinding[] = await controleerSiteMap(map, { seoManifest: manifest, bronMap });

// ---- Mobiele controle in een echte browser (markers uitvouwen, lokaal serveren)
if (!zonderMobiel) {
  const { chromium } = await import("playwright");
  const kopie = await mkdtemp(path.join(tmpdir(), "bouw-controle-"));
  await cp(map, kopie, {
    recursive: true,
    filter: (bron) => !bron.includes(`${path.sep}.git`),
  });
  const delen: Record<string, string> = {};
  try {
    for (const naam of await readdir(path.join(kopie, "delen")))
      if (naam.endsWith(".html"))
        delen[naam.slice(0, -5)] = await readFile(path.join(kopie, "delen", naam), "utf8");
  } catch { /* geen delen/ */ }
  async function vouwUit(sub: string) {
    for (const naam of await readdir(sub)) {
      const vol = path.join(sub, naam);
      if ((await stat(vol)).isDirectory()) {
        if (naam !== "delen" && naam !== ".git") await vouwUit(vol);
      } else if (naam.endsWith(".html")) {
        const inhoud = await readFile(vol, "utf8");
        const nieuw = inhoud.replace(/<!--invoeg:([\w-]+)-->/g, (_, n) => delen[n] ?? "");
        if (nieuw !== inhoud) await writeFile(vol, nieuw);
      }
    }
  }
  await vouwUit(kopie);

  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent((req.url ?? "/").split("?")[0]);
      if (p.endsWith("/")) p += "index.html";
      const inhoud = await readFile(path.join(kopie, p));
      const types: Record<string, string> = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".pdf": "application/pdf" };
      res.setHeader("Content-Type", types[path.extname(p)] ?? "application/octet-stream");
      res.end(inhoud);
    } catch {
      res.statusCode = 404;
      res.end("niet gevonden");
    }
  });
  await new Promise<void>((klaar) => server.listen(0, klaar));
  const poort = (server.address() as { port: number }).port;

  const paginas: string[] = [];
  async function verzamel(sub: string, basis: string) {
    for (const naam of await readdir(sub)) {
      if ([".git", "delen"].includes(naam)) continue;
      const vol = path.join(sub, naam);
      if ((await stat(vol)).isDirectory()) await verzamel(vol, `${basis}${naam}/`);
      else if (naam === "index.html") paginas.push(basis);
      else if (naam === "404.html") paginas.push("/404.html");
    }
  }
  await verzamel(kopie, "/");

  const browser = await chromium.launch();
  const pagina = await browser.newPage({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  // Paginagewicht: alles bij elkaar wat een bezoeker moet binnenhalen. Bewust
  // niet de laadtijd meten, want die is hier lokaal en zonder netwerk en zegt
  // dus niets over de werkelijkheid. Bytes wél: op 4G is ruwweg 1 MB ≈ 2 s.
  const GEWICHT_GRENS = 2_500_000;
  let gewicht = 0;
  pagina.on("response", (r) => {
    const n = Number(r.headers()["content-length"] ?? 0);
    if (Number.isFinite(n)) gewicht += n;
  });

  for (const p of paginas.sort()) {
    gewicht = 0;
    await pagina.goto(`http://localhost:${poort}${p}`, { waitUntil: "networkidle", timeout: 30000 }).catch(() => null);
    const overloop = await pagina.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (overloop > 2)
      bevindingen.push({ ernst: "fout", regel: "mobiel", waar: p, detail: `Horizontale scroll op 375px (${overloop}px te breed).` });
    if (gewicht > GEWICHT_GRENS)
      bevindingen.push({
        ernst: "waarschuwing",
        regel: "paginagewicht",
        waar: p,
        detail: `${(gewicht / 1_000_000).toFixed(1)} MB binnenhalen voor één pagina (±${Math.round(gewicht / 500_000)} s op 4G). Kijk naar de zwaarste afbeeldingen.`,
      });
  }
  // Hamburgermenu: aanwezig, en na een tik zijn de menulinks zichtbaar
  await pagina.goto(`http://localhost:${poort}/`, { waitUntil: "networkidle" }).catch(() => null);
  const knop = pagina.locator('button[aria-expanded], .hamburger, [class*="menuknop"], [aria-label*="enu"]').first();
  if (await knop.count()) {
    await knop.click().catch(() => null);
    await pagina.waitForTimeout(400);
    const zichtbaar = await pagina.evaluate(() => {
      const links = [...document.querySelectorAll("nav a, .menu a, .hoofdmenu a")];
      return links.filter((a) => (a as HTMLElement).offsetParent !== null).length;
    });
    if (zichtbaar < 3)
      bevindingen.push({ ernst: "fout", regel: "mobiel", waar: "/", detail: "Hamburgermenu opent niet (menulinks blijven onzichtbaar)." });
  } else {
    bevindingen.push({ ernst: "waarschuwing", regel: "mobiel", waar: "/", detail: "Geen hamburgermenu-knop gevonden op 375px." });
  }
  await browser.close();
  server.close();
  await rm(kopie, { recursive: true, force: true });
}

// ---- Verslag
const fouten = bevindingen.filter((b) => b.ernst === "fout");
const waarschuwingen = bevindingen.filter((b) => b.ernst === "waarschuwing");
const perRegel = (lijst: Bevinding[]) => {
  const groepen = new Map<string, Bevinding[]>();
  for (const b of lijst) groepen.set(b.regel, [...(groepen.get(b.regel) ?? []), b]);
  for (const [regel, items] of groepen) {
    console.log(`  [${regel}]`);
    for (const b of items) console.log(`    ${b.waar} — ${b.detail}`);
  }
};
console.log(`\n=== Bouw-controle: ${map}`);
if (fouten.length) {
  console.log(`\nFOUTEN (${fouten.length}) — blokkeren de oplevering:`);
  perRegel(fouten);
}
if (waarschuwingen.length) {
  console.log(`\nWaarschuwingen (${waarschuwingen.length}):`);
  perRegel(waarschuwingen);
}
if (!fouten.length && !waarschuwingen.length) console.log("\nAlles groen.");
else if (!fouten.length) console.log("\nGeen fouten; waarschuwingen zijn een werklijstje, geen blokkade.");
process.exit(fouten.length ? 1 : 0);
