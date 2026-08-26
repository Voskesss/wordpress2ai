import { XMLParser } from "fast-xml-parser";

export type WxrItem = {
  titel: string;
  type: string; // page | post | attachment | nav_menu_item | ...
  status: string; // publish | draft | ...
  pad: string; // URL-pad, bv. /over-ons/
  slug: string;
  content: string;
  excerpt: string;
  attachmentUrl?: string;
  tags: { naam: string; slug: string }[];
  categorieen: { naam: string; slug: string }[];
};

export type WxrResultaat = {
  siteTitel: string;
  siteUrl: string;
  paginas: WxrItem[];
  berichten: WxrItem[];
  media: WxrItem[];
  overig: Record<string, number>; // aantallen per overgeslagen type
};

function alsArray<T>(x: T | T[] | undefined): T[] {
  if (x === undefined) return [];
  return Array.isArray(x) ? x : [x];
}

function tekst(x: unknown): string {
  if (x === null || x === undefined) return "";
  if (Array.isArray(x)) return x.map(tekst).join("");
  if (typeof x === "object" && "#text" in (x as object)) {
    return tekst((x as { "#text": unknown })["#text"]);
  }
  return String(x);
}

// WordPress-exports bevatten vaak dubbel-gecodeerde entiteiten (&#124;, &amp; etc.)
function ontEntiteer(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export function parseWxr(xml: string): WxrResultaat {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    cdataPropName: "#text",
    processEntities: true,
  });
  const doc = parser.parse(xml);
  const channel = doc?.rss?.channel;
  if (!channel) {
    throw new Error(
      "Dit lijkt geen WordPress-exportbestand (WXR) te zijn — geen rss/channel gevonden."
    );
  }

  const siteUrl = tekst(channel.link).replace(/\/$/, "");
  const resultaat: WxrResultaat = {
    siteTitel: ontEntiteer(tekst(channel.title)),
    siteUrl,
    paginas: [],
    berichten: [],
    media: [],
    overig: {},
  };

  for (const item of alsArray(channel.item)) {
    const type = tekst(item["wp:post_type"]);
    const status = tekst(item["wp:status"]);
    const link = tekst(item.link);
    let pad = "/";
    try {
      pad = link ? new URL(link).pathname : "/";
    } catch {
      pad = "/";
    }
    // Tags en categorieën (WXR: <category domain="post_tag|category" nicename="...">)
    const tags: { naam: string; slug: string }[] = [];
    const categorieen: { naam: string; slug: string }[] = [];
    for (const c of alsArray(item.category as unknown)) {
      const obj = c as { "@_domain"?: string; "@_nicename"?: string } | string;
      const naam = ontEntiteer(tekst(c));
      if (!naam) continue;
      const domein = typeof obj === "object" ? obj["@_domain"] : undefined;
      const slug =
        (typeof obj === "object" && obj["@_nicename"]) ||
        naam.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      if (domein === "post_tag") tags.push({ naam, slug });
      else if (domein === "category") categorieen.push({ naam, slug });
    }
    const wxrItem: WxrItem = {
      titel: ontEntiteer(tekst(item.title)) || "(zonder titel)",
      type,
      status,
      pad,
      slug: tekst(item["wp:post_name"]),
      content: tekst(item["content:encoded"]),
      excerpt: tekst(item["excerpt:encoded"]),
      attachmentUrl: tekst(item["wp:attachment_url"]) || undefined,
      tags,
      categorieen,
    };

    if (type === "page") resultaat.paginas.push(wxrItem);
    else if (type === "post") resultaat.berichten.push(wxrItem);
    else if (type === "attachment") resultaat.media.push(wxrItem);
    else resultaat.overig[type] = (resultaat.overig[type] ?? 0) + 1;
  }

  return resultaat;
}

/** Bouwt het seo-manifest: per pagina wat behouden moet blijven. */
export function maakSeoManifest(wxr: WxrResultaat) {
  const items = [...wxr.paginas, ...wxr.berichten]
    .filter((p) => p.status === "publish")
    .map((p) => ({
      pad: p.pad,
      titel: p.titel,
      type: p.type,
      slug: p.slug,
    }));
  return {
    bron: wxr.siteUrl,
    siteTitel: wxr.siteTitel,
    aangemaakt: new Date().toISOString(),
    paginas: items,
    mediaUrls: wxr.media
      .map((m) => m.attachmentUrl)
      .filter((u): u is string => Boolean(u)),
  };
}
