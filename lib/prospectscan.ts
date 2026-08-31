/** Scant een site: WordPress-detectie + verwaarlozings-signalen.
 * Gebruikt door scripts/prospect-scan.mts en de admin-Outreach-pagina. */

export type ScanResultaat = {
  domein: string;
  bereikbaar: boolean;
  isWordpress: boolean;
  laadMs: number;
  score: number;
  stempel: string;
  bevindingen: string[];
  observatie: string;
};

async function haal(
  url: string,
  ms = 10000
): Promise<{ res: Response; tekst: string; duurMs: number } | null> {
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

export async function scanProspect(domein: string): Promise<ScanResultaat> {
  const schoon = domein.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const leeg: ScanResultaat = {
    domein: schoon,
    bereikbaar: false,
    isWordpress: false,
    laadMs: 0,
    score: 0,
    stempel: "niet bereikbaar",
    bevindingen: [],
    observatie: "",
  };
  if (!schoon) return leeg;

  const basis = `https://${schoon}`;
  const pagina = (await haal(basis)) ?? (await haal(`http://${schoon}`));
  if (!pagina) return leeg;
  const { tekst: html, duurMs } = pagina;

  const isWp =
    /wp-content|wp-includes|wp-json/i.test(html) ||
    /<meta[^>]+generator[^>]+WordPress/i.test(html);
  if (!isWp) {
    return {
      ...leeg,
      bereikbaar: true,
      laadMs: duurMs,
      stempel: "geen WordPress",
    };
  }

  const bevindingen: { punten: number; tekst: string }[] = [];

  const versie = html.match(/generator[^>]+WordPress ([0-9.]+)/i)?.[1];
  if (versie) {
    const hoofd = Number(versie.split(".")[0]);
    if (hoofd <= 5) bevindingen.push({ punten: 3, tekst: `stokoude WordPress ${versie}` });
    else if (hoofd === 6 && Number(versie.split(".")[1] ?? 9) < 4)
      bevindingen.push({ punten: 2, tekst: `verouderde WordPress ${versie}` });
    else bevindingen.push({ punten: 1, tekst: `WordPress ${versie} zichtbaar in de code` });
  }

  if (duurMs > 3000)
    bevindingen.push({ punten: 3, tekst: `erg traag (${(duurMs / 1000).toFixed(1)}s laadtijd)` });
  else if (duurMs > 1500)
    bevindingen.push({ punten: 2, tekst: `traag (${(duurMs / 1000).toFixed(1)}s laadtijd)` });

  const jaren = [...html.matchAll(/(?:©|&copy;|copyright)\s*(20\d\d)/gi)].map((m) => Number(m[1]));
  const nieuwste = jaren.length ? Math.max(...jaren) : null;
  const ditJaar = new Date().getFullYear();
  if (nieuwste && nieuwste < ditJaar - 1)
    bevindingen.push({ punten: 2, tekst: `copyright in de footer staat nog op ${nieuwste}` });

  const jq = html.match(/jquery[.-]?([123])\.[0-9.]+(?:\.min)?\.js/i)?.[1];
  if (jq === "1" || jq === "2") bevindingen.push({ punten: 2, tekst: "draait op stokoude jQuery" });

  if (pagina.res.url.startsWith("http://"))
    bevindingen.push({ punten: 3, tekst: "geen werkende https" });

  if (!/<meta[^>]+viewport/i.test(html))
    bevindingen.push({ punten: 3, tekst: "geen mobiele weergave (viewport ontbreekt)" });

  if (/elementor/i.test(html))
    bevindingen.push({ punten: 1, tekst: "gebouwd met Elementor (vaak traag/zwaar)" });
  if (/revslider|revolution-slider|sliderrevolution/i.test(html))
    bevindingen.push({ punten: 1, tekst: "Revolution Slider aanwezig" });

  const readme = await haal(`${basis}/readme.html`, 5000);
  if (readme?.res.ok && /WordPress/i.test(readme.tekst))
    bevindingen.push({ punten: 2, tekst: "standaard WordPress-bestanden staan open (readme.html)" });

  const score = bevindingen.reduce((s, b) => s + b.punten, 0);
  return {
    domein: schoon,
    bereikbaar: true,
    isWordpress: true,
    laadMs: duurMs,
    score,
    stempel:
      score >= 7 ? "🔥 top-prospect" : score >= 4 ? "✅ kansrijk" : "🟡 WordPress, redelijk bijgehouden",
    bevindingen: bevindingen.map((b) => b.tekst),
    observatie: bevindingen
      .slice(0, 3)
      .map((b) => b.tekst)
      .join(", "),
  };
}
