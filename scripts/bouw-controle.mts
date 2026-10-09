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
    // Een telefoon scrollt niet opzij maar zoomt uit als iets breder is dan het
    // scherm; dan is er geen overloop te meten, wel een te brede pagina
    // (Summit 26-09: een dichtgeklapt menupaneel naast het scherm maakte 780px).
    const breedte = await pagina.evaluate(() => window.innerWidth);
    if (breedte > 380)
      bevindingen.push({
        ernst: "fout",
        regel: "mobiel",
        waar: p,
        detail: `De telefoon zoomt uit: de pagina is ${breedte}px breed op een scherm van 375px. Zoek het element dat buiten beeld staat (vaak een dichtgeklapt menu met transform).`,
      });
    if (gewicht > GEWICHT_GRENS)
      bevindingen.push({
        ernst: "waarschuwing",
        regel: "paginagewicht",
        waar: p,
        detail: `${(gewicht / 1_000_000).toFixed(1)} MB binnenhalen voor één pagina (±${Math.round(gewicht / 500_000)} s op 4G). Kijk naar de zwaarste afbeeldingen.`,
      });
  }
  // Zoeken op mobiel (zoals Van den Berg): het vergrootglas staat in de
  // kopbalk, niet weggestopt in het uitklapmenu, en het venster ligt bovenop.
  await pagina.goto(`http://localhost:${poort}/`, { waitUntil: "networkidle" }).catch(() => null);
  if (await pagina.locator(".ws-zoek").count()) {
    const zoekKnop = pagina.locator(".ws-zoek-knop:visible").first();
    if (!(await zoekKnop.count())) {
      bevindingen.push({
        ernst: "waarschuwing",
        regel: "mobiel",
        waar: "/",
        detail: "Zoeken is op 375px alleen via het menu te bereiken. Zet het zoekvak in de kopbalk naast de menuknop, zoals bij Van den Berg.",
      });
    } else {
      await pagina.evaluate(() => window.scrollTo(0, 400));
      await zoekKnop.click().catch(() => null);
      await pagina.waitForTimeout(300);
      const zoekvlak = await pagina.evaluate(() => {
        const v = document.getElementById("ws-zoekvlak");
        if (!v || v.hidden) return "dicht";
        const r = v.getBoundingClientRect();
        if (r.left < -1 || r.right > window.innerWidth + 1 || r.top < 0 || r.height < 40) return "buiten beeld";
        const punt = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(24, r.height / 2));
        return punt && v.contains(punt) ? "goed" : "bedekt";
      });
      if (zoekvlak !== "goed")
        bevindingen.push({
          ernst: "fout",
          regel: "mobiel",
          waar: "/",
          detail: zoekvlak === "dicht"
            ? "Het zoekvenster opent niet na een tik op het vergrootglas."
            : `Het zoekvenster staat ${zoekvlak === "bedekt" ? "achter iets anders" : "(deels) buiten beeld"} op 375px.`,
        });
      await pagina.keyboard.press("Escape");
    }
  }

  // Hamburgermenu: aanwezig, na een tik zijn de menulinks zichtbaar, en ze
  // liggen bovenop (z-index-regel, Summit 26-09: het menu viel achter de
  // pagina omdat de kop een backdrop-filter had).
  await pagina.goto(`http://localhost:${poort}/`, { waitUntil: "networkidle" }).catch(() => null);
  await pagina.evaluate(() => window.scrollTo(0, 400));
  const knop = pagina.locator('button.hamburger:visible, .hamburger:visible, button[class*="menuknop"]:visible, button[aria-controls][aria-expanded]:not(.ws-zoek-knop):visible, button[aria-label*="enu"]:visible, a[aria-label*="enu"]:visible').first();
  if (await knop.count()) {
    await knop.click().catch(() => null);
    await pagina.waitForTimeout(500);
    const menu = await pagina.evaluate(() => {
      const links = [...document.querySelectorAll("nav a, .menu a, .hoofdmenu a")] as HTMLElement[];
      const inBeeld = links.filter((a) => {
        if (a.offsetParent === null) return false;
        const r = a.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth;
      });
      const bedekt = inBeeld.slice(0, 8).filter((a) => {
        const r = a.getBoundingClientRect();
        const punt = document.elementFromPoint(r.left + Math.min(20, r.width / 2), r.top + r.height / 2);
        return !(punt && (a.contains(punt) || punt.contains(a)));
      });
      return { zichtbaar: inBeeld.length, bedekt: bedekt.map((a) => a.textContent?.trim() ?? "").slice(0, 3) };
    });
    if (menu.zichtbaar < 3)
      bevindingen.push({ ernst: "fout", regel: "mobiel", waar: "/", detail: "Hamburgermenu opent niet goed (na een tik staan er minder dan drie menulinks in beeld)." });
    else if (menu.bedekt.length)
      bevindingen.push({
        ernst: "fout",
        regel: "mobiel",
        waar: "/",
        detail: `Open menu valt achter iets anders (${menu.bedekt.join(", ")}). Geef het menu een z-index boven alles, en zet nooit een fixed menu binnen een kop met backdrop-filter, filter of transform.`,
      });
  } else {
    bevindingen.push({ ernst: "waarschuwing", regel: "mobiel", waar: "/", detail: "Geen hamburgermenu-knop gevonden op 375px." });
  }
  // ---- Beeldscherpte op desktopbreedte (VGK 09-10: hero-foto's van 1200px
  // werden op ~1009 CSS-px getoond — op een retina-scherm is dat 2018px nodig,
  // dus zichtbaar vaag; de poort zei er niets over). Elke <img> en elke grote
  // CSS-achtergrond wordt gemeten: kleiner dan de getoonde breedte is een
  // fout (zelfs op een gewoon scherm opgeschaald), kleiner dan 1,5x een
  // waarschuwing (vaag op retina). Logo's/kleine beelden (<200px) en svg's
  // (schalen verliesvrij) tellen niet mee; per beeld één melding.
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const scherpteGemeld = new Set<string>();
  const scherpteGevallen: { pagina: string; naam: string; natuurlijk: number; getoond: number }[] = [];
  for (const p of paginas.sort()) {
    await desktop.goto(`http://localhost:${poort}${p}`, { waitUntil: "networkidle", timeout: 30000 }).catch(() => null);
    // Als string, niet als functie: tsx/esbuild stopt anders een
    // __name-helper in de geserialiseerde functie die in de pagina niet bestaat.
    const vaag = (await desktop
      .evaluate(`(async () => {
        const uit = [];
        const meet = (bron, natuurlijk, getoond) => {
          if (!bron || !natuurlijk || getoond < 200) return;
          if (/\\.svg($|[?#])/i.test(bron) || bron.startsWith("data:")) return;
          if (natuurlijk < getoond * 1.5)
            uit.push({ bron, natuurlijk, getoond: Math.round(getoond) });
        };
        document.querySelectorAll("img").forEach((img) => {
          const r = img.getBoundingClientRect();
          if (r.width >= 200) meet(img.currentSrc || img.src, img.naturalWidth, r.width);
        });
        const klussen = [];
        document.querySelectorAll("*").forEach((el) => {
          const stijl = getComputedStyle(el);
          const m = stijl.backgroundImage.match(/url\\(["']?([^"')]+)/);
          if (!m) return;
          const r = el.getBoundingClientRect();
          if (r.width < 200 || r.height < 120) return;
          if (stijl.backgroundRepeat.includes("repeat") && stijl.backgroundSize === "auto") return;
          klussen.push(new Promise((klaar) => {
            const b = new Image();
            b.onload = () => { meet(m[1], b.naturalWidth, r.width); klaar(); };
            b.onerror = () => klaar();
            b.src = m[1];
          }));
        });
        await Promise.all(klussen);
        return uit;
      })()`)
      .catch(() => [])) as { bron: string; natuurlijk: number; getoond: number }[];
    for (const v of vaag) {
      const naam = v.bron.split("/").pop()?.split("?")[0] ?? v.bron;
      if (scherpteGemeld.has(naam)) continue;
      scherpteGemeld.add(naam);
      scherpteGevallen.push({ pagina: p, naam, natuurlijk: v.natuurlijk, getoond: v.getoond });
    }
  }
  await desktop.close();

  // Fors opgeschaald (minder dan driekwart van de getoonde breedte) blokkeert;
  // "aan de krappe kant voor retina" is een werklijstje. Oude WordPress-sites
  // bewaren originelen vaak op 1200px, dus een volbrede achtergrond komt daar
  // per definitie iets tekort — daarom alleen de ergste 15 met naam en toenaam,
  // de rest als telling.
  scherpteGevallen.sort((a, b) => a.natuurlijk / a.getoond - b.natuurlijk / b.getoond);
  const krap: typeof scherpteGevallen = [];
  for (const g of scherpteGevallen) {
    if (g.natuurlijk < g.getoond * 0.75) {
      bevindingen.push({
        ernst: "fout",
        regel: "beeldscherpte",
        waar: g.pagina,
        detail: `${g.naam} is ${g.natuurlijk}px breed maar wordt op ${g.getoond}px getoond — zichtbaar opgeschaald. Haal een groter origineel op of toon hem kleiner.`,
      });
    } else if (g.natuurlijk < g.getoond * 1.4) {
      krap.push(g);
    }
  }
  for (const g of krap.slice(0, 15))
    bevindingen.push({
      ernst: "waarschuwing",
      regel: "beeldscherpte",
      waar: g.pagina,
      detail: `${g.naam} is ${g.natuurlijk}px breed bij ${g.getoond}px getoond — vaag op retina-schermen als er een groter origineel bestaat.`,
    });
  if (krap.length > 15)
    bevindingen.push({
      ernst: "waarschuwing",
      regel: "beeldscherpte",
      waar: "hele site",
      detail: `Nog ${krap.length - 15} beelden zijn aan de krappe kant voor retina (zelfde patroon als hierboven).`,
    });

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
