/**
 * Prospect-scanner: checkt of sites op WordPress draaien en hoe goed ze
 * bijgehouden zijn. Hoe hoger de score, hoe kansrijker als prospect.
 *
 * Gebruik:
 *   npx tsx scripts/prospect-scan.mts bakkerij-jansen.nl ander-bedrijf.nl
 *   npx tsx scripts/prospect-scan.mts --bestand domeinen.txt   (één domein per regel)
 */

type Bevinding = { punten: number; tekst: string };

async function haal(url: string, ms = 10000): Promise<{ res: Response; tekst: string; duurMs: number } | null> {
  try {
    const start = Date.now();
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(ms),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WordSwapCheck/1.0)" },
    });
    const tekst = await res.text();
    return { res, tekst, duurMs: Date.now() - start };
  } catch {
    return null;
  }
}

async function scan(domein: string) {
  const schoon = domein.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!schoon) return;
  const basis = `https://${schoon}`;
  const pagina = (await haal(basis)) ?? (await haal(`http://${schoon}`));
  if (!pagina) {
    console.log(`\n❌ ${schoon} — niet bereikbaar`);
    return;
  }
  const { tekst: html, duurMs } = pagina;
  const bevindingen: Bevinding[] = [];

  // WordPress-detectie
  const isWp =
    /wp-content|wp-includes|wp-json/i.test(html) ||
    /<meta[^>]+generator[^>]+WordPress/i.test(html);
  if (!isWp) {
    console.log(`\n⚪ ${schoon} — lijkt géén WordPress (${duurMs}ms)`);
    return;
  }

  // Versie uit de generator-meta (staat er vaak gewoon in = teken van weinig aandacht)
  const versie = html.match(/generator[^>]+WordPress ([0-9.]+)/i)?.[1];
  if (versie) {
    const hoofd = Number(versie.split(".")[0]);
    if (hoofd <= 5) bevindingen.push({ punten: 3, tekst: `stokoude WordPress ${versie}` });
    else if (hoofd === 6 && Number(versie.split(".")[1] ?? 9) < 4)
      bevindingen.push({ punten: 2, tekst: `verouderde WordPress ${versie}` });
    else bevindingen.push({ punten: 1, tekst: `WordPress ${versie} zichtbaar in de code` });
  }

  // Traagheid
  if (duurMs > 3000) bevindingen.push({ punten: 3, tekst: `erg traag (${(duurMs / 1000).toFixed(1)}s laadtijd)` });
  else if (duurMs > 1500) bevindingen.push({ punten: 2, tekst: `traag (${(duurMs / 1000).toFixed(1)}s laadtijd)` });

  // Oud copyright-jaar in de footer
  const jaren = [...html.matchAll(/(?:©|&copy;|copyright)\s*(20\d\d)/gi)].map((m) => Number(m[1]));
  const nieuwste = jaren.length ? Math.max(...jaren) : null;
  const ditJaar = new Date().getFullYear();
  if (nieuwste && nieuwste < ditJaar - 1)
    bevindingen.push({ punten: 2, tekst: `copyright in de footer staat nog op ${nieuwste}` });

  // Verouderde jQuery (typisch voor oude thema's)
  const jq = html.match(/jquery[.-]?([123])\.[0-9.]+(?:\.min)?\.js/i)?.[1];
  if (jq === "1" || jq === "2") bevindingen.push({ punten: 2, tekst: "draait op stokoude jQuery" });

  // Geen https of kapotte doorverwijzing
  if (pagina.res.url.startsWith("http://")) bevindingen.push({ punten: 3, tekst: "geen werkende https!" });

  // Mobiel-signaal
  if (!/<meta[^>]+viewport/i.test(html)) bevindingen.push({ punten: 3, tekst: "geen mobiele weergave (viewport ontbreekt)" });

  // Bekende buildertjes (vaak trage sites)
  if (/elementor/i.test(html)) bevindingen.push({ punten: 1, tekst: "gebouwd met Elementor (vaak traag/zwaar)" });
  if (/revslider|revolution-slider|sliderrevolution/i.test(html)) bevindingen.push({ punten: 1, tekst: "Revolution Slider aanwezig" });

  // readme.html open = nooit gehard/onderhouden
  const readme = await haal(`${basis}/readme.html`, 5000);
  if (readme?.res.ok && /WordPress/i.test(readme.tekst))
    bevindingen.push({ punten: 2, tekst: "standaard WordPress-bestanden staan open (readme.html)" });

  const score = bevindingen.reduce((s, b) => s + b.punten, 0);
  const stempel = score >= 7 ? "🔥 TOP-PROSPECT" : score >= 4 ? "✅ kansrijk" : "🟡 wordpress, redelijk bijgehouden";
  console.log(`\n${stempel} — ${schoon} (score ${score}, laadtijd ${duurMs}ms)`);
  for (const b of bevindingen) console.log(`   • ${b.tekst}`);
  if (bevindingen.length) {
    console.log(`   💬 observatie-munitie: "${bevindingen.slice(0, 3).map((b) => b.tekst).join(", ")}"`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  let domeinen: string[] = args;
  const bi = args.indexOf("--bestand");
  if (bi !== -1) {
    const { readFileSync } = await import("node:fs");
    domeinen = readFileSync(args[bi + 1], "utf8").split("\n").filter(Boolean);
  }
  if (domeinen.length === 0) {
    console.log("Gebruik: npx tsx scripts/prospect-scan.mts domein1.nl domein2.nl  (of --bestand lijst.txt)");
    return;
  }
  for (const d of domeinen) await scan(d);
  console.log("");
}
main();
