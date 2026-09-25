import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { leesSeo, vergelijkSeo } from "../lib/seo-overname";
import { controleerSiteMap } from "../lib/bouw-controle";

/**
 * De oude pagina is de opdracht. Gemeten bij Vakbeursonline: deelplaatje,
 * deeltekst en artikeldatum verdwenen zonder dat iets klaagde.
 */

// 1. Yoast schrijft enkele aanhalingstekens; een losse regex zag die niet
const yoast = `<!doctype html><html><head>
<title>Scheiden met kinderen | Van den Berg Mediation</title>
<meta name='robots' content='index, follow, max-image-preview:large' />
<meta name="description" content="Wat regel je voor de kinderen?" />
<link rel="canonical" href="https://vandenbergmediation.nl/scheiden-met-kinderen/" />
<meta property="og:title" content="Scheiden met kinderen" />
<meta property="og:description" content="Wat regel je voor de kinderen?" />
<meta property="og:image" content="https://vandenbergmediation.nl/wp-content/uploads/kind.jpg" />
<script type="application/ld+json" class="yoast-schema-graph">{"@context":"https://schema.org","@graph":[{"@type":"Article","datePublished":"2024-03-01T09:00:00+00:00","dateModified":"2025-01-10T12:00:00+00:00"}]}</script>
</head><body><h1>Scheiden met kinderen</h1></body></html>`;
const oud = leesSeo(yoast);
assert.equal(oud.noindex, false);
assert.equal(leesSeo(`<meta name='robots' content='noindex, follow'>`).noindex, true, "enkele aanhalingstekens gemist");
assert.equal(oud.omschrijving, "Wat regel je voor de kinderen?");
assert.equal(oud.gepubliceerd, "2024-03-01T09:00:00+00:00", "datum diep in de @graph gemist");
assert.equal(oud.ogAfbeelding, "https://vandenbergmediation.nl/wp-content/uploads/kind.jpg");

// 2. Drie uitkomsten: weg, anders, en winst telt niet
const nieuw = leesSeo(`<title>Scheiden met kinderen | Van den Berg Mediation</title>
<meta name="description" content="Iets anders">
<link rel="canonical" href="https://VERVANG.nl/scheiden-met-kinderen/">
<meta property="og:title" content="Scheiden met kinderen">
<meta property="og:image" content="https://VERVANG.nl/afbeeldingen/kind.webp">
<meta property="og:locale" content="nl_NL">`);
const v = vergelijkSeo(oud, nieuw);
const soort = (veld: string) => v.find((x) => x.veld === veld)?.soort;
assert.equal(soort("titel"), undefined);
assert.equal(soort("canonical"), undefined, "ander domein, zelfde pad is gelijk");
assert.equal(soort("ogAfbeelding"), undefined, "nieuw beeldpad is geen verlies");
assert.equal(soort("omschrijving"), "anders");
assert.equal(soort("ogOmschrijving"), "weg");
assert.equal(soort("gepubliceerd"), "weg");
assert.equal(vergelijkSeo(leesSeo("<title>Scheiden met kinderen | Van den Berg Mediation</title>"), nieuw).length, 0, "winst mag nooit een melding geven");

// 2b. Kalibratie op de zeven echte sites (25-09): ruis mag geen melding geven
const pagina = leesSeo(`<title>Contact - BSR Veluwezoom</title>
<script type="application/ld+json">{"@graph":[{"@type":"WebPage","datePublished":"2016-11-09T10:28:25+00:00"}]}</script>`);
assert.equal(pagina.isArtikel, false);
assert.equal(vergelijkSeo(pagina, leesSeo("<title>Contact</title>")).length, 0, "datum van een gewone pagina telt niet");
assert.equal(
  vergelijkSeo(oud, { ...leesSeo(yoast), ...leesSeo('<meta property="article:published_time" content="2024-03-01">'), isArtikel: false })
    .find((x) => x.veld === "gepubliceerd"),
  undefined,
  "datum zonder JSON-LD op de nieuwe pagina telt ook",
);
assert.equal(vergelijkSeo(pagina, leesSeo("<title>Contact</title>")).length, 0, "sitenaam-achtervoegsel is geen verschil");
assert.equal(
  vergelijkSeo(leesSeo("<title>Tarieven</title>"), leesSeo("<title>Tarieven 2026</title>"))[0]?.soort,
  "anders",
  "echt andere titel wel melden",
);
assert.equal(
  vergelijkSeo(oud, { ...leesSeo(yoast), ogOmschrijving: "Betere deeltekst" }).length,
  0,
  "bij de deellaag telt alleen of hij er is",
);

// 3. Canonical naar een ander pad is geen gelijk
assert.equal(
  vergelijkSeo(oud, { ...leesSeo(yoast), canonical: "https://VERVANG.nl/kennis/" }).find((x) => x.veld === "canonical")?.soort,
  "anders",
);

// 4. In de poort: fout voor weg, waarschuwing voor anders, pad via de canonical
const werk = await mkdtemp(path.join(tmpdir(), "seo-overname-"));
try {
  const site = path.join(werk, "site");
  const bron = path.join(werk, "site-bron");
  await mkdir(path.join(site, "scheiden-met-kinderen"), { recursive: true });
  await mkdir(path.join(bron, "oud-ontwerp"), { recursive: true });
  await writeFile(path.join(bron, "oud-ontwerp", "scheiden-met-kinderen.html"), yoast);
  await writeFile(
    path.join(site, "scheiden-met-kinderen", "index.html"),
    `<!doctype html><html><head><title>Scheiden met kinderen | Van den Berg Mediation</title>
<meta name="description" content="Wat regel je voor de kinderen?">
<link rel="canonical" href="https://VERVANG.nl/scheiden-met-kinderen/">
<meta property="og:title" content="Scheiden met kinderen"></head><body><h1>x</h1></body></html>`,
  );
  const b = (await controleerSiteMap(site, { bronMap: bron })).filter((x) => x.regel === "seo-overname");
  assert.ok(b.some((x) => x.ernst === "fout" && x.detail.includes("deelplaatje")), "verdwenen og:image geen fout");
  assert.ok(b.some((x) => x.ernst === "fout" && x.detail.includes("publicatiedatum")), "verdwenen datum geen fout");
  assert.ok(!b.some((x) => x.detail.includes("omschrijving voor Google")), "gelijke omschrijving gemeld");
  assert.ok(b.every((x) => x.waar === "scheiden-met-kinderen/index.html"));

  // Vastlegging van seo-vergelijk.mts gaat voor, incl. X-Robots-Tag
  await writeFile(
    path.join(bron, "seo-baseline.json"),
    JSON.stringify({
      entries: [
        {
          path: "/scheiden-met-kinderen/", status: 200, finalPath: "/scheiden-met-kinderen/",
          title: "Scheiden met kinderen | Van den Berg Mediation", description: "", canonical: "",
          robots: "", xRobots: "noindex", structured: [], metadata: { "og:image": "x.jpg" },
        },
      ],
    }),
  );
  const c = (await controleerSiteMap(site, { bronMap: bron })).filter((x) => x.regel === "seo-overname");
  assert.equal(c.length, 0, "noindex via header moet de oude pagina overslaan");
} finally {
  await rm(werk, { recursive: true, force: true });
}

console.log("✓ seo-overname: oude pagina als opdracht, drie uitkomsten, Yoast-aanhalingstekens");
