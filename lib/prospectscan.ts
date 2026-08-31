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
  /** Automatisch van de site geplukt, als vulling voor het prospect-formulier */
  bedrijf?: string;
  email?: string;
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

/** Plukt bedrijfsnaam en e-mailadres uit de HTML van een site. */
function haalContact(html: string, domein: string): { bedrijf?: string; email?: string } {
  // Bedrijfsnaam: og:site_name > <title> (opgeschoond) > domein
  let bedrijf =
    html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)/i)?.[1] ??
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  if (bedrijf) {
    bedrijf = bedrijf
      .split(/\s[|–—-]\s/)[0] // "Bedrijf | Slogan" → "Bedrijf"
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    if (/^(home|welkom|start|homepage)$/i.test(bedrijf)) bedrijf = undefined;
  }
  if (!bedrijf) {
    const kern = domein.replace(/\.(nl|com|eu|be|net|org)$/i, "").replace(/[-.]/g, " ");
    bedrijf = kern.charAt(0).toUpperCase() + kern.slice(1);
  }

  // E-mail: eerst mailto-links, anders platte adressen in de tekst
  const kandidaten = [
    ...[...html.matchAll(/mailto:([^"'?\s>]+@[^"'?\s>]+)/gi)].map((m) => m[1]),
    ...[...html.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]{2,}/g)].map((m) => m[0]),
  ]
    .map((e) => e.toLowerCase().replace(/[.,;:]+$/, ""))
    .filter(
      (e) =>
        !/\.(png|jpe?g|gif|webp|svg|css|js)$/i.test(e) &&
        !/(sentry|wixpress|example|domain\.com|yoursite|gravatar|godaddy)/i.test(e)
    );
  // Voorkeur voor een adres op het eigen domein, en voor info@/contact@
  const eigen = kandidaten.filter((e) => e.endsWith(`@${domein}`) || e.includes(domein.split(".")[0]));
  const pool = eigen.length > 0 ? eigen : kandidaten;
  const email =
    pool.find((e) => /^(info|contact|welkom|hallo|mail)@/.test(e)) ?? pool[0];

  return { bedrijf, email };
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
  let contact = haalContact(html, schoon);
  // Geen e-mail op de homepage? Even op de contactpagina kijken.
  if (!contact.email) {
    for (const pad of ["/contact", "/contact/", "/contact.html", "/contact-opnemen"]) {
      const cp = await haal(`${basis}${pad}`, 6000);
      if (!cp?.res.ok) continue;
      const extra = haalContact(cp.tekst, schoon);
      if (extra.email) {
        contact = { ...contact, email: extra.email };
        break;
      }
    }
  }

  if (!isWp) {
    return {
      ...leeg,
      bereikbaar: true,
      laadMs: duurMs,
      stempel: "geen WordPress",
      ...contact,
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
    ...contact,
  };
}

const NIET_INTERESSANT =
  /duckduckgo\.|bing\.|google\.|facebook\.|instagram\.|linkedin\.|youtube\.|marktplaats|werkspot|trustoo|slimster|gouden(gids)?|detelefoongids|telefoonboek|opendi|cylex|indeed|werkzoeken|homedeal|offerte|vergelijk|wikipedia|tripadvisor|yelp|thuisbezorgd|treatwell|kvk\.nl|funda|schildernet|zoofy|qassa|startpagina|infobel|drimble|openingstijden|oozo\.|allebedrijvenin|bedrijvenpagina|onderneming\.net|top\d{2,}|wiewat|salonweb|^local\.|beoordelingen|reviews?\.|-gigant|gigant\.|portaal|platform|overzicht|vindeen|vind-een|-nu\.nl$|-in\.nl$|bedrijvengids|zoekbedrijf|branchevereniging/i;

/** Zoekt bedrijfssites voor een branche (+plaats) en scant ze op WordPress
 * en verwaarlozing. Resultaat gesorteerd: kansrijkste bovenaan. */
export async function zoekProspects(
  branche: string,
  plaats: string
): Promise<ScanResultaat[]> {
  const vraag = encodeURIComponent(`${branche} ${plaats}`.trim());
  const zoek = await fetch(`https://html.duckduckgo.com/html/?q=${vraag}`, {
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
    signal: AbortSignal.timeout(15000),
  })
    .then((r) => r.text())
    .catch(() => "");

  const domeinen: string[] = [];
  for (const m of zoek.matchAll(/uddg=([^&"]+)/g)) {
    try {
      const url = decodeURIComponent(m[1]);
      if (/duckduckgo\.com\/y\.js/.test(url)) continue; // advertenties
      const host = new URL(url).hostname.replace(/^www\./, "");
      if (NIET_INTERESSANT.test(host)) continue;
      if (!domeinen.includes(host)) domeinen.push(host);
    } catch {
      // onbruikbare link overslaan
    }
  }

  // Zoekmachine geblokkeerd (gebeurt vanaf datacenter-servers)? Dan via Claude.
  if (domeinen.length < 2) {
    for (const d of await zoekDomeinenViaClaude(branche, plaats)) {
      if (!domeinen.includes(d)) domeinen.push(d);
    }
  }

  const kandidaten = domeinen.slice(0, 12);
  const resultaten: ScanResultaat[] = [];
  // Vier tegelijk scannen (sneller, zonder de boel te overvragen)
  for (let i = 0; i < kandidaten.length; i += 4) {
    const stuk = await Promise.all(kandidaten.slice(i, i + 4).map((d) => scanProspect(d)));
    resultaten.push(...stuk);
  }
  return resultaten
    .filter((r) => r.bereikbaar)
    .sort((a, b) => Number(b.isWordpress) - Number(a.isWordpress) || b.score - a.score);
}

/** Terugval: laat Claude (met websearch) bedrijfssites vinden — werkt ook
 * vanaf servers waar zoekmachines datacenter-verkeer blokkeren. */
async function zoekDomeinenViaClaude(branche: string, plaats: string): Promise<string[]> {
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();
    const resp = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 } as never],
      messages: [
        {
          role: "user",
          content: `Zoek websites van individuele bedrijven in Nederland in de branche "${branche}"${plaats ? ` in ${plaats}` : ""} — dus de eigen site van een bedrijf, niet een overzichts- of vergelijkingssite. Geef de domeinnamen als JSON-array, bijvoorbeeld ["bedrijf1.nl","bedrijf2.nl"]. Maximaal 12.`,
        },
      ],
    });
    const tekst = resp.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");
    // Eerst de nette weg; loopt het antwoord toch af (afgekapt of extra
    // uitleg eromheen), dan vissen we de domeinen er alsnog los uit.
    let lijst: string[] = [];
    const json = tekst.match(/\[[\s\S]*?\]/)?.[0];
    if (json) {
      try {
        lijst = JSON.parse(json) as string[];
      } catch {
        lijst = [];
      }
    }
    if (lijst.length === 0) {
      lijst = [
        ...tekst.matchAll(/\b([a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:nl|com|eu|net|be))\b/gi),
      ].map((m) => m[1]);
    }
    const schoon = lijst
      .map((d) => String(d).trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").toLowerCase())
      .filter((d) => d.includes(".") && !NIET_INTERESSANT.test(d));
    return [...new Set(schoon)];
  } catch (e) {
    console.error("Claude-zoekterugval mislukt:", e);
    return [];
  }
}
