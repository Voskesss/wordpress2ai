/** Capture source before migration, then compare that immutable baseline to dev.
 * npx tsx scripts/seo-vergelijk.mts vastleggen https://oude-site.nl paden.txt baseline.json
 * npx tsx scripts/seo-vergelijk.mts vergelijken http://localhost:3001 baseline.json rapport.json
 * paths: one existing path per line, exported from sitemap + crawl/Search Console.
 */
import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
const [mode, originArg, input, output] = process.argv.slice(2);
if (
  !["vastleggen", "vergelijken"].includes(mode) ||
  !originArg ||
  !input ||
  !output
)
  throw new Error(
    "Gebruik: seo-vergelijk.mts vastleggen|vergelijken ORIGIN INPUT OUTPUT",
  );
const origin = new URL(originArg).origin;
if (!/^https?:/.test(origin)) throw new Error("Alleen http(s)-adressen");
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ javaScriptEnabled: false });
// HTML is parsed offline; no images, scripts, forms or third-party requests run.
await context.route("**/*", (route) => route.abort());
const page = await context.newPage();
type Entry = {
  path: string;
  status: number;
  finalPath: string;
  title: string;
  description: string;
  canonical: string;
  robots: string;
  xRobots: string;
  headings: string[];
  links: string[];
  images: string[];
  structured: string[];
  metadata: Record<string, string>;
  error?: string;
};
async function capture(path: string): Promise<Entry> {
  if (!path.startsWith("/") || path.startsWith("//"))
    throw new Error(`Ongeldig pad: ${path}`);
  const url = new URL(path, origin);
  if (url.origin !== origin)
    throw new Error("Pad verlaat de opgegeven website");
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const final = new URL(response.url);
  if (final.origin !== origin)
    throw new Error(`Doorverwijzing naar ander domein bij ${path}`);
  const html = await response.text();
  if (html.length > 3_000_000) throw new Error(`Pagina te groot: ${path}`);
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  const data = await page.evaluate(() => ({
    title: document.title.trim(),
    description:
      document
        .querySelector('meta[name="description" i]')
        ?.getAttribute("content")
        ?.trim() ?? "",
    canonical:
      document.querySelector('link[rel="canonical" i]')?.getAttribute("href") ??
      "",
    robots:
      document
        .querySelector('meta[name="robots" i]')
        ?.getAttribute("content") ?? "",
    headings: Array.from(document.querySelectorAll("h1,h2")).map(
      (e) => e.textContent?.trim() ?? "",
    ),
    links: Array.from(document.querySelectorAll("a[href]")).map(
      (e) => e.getAttribute("href") ?? "",
    ),
    // Bestandsnaam + alt-tekst: beide tellen mee voor Google Afbeeldingen.
    images: Array.from(document.querySelectorAll("img")).map(
      (e) => `${e.getAttribute("src") ?? ""} | alt: ${e.getAttribute("alt") ?? "(ontbreekt)"}`,
    ),
    metadata: Object.fromEntries(
      Array.from(document.querySelectorAll("meta[name],meta[property]"))
        .map((e) => [
          e.getAttribute("name") ?? e.getAttribute("property") ?? "",
          e.getAttribute("content") ?? "",
        ])
        .sort(([a], [b]) => a.localeCompare(b)),
    ),
    structured: Array.from(
      document.querySelectorAll('script[type="application/ld+json"]'),
    ).map((e) => e.textContent?.trim() ?? ""),
  }));
  return {
    path,
    status: response.status,
    finalPath: final.pathname + final.search,
    xRobots: response.headers.get("x-robots-tag") ?? "",
    ...data,
  };
}
try {
  if (mode === "vastleggen") {
    const paths = [
      ...new Set(
        (await readFile(input, "utf8"))
          .split(/\r?\n/)
          .map((p) => p.trim())
          .filter((p) => p && !p.startsWith("#")),
      ),
    ];
    const entries: Entry[] = [];
    for (const path of paths) entries.push(await capture(path));
    await writeFile(
      output,
      JSON.stringify(
        { origin, captured: new Date().toISOString(), entries },
        null,
        2,
      ),
    );
    console.log(`${entries.length} oorspronkelijke pagina’s vastgelegd.`);
  } else {
    const baseline = JSON.parse(await readFile(input, "utf8")) as {
      origin: string;
      entries: Entry[];
    };
    const results = [];
    for (const before of baseline.entries) {
      try {
        const after = await capture(before.path);
        const differences = (
          [
            "status",
            "finalPath",
            "title",
            "description",
            "canonical",
            "robots",
            "xRobots",
            "headings",
            "links",
            "images",
            "structured",
            "metadata",
          ] as const
        ).filter(
          (field) =>
            JSON.stringify(before[field]) !== JSON.stringify(after[field]),
        );
        results.push({
          path: before.path,
          reviewRequired: differences.length > 0 || after.status !== 200,
          differences,
          before,
          after,
        });
      } catch (e) {
        results.push({
          path: before.path,
          reviewRequired: true,
          error: String(e),
        });
      }
    }
    await writeFile(
      output,
      JSON.stringify(
        {
          baseline: baseline.origin,
          target: origin,
          checked: new Date().toISOString(),
          scope:
            "Alleen de aangeleverde paden; geen volledige SEO-audit. Afwijkingen en preview-noindex handmatig beoordelen. Links zijn vergeleken, niet allemaal gevolgd.",
          results,
        },
        null,
        2,
      ),
    );
    const count = results.filter((r) => r.reviewRequired).length;
    console.log(
      `${results.length} pagina’s vergeleken; ${count} vragen beoordeling. Rapport: ${output}`,
    );
    if (count) process.exitCode = 2;
  }
} finally {
  await browser.close();
}
