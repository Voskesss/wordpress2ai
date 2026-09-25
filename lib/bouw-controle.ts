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
import { laadDelen, vouwUit } from "./delen";
import { ZOEKINDEX_PAD, ZOEK_DEEL, vulIngebouwdeDelenAan } from "./zoeken";

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

import { vergelijkOnderdelen } from "./verlies";
import { VELDEN, leesSeo, padVan, vergelijkSeo, type SeoKenmerken } from "./seo-overname";
import {
  bedrijfsgegevens,
  dubbeleTeksten,
  koppenControle,
  verweesdePaginas,
  type PaginaGegevens,
} from "./seo-poort";

export function normaliseerManifest(ruw: SeoManifest): ManifestRegel[] {
  if (Array.isArray(ruw))
    return ruw
      .filter((r) => r && typeof r === "object")
      .map((r: Record<string, unknown>) => ({
        pad: String(r.pad ?? r.url ?? ""),
        title: typeof r.titel === "string" ? r.titel : typeof r.title === "string" ? r.title : undefined,
      }))
      .filter((r) => r.pad);
  if (ruw && typeof ruw === "object") {
    // Vorm van scripts/voorbereiden.mts: { bron, siteTitel, paginas: [...] }
    const paginas = (ruw as Record<string, unknown>).paginas;
    if (Array.isArray(paginas)) return normaliseerManifest(paginas as SeoManifest);
    return Object.entries(ruw as Record<string, Record<string, unknown>>).map(
      ([sleutel, w]) => ({
        pad: sleutel,
        title: typeof w?.title === "string" ? w.title : typeof w?.titel === "string" ? (w.titel as string) : undefined,
      }),
    );
  }
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
  opties: { seoManifest?: SeoManifest; bronMap?: string } = {},
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

  // delen/ zijn fragmenten en sjablonen/ zijn mallen met {{plaatshouders}}
  // (zie lib/actueel.ts): allebei geen pagina's die een bezoeker ooit opvraagt.
  const paginas = (await htmlBestanden(map)).filter((p) => {
    const rel = relatief(map, p);
    return !rel.startsWith("delen" + path.sep) && !rel.startsWith("sjablonen" + path.sep);
  });
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

  // delen/ vooraf inlezen: voor de markercontrole én om elke pagina te
  // beoordelen zoals de bezoeker hem krijgt (favicon, gedeelde formulieren,
  // menu- en footerlinks zitten in delen/, niet in de pagina zelf).
  const delen = vulIngebouwdeDelenAan(await laadDelen(map));
  const delenNamen = new Set(delen.keys());

  const indexeerbaar: string[] = [];
  // Voor de sitebrede SEO-regels (lib/seo-poort.ts): wat we per pagina toch
  // al lezen, verzamelen we hier op zodat het na de lus vergeleken kan worden.
  const seoPaginas: PaginaGegevens[] = [];
  const jsonLd: string[] = [];
  const telefoonnummers = new Set<string>();
  let heeftAdres = false;
  // Safari toont een svg-favicon vaak niet en valt dan terug op /favicon.ico.
  // Die twee lijsten worden ná de lus één keer gemeld, niet per pagina.
  const zonderIcoLink: string[] = [];
  const zonderAppleIcon: string[] = [];

  for (const bestand of paginas) {
    const rel = relatief(map, bestand);
    const bron = await readFile(bestand, "utf8");
    // markercontrole gebruikt de bron; alle andere checks de uitgevouwen pagina
    const inhoud = vouwUit(bron, delen);
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
    for (const m of bron.matchAll(/<!--invoeg:([\w-]+)-->/g))
      if (!delenNamen.has(m[1]))
        fout("markers", rel, `Marker invoeg:${m[1]} heeft geen delen/${m[1]}.html.`);

    // 2b. Zoeken loopt via de bouwsteen, niet via eigen maakwerk. De index is
    // een afgeleid bestand dat de deploy maakt uit de gepubliceerde pagina's;
    // schrijft een site zijn eigen zoekvak met een eigen index, dan loopt die
    // stilletjes achter zodra de klant via de chat iets wijzigt.
    const gebruiktZoekBouwsteen = bron.includes(`<!--invoeg:${ZOEK_DEEL}-->`);
    if (!gebruiktZoekBouwsteen) {
      if (bron.includes(ZOEKINDEX_PAD))
        fout(
          "zoeken",
          rel,
          `Eigen zoekcode verwijst naar ${ZOEKINDEX_PAD}. Gebruik <!--invoeg:${ZOEK_DEEL}--> zodat knop, gedrag en index bij elkaar blijven.`,
        );
      else if (/<form[^>]+role=["']search["']/i.test(bron))
        fout(
          "zoeken",
          rel,
          `Zoekformulier zonder werking: een statische site heeft geen WordPress-zoekpagina. Gebruik <!--invoeg:${ZOEK_DEEL}--> of haal het zoekvak weg.`,
        );
    }

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
      for (const img of inhoud.matchAll(/<img\b[^>]*>/gi)) {
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
    // Meelezen voor de sitebrede SEO-regels na deze lus.
    seoPaginas.push({
      pad: padVanBestand(rel),
      rel,
      titel,
      // Let op het aanhalingsteken: content="..." mag een apostrof bevatten, en
      // die zit in het Nederlands overal ("pagina's", "foto's"). Vangen op het
      // openingsteken, anders kapt de omschrijving af bij het eerste streepje
      // en lijken pagina's ten onrechte identiek.
      omschrijving: inhoud
        .match(/<meta[^>]+name=["']description["'][^>]*content=(["'])([\s\S]*?)\1/i)?.[2]
        ?.trim(),
      ogOmschrijving: inhoud
        .match(/<meta[^>]+property=["']og:description["'][^>]*content=(["'])([\s\S]*?)\1/i)?.[2]
        ?.trim(),
      koppen: (inhoud.match(/<h1\b/gi) ?? []).length,
      // Ook relatieve links, want lang niet elke site linkt absoluut.
      linktNaar: [...inhoud.matchAll(/href=["']([^"'#?:]+)["']/gi)]
        .map((m) => m[1])
        .filter((h) => !/^(mailto|tel|https?|javascript)/i.test(h)),
      noindex,
    });
    for (const m of inhoud.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi))
      jsonLd.push(m[1]);
    for (const m of inhoud.matchAll(/href=["']tel:([+0-9 ()-]{8,})["']/gi))
      telefoonnummers.add(m[1].trim());
    if (/\b\d{4}\s?[A-Z]{2}\b/.test(inhoud) || /"postalCode"|streetAddress/i.test(inhoud))
      heeftAdres = true;
    if (!titel) fout("seo", rel, "Geen <title>.");
    if (!noindex) {
      // Aanhalingsteken vangen en tot dezelfde soort lezen: anders faalt dit op
      // een omschrijving die mét een apostrof begint ("'s Ochtends open"), en
      // dat is een harde fout die dan onterecht afgaat.
      if (!/<meta[^>]+name=["']description["'][^>]*content=(["'])(?!\1)[\s\S]*?\1/i.test(inhoud))
        fout("seo", rel, "Geen meta description.");
      if (!/<link[^>]+rel=["']canonical["']/i.test(inhoud))
        waarschuw("seo", rel, "Geen canonical-link.");
      if (!/property=["']og:image["']/i.test(inhoud))
        waarschuw("seo", rel, "Geen og:image (deelplaatje).");
    }
    if (!/<link[^>]+rel=["'](?:shortcut )?icon["']/i.test(inhoud))
      fout("favicon", rel, "Geen favicon-link in de head.");
    else {
      if (!/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*\.ico["']/i.test(inhoud))
        zonderIcoLink.push(rel);
      if (!/<link[^>]+rel=["']apple-touch-icon["']/i.test(inhoud)) zonderAppleIcon.push(rel);
    }
    if (!/<meta[^>]+name=["']viewport["']/i.test(inhoud))
      fout("mobiel", rel, "Geen viewport-meta.");
    if (/VERVANG\.nl/.test(inhoud))
      waarschuw("livegang", rel, "Placeholder-domein VERVANG.nl — vóór domeinkoppeling vervangen.");
  }

  // 7. Standaardpagina's en -bestanden
  if (await bestandBestaat(ZOEKINDEX_PAD))
    waarschuw(
      "zoeken",
      ZOEKINDEX_PAD,
      "Staat in de repo maar wordt bij elke publicatie opnieuw gemaakt. Weghalen, anders lijkt het alsof je hem met de hand moet bijwerken.",
    );
  // Favicon: een svg alleen is niet genoeg. Safari negeert svg-iconen vaak en
  // zoekt /favicon.ico; staat die er niet, dan blijft het tabblad leeg.
  if (zonderIcoLink.length > 0)
    fout(
      "favicon",
      zonderIcoLink[0],
      `Alleen een svg-favicon (${zonderIcoLink.length} pagina's). Safari toont die meestal niet: zet er <link rel="icon" href="/favicon.ico" sizes="32x32"> bij.`,
    );
  if (zonderAppleIcon.length > 0)
    waarschuw(
      "favicon",
      zonderAppleIcon[0],
      `Geen apple-touch-icon (${zonderAppleIcon.length} pagina's). Wie de site op zijn iPhone-beginscherm zet, krijgt dan een grijs vlak.`,
    );
  if (!(await bestandBestaat("favicon.ico")))
    fout("favicon", "favicon.ico", "Ontbreekt. Safari valt hierop terug als het svg-icoon niet werkt.");
  if (!(await bestandBestaat("apple-touch-icon.png")))
    waarschuw("favicon", "apple-touch-icon.png", "Ontbreekt (180x180, zonder doorzichtige achtergrond).");
  if (await bestandBestaat("favicon.svg")) {
    const icoon = await readFile(path.join(map, "favicon.svg"), "utf8");
    if (/<text\b/i.test(icoon))
      fout(
        "favicon",
        "favicon.svg",
        "Letter staat er als tekst in. Een favicon wordt zonder het lettertype van de site getekend, dus die letter valt vaak weg. Maak er een vorm van of gebruik een afbeelding.",
      );
  }
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
      // Stond in Google, staat nu op niet-indexeren. Er gaat niets kapot en er
      // komt geen fout: de pagina verdwijnt binnen weken stil uit de resultaten.
      if (bestaatAlsPagina(pad)) {
        const genormaliseerd = pad.endsWith("/") || pad.includes(".") ? pad : `${pad}/`;
        const hier = seoPaginas.find((q) => q.pad === genormaliseerd || q.pad === pad);
        if (hier?.noindex)
          fout(
            "noindex-verlies",
            hier.rel,
            "Deze pagina stond in Google en staat nu op niet-indexeren. Haal de robots-noindex weg, of zet er een 301 naartoe als hij echt moet verdwijnen.",
          );
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

  // 11. Sitebrede SEO-regels: dubbele titels, hoofdkoppen, verweesde pagina's
  // en of een bedrijf zich als bedrijf voorstelt. Zie lib/seo-poort.ts.
  for (const b of [
    ...dubbeleTeksten(seoPaginas),
    ...koppenControle(seoPaginas),
    ...verweesdePaginas(seoPaginas),
    ...bedrijfsgegevens({
      heeftTelefoon: telefoonnummers.size > 0,
      heeftAdres,
      jsonLd,
      telefoonnummers: [...telefoonnummers],
    }),
  ])
    (b.hard ? fout : waarschuw)(b.regel, b.waar, b.detail);

  // 12. Wat had de vorige versie dat deze niet meer heeft? Alleen mogelijk als we
  // de bron erbij krijgen. Dit vangt het stilste soort fout: er ontstaat geen
  // fout, er is gewoon iets minder. Zo verdween de zoekfunctie van
  // evc-professionals zonder dat iemand het merkte. Zie lib/verlies.ts.
  if (opties.bronMap) {
    const oudeHtml: string[] = [];
    for (const bestand of await htmlBestanden(opties.bronMap)) {
      oudeHtml.push(await readFile(bestand, "utf8").catch(() => ""));
    }
    const nieuweHtml: string[] = [];
    for (const bestand of await htmlBestanden(map)) {
      nieuweHtml.push(await readFile(bestand, "utf8").catch(() => ""));
    }
    for (const v of vergelijkOnderdelen(oudeHtml, nieuweHtml)) {
      const vind = v.oudAantal === 1 ? "1 vindplaats" : `${v.oudAantal} vindplaatsen`;
      waarschuw(
        "verdwenen",
        "hele site",
        `De vorige versie had een ${v.naam} (${vind}), deze niet: ${v.advies}.`,
      );
    }

    // 13. Wat vertelde de oude pagina aan Google en aan deelknoppen, en doet
    // de nieuwe dat nog? De oude pagina is de opdracht, niet een manifest.
    // Zie lib/seo-overname.ts.
    for (const [pad, oud] of await oudeSeoPaginas(opties.bronMap)) {
      if (oud.noindex) continue;
      if (redirects.has(pad) || redirects.has(pad.replace(/\/$/, "") + "/")) continue;
      const rel = (pad.endsWith("/") ? pad + "index.html" : pad).replace(/^\//, "");
      const bron = await readFile(path.join(map, rel), "utf8").catch(() => null);
      if (bron === null) continue; // ontbrekend adres meldt regel 9 al
      const nieuw = leesSeo(vouwUit(bron, delen));
      if (nieuw.noindex) continue; // noindex-verlies meldt regel 9 al
      for (const v of vergelijkSeo(oud, nieuw)) {
        if (v.soort === "weg")
          fout("seo-overname", rel, `De oude pagina had een ${VELDEN[v.veld]} ("${kort(v.oud)}"), deze niet.`);
        else
          waarschuw(
            "seo-overname",
            rel,
            `${VELDEN[v.veld]} wijkt af van de oude pagina: "${kort(v.nieuw ?? "")}" i.p.v. "${kort(v.oud)}". Bewust? Dan prima.`,
          );
      }
    }
  }

  return uit;
}

const kort = (s: string) => (s.length > 90 ? s.slice(0, 87) + "..." : s);

/**
 * De oude pagina's per pad. Bij voorkeur de vastlegging van
 * scripts/seo-vergelijk.mts (seo-baseline.json in de bron-map): die kent ook
 * de X-Robots-Tag-header en doorverwijzingen. Anders de bewaarde HTML in
 * oud-ontwerp/, waarbij de canonical vertelt op welk adres de pagina stond
 * (de bestandsnamen daar zijn slugs, geen paden).
 */
async function oudeSeoPaginas(bronMap: string): Promise<Map<string, SeoKenmerken>> {
  const uit = new Map<string, SeoKenmerken>();
  try {
    const basis = JSON.parse(await readFile(path.join(bronMap, "seo-baseline.json"), "utf8")) as {
      entries?: {
        path: string;
        status: number;
        finalPath: string;
        title: string;
        description: string;
        canonical: string;
        robots: string;
        xRobots: string;
        structured: string[];
        metadata: Record<string, string>;
      }[];
    };
    for (const e of basis.entries ?? []) {
      // Alleen pagina's die zelf antwoordden; een doorverwijzing is geen pagina
      if (e.status !== 200 || e.finalPath !== e.path) continue;
      const html =
        `<title>${esc(e.title)}</title>` +
        Object.entries(e.metadata ?? {})
          .map(([n, c]) => `<meta ${n.includes(":") ? "property" : "name"}="${esc(n)}" content="${esc(c)}">`)
          .join("") +
        (e.canonical ? `<link rel="canonical" href="${esc(e.canonical)}">` : "") +
        (e.structured ?? []).map((j) => `<script type="application/ld+json">${j}</script>`).join("");
      const k = leesSeo(html);
      k.noindex ||= /noindex/i.test(`${e.robots} ${e.xRobots}`);
      uit.set(e.path, k);
    }
    if (uit.size) return uit;
  } catch {
    /* geen vastlegging: terugvallen op oud-ontwerp/ */
  }
  const oudMap = path.join(bronMap, "oud-ontwerp");
  for (const bestand of await htmlBestanden(oudMap).catch(() => [] as string[])) {
    const k = leesSeo(await readFile(bestand, "utf8").catch(() => ""));
    const pad = padVan(k.canonical);
    if (pad && !uit.has(pad)) uit.set(pad, k);
  }
  return uit;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
