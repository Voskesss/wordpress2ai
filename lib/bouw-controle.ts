/**
 * Bouw-controle: de harde opleveringseisen uit de migratie-skill als code,
 * zodat migraties, ontwerp-promoties en (later) publicaties dezelfde poort
 * delen. Alleen bestandscontroles — geen browser, geen netwerk — zodat dit
 * ook op Vercel tegen een werkmap kan draaien. De browsergebonden checks
 * (mobiel, snelheid) zitten in scripts/bouw-controle.mts.
 *
 * Gebruik: const bevindingen = await controleerSiteMap(map, { seoManifest });
 * Ernst "fout" blokkeert een oplevering; "waarschuwing" is een werklijstje.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

export type Bevinding = {
  ernst: "fout" | "waarschuwing";
  regel: string;
  waar: string;
  detail: string;
};

/**
 * Er bestaan twee manifestvormen: de live-oogst (object met volledige URL's
 * als sleutels, velden title/description) en de WXR-route van
 * voorbereiden.mts (lijst met pad/titel/description). Beide zijn welkom.
 */
export type SeoManifest = unknown;

type ManifestRegel = { pad: string; title?: string };

export function normaliseerManifest(ruw: SeoManifest): ManifestRegel[] {
  if (Array.isArray(ruw))
    return ruw
      .filter((r) => r && typeof r === "object")
      .map((r: Record<string, unknown>) => ({
        pad: String(r.pad ?? r.url ?? ""),
        title: typeof r.titel === "string" ? r.titel : typeof r.title === "string" ? r.title : undefined,
      }))
      .filter((r) => r.pad);
  if (ruw && typeof ruw === "object")
    return Object.entries(ruw as Record<string, Record<string, unknown>>).map(
      ([sleutel, w]) => ({
        pad: sleutel,
        title: typeof w?.title === "string" ? w.title : typeof w?.titel === "string" ? (w.titel as string) : undefined,
      }),
    );
  return [];
}

const OVERSLAAN = new Set([".git", "node_modules", ".DS_Store"]);

async function htmlBestanden(map: string): Promise<string[]> {
  const uit: string[] = [];
  async function loop(sub: string) {
    for (const naam of await readdir(sub)) {
      if (OVERSLAAN.has(naam)) continue;
      const vol = path.join(sub, naam);
      const info = await stat(vol);
      if (info.isDirectory()) await loop(vol);
      else if (naam.endsWith(".html")) uit.push(vol);
    }
  }
  await loop(map);
  return uit.sort();
}

const relatief = (map: string, pad: string) => path.relative(map, pad);

/** /over-ons/index.html → /over-ons/ ; /404.html → /404.html */
function padVanBestand(rel: string): string {
  const p = "/" + rel.replace(/\\/g, "/");
  return p.endsWith("/index.html") ? p.slice(0, -"index.html".length) : p;
}

function eersteRegelNummer(inhoud: string, index: number): number {
  return inhoud.slice(0, Math.max(0, index)).split("\n").length;
}

