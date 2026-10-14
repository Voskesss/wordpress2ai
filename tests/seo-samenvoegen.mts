/**
 * SEO-ronde 14-10-2026: pagina's die op dezelfde zoekterm mikten zijn
 * samengevoegd tot één hoofdpagina per onderwerp, en de sitemap, llms.txt en
 * footer lezen voortaan uit één lijst (lib/seo-paginas.ts). Deze test bewaakt
 * dat (1) elke weggehaalde pagina permanent doorstuurt naar een bestaande
 * hoofdpagina, (2) elke openbare pagina in de lijst staat en andersom, en
 * (3) llms.txt en de sitemap het www-adres gebruiken.
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
const mod = (await import("../next.config")) as { default: unknown };
const nextConfig = ((mod.default as { default?: unknown }).default ?? mod.default) as import("next").NextConfig;
import { SEO_PAGINAS } from "../lib/seo-paginas";

// 1. Doorverwijzingen: permanent, naar een pagina die bestaat, en de oude map is weg
const regels = (await nextConfig.redirects!()) as { source: string; destination: string; permanent: boolean }[];
const verwacht: Record<string, string> = {
  "/website-zonder-cms": "/wordpress-overzetten",
  "/wordpress-omzetten-naar-gewone-website": "/wordpress-overzetten",
  "/wordpress-omzetten-snel-en-ai-vriendelijk": "/wordpress-overzetten",
  "/wordpress-aansturen-met-ai": "/website-koppelen-aan-ai",
  "/wordpress-website-maken-met-ai": "/nieuwe-website",
};
for (const [van, naar] of Object.entries(verwacht)) {
  const r = regels.find((x) => x.source === van);
  assert.ok(r, `${van} stuurt niet door`);
  assert.equal(r.destination, naar, `${van} stuurt naar ${r.destination}, verwacht ${naar}`);
  assert.equal(r.permanent, true, `${van} moet permanent doorsturen, anders blijft Google de oude pagina tonen`);
  assert.ok(!existsSync(`app${van}`), `app${van} bestaat nog: dan wint de pagina het van de doorverwijzing niet`);
  assert.ok(existsSync(`app${naar}/page.tsx`), `doel ${naar} bestaat niet`);
  assert.ok(!SEO_PAGINAS.some((p) => p.pad === van), `${van} staat nog in de paginalijst`);
}

// 2. Elke openbare pagina staat in de lijst, en elke regel in de lijst bestaat
const nietOpenbaar = new Set(["portal", "admin", "api", "sign-in", "sign-up", "afspraak", "betalen", "betaald", "bedankt", "check", "site-weergave", "preview", "video", "llms.txt", "llms-full.txt"]);
const mappen = readdirSync("app", { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_") && !d.name.startsWith("[") && !d.name.startsWith("(") && !nietOpenbaar.has(d.name))
  .filter((d) => existsSync(`app/${d.name}/page.tsx`) || d.name === "demo")
  .map((d) => `/${d.name}`);
const inLijst = new Set(SEO_PAGINAS.map((p) => p.pad));
const ontbreekt = mappen.filter((m) => !inLijst.has(m));
assert.deepEqual(ontbreekt, [], `openbare pagina's die niet in lib/seo-paginas.ts staan (dus niet in sitemap, llms.txt en footer): ${ontbreekt.join(", ")}`);
for (const p of SEO_PAGINAS) {
  if (p.pad) assert.ok(existsSync(`app${p.pad}`), `${p.pad} staat in de lijst maar bestaat niet`);
  assert.ok(p.zin.length > 30, `${p.pad || "/"} heeft geen echte zin voor llms.txt`);
  assert.ok(!p.zin.includes("—"), `${p.pad || "/"}: lang streepje in de zin`);
}
assert.equal(new Set(SEO_PAGINAS.map((p) => p.pad)).size, SEO_PAGINAS.length, "dubbele regel in de paginalijst");

// 3. Sitemap en llms.txt: www-adressen, alles erin, juridisch laag
const smod = (await import("../app/sitemap")) as { default: unknown };
const sitemap = ((smod.default as { default?: unknown }).default ?? smod.default) as () => import("next").MetadataRoute.Sitemap;
const kaart = sitemap();
assert.equal(kaart.length, SEO_PAGINAS.length);
assert.ok(kaart.every((k) => k.url.startsWith("https://www.wordswap.nl")), "sitemap moet het www-adres gebruiken");
assert.ok(kaart.every((k) => k.lastModified), "elke pagina in de sitemap heeft een datum");
assert.ok((kaart.find((k) => k.url.endsWith("/privacy"))?.priority ?? 1) < 0.5, "juridische pagina's horen laag in de sitemap");

const { GET } = await import("../app/llms.txt/route");
const llms = await GET().text();
for (const p of SEO_PAGINAS.filter((p) => p.groep !== "juridisch")) {
  assert.ok(llms.includes(`https://www.wordswap.nl${p.pad || "/"}`), `llms.txt mist ${p.pad || "/"}`);
}
assert.ok(!/https:\/\/wordswap\.nl/.test(llms), "llms.txt gebruikt nog adressen zonder www (dat is een omweg via een doorverwijzing)");
for (const van of Object.keys(verwacht)) assert.ok(!llms.includes(van), `llms.txt noemt nog ${van}`);

console.log(`seo-samenvoegen: ok (${Object.keys(verwacht).length} doorverwijzingen, ${SEO_PAGINAS.length} pagina's in de lijst)`);
