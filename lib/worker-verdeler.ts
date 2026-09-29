/**
 * De verdeler ("receptie") voor route B van de livegang: één Worker die
 * domeinen bedient waarvan de DNS NIET in ons Cloudflare-account staat
 * (de hoster wil de DNS houden). De hoster zet het websiteverkeer door naar
 * ons ontvangstadres; de verdeler kijkt naar de domeinnaam en serveert de
 * juiste site uit dezelfde R2-opslag.
 *
 * Bewust GEEN tweede leesscript: de verdeler is het vaste site-script
 * (lib/worker-r2.ts) met twee aanpassingen. Zo gedraagt een site zich via de
 * verdeler exact zoals via zijn eigen worker (redirects, headers, 404, www).
 *  1. het voorvoegsel komt niet uit een vaste binding maar uit de
 *     domeinkaart (intern/domeinen.json in R2): { "klant.nl": "klant-slug" }
 *     of, met www als hoofdadres: { "klant.nl": { slug, hoofd: "www" } }
 *  2. het geheugen voor redirects/headers is per site, niet één voor alles
 *
 * Bestaande sites (eigen worker, domein in ons account) komen hier nooit
 * langs. Een onbekend domein krijgt een 404 en nooit de site van een ander.
 */
import { R2_SCRIPT_VERSIE, R2_WORKER_SCRIPT } from "./worker-r2";

export const DOMEINKAART_SLEUTEL = "intern/domeinen.json";
export const VERDELER_NAAM = "ws-verdeler";
/** Eigen teller + die van het site-script: verandert een van beide, dan
 * wordt de verdeler opnieuw gepubliceerd. */
export const VERDELER_VERSIE = `3-r2v${R2_SCRIPT_VERSIE}`;

function vervang(bron: string, oud: string, nieuw: string, aantal: number): string {
  const gevonden = bron.split(oud).length - 1;
  if (gevonden !== aantal) {
    throw new Error(
      `Verdeler: verwachtte ${aantal}× "${oud}" in het site-script, vond ${gevonden}. Het site-script is veranderd; loop lib/worker-verdeler.ts na.`,
    );
  }
  return bron.split(oud).join(nieuw);
}

export function bouwVerdelerScript(): string {
  let s = R2_WORKER_SCRIPT;
  // geheugen per site
  s = vervang(s, "let regelsCache = null;", "const regelsCaches = {};", 1);
  s = vervang(s, "  if (regelsCache && nu - regelsCache.tijd < 30000) return regelsCache;", "  const bewaard = regelsCaches[env.PREFIX];\n  if (bewaard && nu - bewaard.tijd < 30000) return bewaard;", 1);
  s = vervang(s, "  regelsCache = { tijd: nu, redirects, headers };\n  return regelsCache;", "  regelsCaches[env.PREFIX] = { tijd: nu, redirects, headers };\n  return regelsCaches[env.PREFIX];", 1);
  if (s.includes("regelsCache ") || s.includes("regelsCache.") || s.includes("regelsCache;")) {
    throw new Error("Verdeler: er staat nog een gedeeld geheugen (regelsCache) in het script.");
  }
  // het site-script wordt een gewone functie; de verdeler roept hem aan
  s = vervang(s, "export default {", "const site = {", 1);
  return (
    s +
    [
      "let kaartCache = null;",
      "",
      "async function domeinKaart(env) {",
      "  const nu = Date.now();",
      "  if (kaartCache && nu - kaartCache.tijd < 60000) return kaartCache.kaart;",
      "  let kaart = {};",
      "  try {",
      `    const o = await env.SITES.get(${JSON.stringify(DOMEINKAART_SLEUTEL)});`,
      "    if (o) kaart = JSON.parse(await o.text());",
      "  } catch (e) {",
      "    // Kaart onleesbaar: liever de vorige stand dan alle sites plat",
      "    if (kaartCache) return kaartCache.kaart;",
      "  }",
      "  kaartCache = { tijd: nu, kaart };",
      "  return kaart;",
      "}",
      "",
      "export default {",
      "  async fetch(request, env) {",
      "    const host = new URL(request.url).hostname.toLowerCase();",
      '    const kaal = host.startsWith("www.") ? host.slice(4) : host;',
      "    const kaart = await domeinKaart(env);",
      "    const regel = Object.prototype.hasOwnProperty.call(kaart, kaal) ? kaart[kaal] : null;",
      '    const prefix = regel && typeof regel === "object" ? regel.slug : regel;',
      '    const hoofd = regel && typeof regel === "object" && regel.hoofd === "www" ? "www" : "kaal";',
      '    if (typeof prefix !== "string" || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(prefix) || prefix.startsWith("wv-") || prefix === "intern" || prefix === "media") {',
      '      return new Response("Dit domein is niet bij ons bekend.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "x-robots-tag": "noindex" } });',
      "    }",
      "    const antwoord = await site.fetch(request, { SITES: env.SITES, PREFIX: prefix, HOOFD: hoofd });",
      "    // Herkenningsteken: zo ziet de admin dat een adres echt via ons loopt",
      "    const kop = new Headers(antwoord.headers);",
      `    kop.set(${JSON.stringify("x-ws-verdeler")}, "1");`,
      "    return new Response(antwoord.body, { status: antwoord.status, statusText: antwoord.statusText, headers: kop });",
      "  },",
      "};",
      "",
    ].join("\n")
  );
}

/** Schone domeinnaam voor de kaart: kaal, kleine letters, zonder www. */
export function kaartDomein(ruw: string): string | null {
  const d = ruw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "").replace(/\.$/, "");
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d)) return null;
  if (/\.workers\.dev$/.test(d)) return null;
  return d;
}