export async function controleerSiteMap(
  map: string,
  opties: { seoManifest?: SeoManifest } = {},
): Promise<Bevinding[]> {
  const uit: Bevinding[] = [];
  const fout = (regel: string, waar: string, detail: string) =>
    uit.push({ ernst: "fout", regel, waar, detail });
  const waarschuw = (regel: string, waar: string, detail: string) =>
    uit.push({ ernst: "waarschuwing", regel, waar, detail });

  const bestandBestaat = async (rel: string) => {
    try {
      return (await stat(path.join(map, rel))).isFile();
    } catch {
      return false;
    }
  };

  const paginas = (await htmlBestanden(map)).filter(
    (p) => !relatief(map, p).startsWith("delen" + path.sep),
  );
  if (!paginas.length) {
    fout("structuur", map, "Geen enkele HTML-pagina gevonden.");
    return uit;
  }

  // _redirects inlezen (oud pad → nieuw pad)
  const redirects = new Map<string, string>();
  try {
    const tekst = await readFile(path.join(map, "_redirects"), "utf8");
    for (const regel of tekst.split("\n")) {
      const schoon = regel.trim();
      if (!schoon || schoon.startsWith("#")) continue;
      const [van, naar] = schoon.split(/\s+/);
      if (van && naar) redirects.set(van, naar);
    }
  } catch {
    /* geen _redirects is prima zolang niets ernaar verwijst */
  }

  const paginaPaden = new Set(
    paginas.map((p) => padVanBestand(relatief(map, p))),
  );
  const bestaatAlsPagina = (pad: string) => {
    const schoon = pad.split(/[?#]/)[0];
    if (paginaPaden.has(schoon)) return true;
    if (!schoon.endsWith("/") && paginaPaden.has(schoon + "/")) return true;
    return false;
  };

  // delen/ vooraf inlezen voor de markercontrole (en de inhoud voor controles
  // op de pagina zoals de bezoeker hem ziet, mét ingevoegde blokken)
  const delenNamen = new Set<string>();
  const delenInhoud = new Map<string, string>();
  try {
    for (const naam of await readdir(path.join(map, "delen")))
      if (naam.endsWith(".html")) {
        delenNamen.add(naam.slice(0, -5));
        delenInhoud.set(naam.slice(0, -5), await readFile(path.join(map, "delen", naam), "utf8"));
      }
  } catch {
    /* site zonder delen/ kan, markers vangen het hieronder */
  }
  const uitgevouwen = (html: string) =>
    html.replace(/<!--invoeg:([\w-]+)-->/g, (m, naam) => delenInhoud.get(naam) ?? m);

  const indexeerbaar: string[] = [];

  for (const bestand of paginas) {
    const rel = relatief(map, bestand);
    const inhoud = await readFile(bestand, "utf8");
    const noindex = /<meta[^>]+name=["']robots["'][^>]*noindex/i.test(inhoud);
    if (!noindex) indexeerbaar.push(rel);

    // 1. Formulieren: altijd via ons endpoint, met de verplichte velden
    const formulieren = inhoud.split(/<form\b/i).slice(1);
    for (const blok of formulieren) {
      const form = blok.split(/<\/form>/i)[0];
      const zoek = /\brole=["']search["']/i.test(form);
      if (zoek) continue;
      if (!/action=["']https:\/\/wordswap\.nl\/api\/formulier["']/i.test(form))
        fout("formulier", rel, "Formulier wijst niet naar wordswap.nl/api/formulier.");
      for (const veld of ["_site", "_formulier", "_bedankt", "_extra"])
        if (!new RegExp(`name=["']${veld}["']`).test(form))
          fout("formulier", rel, `Verplicht veld ${veld} ontbreekt in een formulier.`);
    }

    // 2. Invoeg-markers verwijzen naar bestaande delen-bestanden
    for (const m of inhoud.matchAll(/<!--invoeg:([\w-]+)-->/g))
      if (!delenNamen.has(m[1]))
        fout("markers", rel, `Marker invoeg:${m[1]} heeft geen delen/${m[1]}.html.`);

    // 3. Geen WordPress-/buildersporen in de eigen code
    const spoor = inhoud.match(
      /class=["'][^"']*\b(wp-block|wp-content|elementor-|et_pb_|vc_row|vc_col|fusion-)[^"']*["']/,
    );
    if (spoor)
      fout("schone-code", rel, `WordPress-/bouwerklasse gevonden: ${spoor[1]}… (regel ${eersteRegelNummer(inhoud, spoor.index ?? 0)}).`);

    // 4. Elke afbeelding een alt-attribuut
    for (const img of inhoud.matchAll(/<img\b[^>]*>/gi))
      if (!/\balt=/.test(img[0]))
        fout("alt-teksten", rel, `img zonder alt (regel ${eersteRegelNummer(inhoud, img.index ?? 0)}).`);

    // 4b. Dezelfde foto niet twee keer groot op één pagina (bv. een
    // dienst-tegel en een projectkaart met hetzelfde beeld onder elkaar).
    // Zoals de bezoeker hem ziet: mét ingevoegde blokken. Formaatvarianten
    // (-800, -klein, -v…) zijn dezelfde foto; duimnagels (≤ 120px) tellen niet.
    {
      const perFoto = new Map<string, number>();
      for (const img of uitgevouwen(inhoud).matchAll(/<img\b[^>]*>/gi)) {
        const breedte = Number(img[0].match(/\bwidth=["']?(\d+)/i)?.[1] ?? 0);
        if (breedte && breedte <= 120) continue;
        const src = img[0].match(/\bsrc=["']([^"']+)["']/i)?.[1];
        // Logo's (kop én voet) en svg-iconen horen juist vaker terug te komen
        if (!src || /\.svg(?:[?#]|$)/i.test(src) || /logo/i.test(path.basename(src))) continue;
        const sleutel = path
          .basename(src.split(/[?#]/)[0])
          .replace(/\.[a-z0-9]+$/i, "")
          .replace(/-v[0-9a-z]{6,}$/i, "")
          .replace(/-(?:\d{3,4}|klein|groot)$/i, "");
        perFoto.set(sleutel, (perFoto.get(sleutel) ?? 0) + 1);
      }
      for (const [foto, aantal] of perFoto)
        if (aantal > 1)
          waarschuw("foto-dubbel", rel, `Foto "${foto}" staat ${aantal} keer op deze pagina — kies voor de ene plek een ander beeld.`);
    }

    // 5. Interne links en verwijzingen bestaan
    for (const m of inhoud.matchAll(/(?:href|src)=["'](\/[^"']*)["']/g)) {
      const doel = m[1].split(/[?#]/)[0];
      if (!doel || doel === "/") continue;
      if (doel.startsWith("//")) continue;
      if (bestaatAlsPagina(doel)) continue;
      if (redirects.has(doel) || redirects.has(doel.replace(/\/$/, "") + "/")) continue;
      if (await bestandBestaat(doel.replace(/^\//, ""))) continue;
      fout("dode-links", rel, `Verwijzing naar ${m[1]} maar dat pad bestaat niet.`);
    }

    // 5b. Documenten die nog op een andere server staan. Een notule of statuut
    // dat naar de oude hosting wijst werkt tot de klant daar opzegt — dan is
    // het archief weg. Waarschuwing, want een verwijzing naar een document van
    // een derde partij (gemeente, Woonbond) mag natuurlijk wel.
    for (const m of inhoud.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)) {
      if (!/\.(pdf|docx?|xlsx?|pptx?|odt|ods|odp)([?#]|$)/i.test(m[1])) continue;
      const host = m[1].replace(/^https?:\/\//, "").split("/")[0];
      waarschuw(
        "extern-document",
        rel,
        `Document staat op ${host} — zet het in documenten/ als het van de klant zelf is, anders breekt de link zodra de oude hosting stopt.`,
      );
    }

    // 6. Titel, omschrijving en favicon per pagina
    const titel = inhoud.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim();
    if (!titel) fout("seo", rel, "Geen <title>.");
    if (!noindex) {
      if (!/<meta[^>]+name=["']description["'][^>]*content=["'][^"']+["']/i.test(inhoud))
        fout("seo", rel, "Geen meta description.");
      if (!/<link[^>]+rel=["']canonical["']/i.test(inhoud))
        waarschuw("seo", rel, "Geen canonical-link.");
      if (!/property=["']og:image["']/i.test(inhoud))
        waarschuw("seo", rel, "Geen og:image (deelplaatje).");
    }
    if (!/<link[^>]+rel=["'](?:shortcut )?icon["']/i.test(inhoud))
      fout("favicon", rel, "Geen favicon-link in de head.");
    if (!/<meta[^>]+name=["']viewport["']/i.test(inhoud))
      fout("mobiel", rel, "Geen viewport-meta.");
    if (/VERVANG\.nl/.test(inhoud))
      waarschuw("livegang", rel, "Placeholder-domein VERVANG.nl — vóór domeinkoppeling vervangen.");
  }

  // 7. Standaardpagina's en -bestanden
  if (!(await bestandBestaat("404.html")))
    fout("standaard", "404.html", "Ontbreekt.");
  else {
    const vierNulVier = await readFile(path.join(map, "404.html"), "utf8");
    if (!/noindex/.test(vierNulVier)) fout("standaard", "404.html", "Mist noindex.");
    const relatiefPad = vierNulVier.match(/(?:href|src)=["'](?!https?:|\/|#|mailto:|tel:)([^"']+\.(?:css|webp|png|jpg|svg|html))["']/);
    if (relatiefPad)
      fout("standaard", "404.html", `Relatieve verwijzing (${relatiefPad[1]}): de 404 kan op elk adres verschijnen, gebruik absolute paden.`);
  }
  if (!(await bestandBestaat("bedankt/index.html")))
    fout("standaard", "bedankt/", "Bedankt-pagina ontbreekt.");
  for (const [bestand, eis] of [
    ["robots.txt", /Sitemap:/i],
    ["_headers", /nosniff/i],
    ["llms.txt", /^# /m],
  ] as const) {
    try {
      const inhoud = await readFile(path.join(map, bestand), "utf8");
      if (!eis.test(inhoud)) fout("standaard", bestand, "Aanwezig maar mist de verplichte inhoud.");
    } catch {
      fout("standaard", bestand, "Ontbreekt.");
    }
  }

  // 8. sitemap.xml klopt met de echte pagina's, beide kanten op
  try {
    const sitemap = await readFile(path.join(map, "sitemap.xml"), "utf8");
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
      try {
        return new URL(m[1]).pathname;
      } catch {
        return m[1];
      }
    });
    for (const loc of locs)
      if (!bestaatAlsPagina(loc))
        fout("sitemap", "sitemap.xml", `Sitemap noemt ${loc} maar die pagina bestaat niet.`);
    const inSitemap = new Set(locs);
    for (const rel of indexeerbaar) {
      const pad = padVanBestand(rel);
      if (pad === "/404.html") continue;
      if (!inSitemap.has(pad))
        waarschuw("sitemap", rel, `Indexeerbare pagina staat niet in sitemap.xml (${pad}).`);
    }
  } catch {
    fout("standaard", "sitemap.xml", "Ontbreekt.");
  }

  // 9. Elk oud adres landt: het SEO-manifest als contract
  if (opties.seoManifest) {
    for (const gegevens of normaliseerManifest(opties.seoManifest)) {
      let pad: string;
      try {
        pad = new URL(gegevens.pad).pathname;
      } catch {
        pad = gegevens.pad;
      }
      const omgeleid =
        redirects.has(pad) || redirects.has(pad.replace(/\/$/, "") + "/");
      if (!bestaatAlsPagina(pad) && !omgeleid) {
        fout("oud-adres", pad, "Bestond op de oude site, maar heeft hier geen pagina en geen 301.");
        continue;
      }
      if (bestaatAlsPagina(pad) && gegevens.title) {
        const rel = (pad.endsWith("/") ? pad + "index.html" : pad).replace(/^\//, "");
        try {
          const inhoud = await readFile(path.join(map, rel), "utf8");
          const titel = inhoud.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim();
          if (titel && titel !== gegevens.title.trim())
            waarschuw("oud-adres", rel, `Titel wijkt af van het manifest: "${titel}" i.p.v. "${gegevens.title.trim()}".`);
        } catch {
          /* pad met eigen bestandsnaam; titelvergelijking overslaan */
        }
      }
    }
  }

  // 10. Zware beelden (leerpunt: max ±250-300 kB zonder goede reden)
  try {
    for (const naam of await readdir(path.join(map, "afbeeldingen"))) {
      const info = await stat(path.join(map, "afbeeldingen", naam)).catch(() => null);
      if (info?.isFile() && info.size > 320_000)
        waarschuw("beeldgewicht", `afbeeldingen/${naam}`, `${Math.round(info.size / 1024)} kB — comprimeer of maak een kleinere variant.`);
    }
  } catch {
    /* geen afbeeldingen-map */
  }

  return uit;
}
