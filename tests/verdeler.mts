/**
 * De verdeler (route B van de livegang, besloten 29-09 n.a.v. Websmid): één
 * ingang voor domeinen waarvan de hoster de DNS houdt. Deze test DRAAIT het
 * script echt, met een nagebootste opslag, en bewaakt wat nooit mis mag gaan:
 * een bezoeker krijgt de site van zijn eigen domein en nooit die van een
 * ander, ook niet via het geheugen voor redirects.
 */
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { DOMEINKAART_SLEUTEL, bouwVerdelerScript, kaartDomein } from "../lib/worker-verdeler";
import { R2_WORKER_SCRIPT } from "../lib/worker-r2";

// Workers hebben HTMLRewriter ingebouwd; Node niet. Een kleine nabootsing die
// alleen 'append op body' kent, genoeg om het feestje te controleren.
class NepRewriter {
  handlers: [string, { element(el: { append(html: string, o?: unknown): void; after(html: string, o?: unknown): void }): void }][] = [];
  on(sel: string, h: { element(el: { append(html: string, o?: unknown): void; after(html: string, o?: unknown): void }): void }) { this.handlers.push([sel, h]); return this; }
  transform(r: Response) {
    return (async () => {
      let tekst = await r.text();
      for (const [sel, h] of this.handlers) {
        let extra = "";
        const el = { append: (html: string) => { extra += html; }, after: (html: string) => { extra += html; } };
        if (sel === "body") { h.element(el); tekst = /<\/body>/i.test(tekst) ? tekst.replace(/<\/body>/i, extra + "</body>") : tekst + extra; }
        else if (sel.startsWith("form[")) {
          // elk formulier dat naar /api/formulier wijst krijgt een element-aanroep; 'after' plakt achter dat formulier
          tekst = tekst.replace(/<form\b[^>]*action="[^"]*\/api\/formulier[^"]*"[^>]*>[\s\S]*?<\/form>/gi, (m) => { extra = ""; h.element(el); return m + extra; });
        }
      }
      return new Response(tekst, { status: r.status, headers: r.headers });
    })();
  }
}
(globalThis as unknown as { HTMLRewriter: unknown }).HTMLRewriter = NepRewriter;

const map = await mkdtemp(join(tmpdir(), "verdeler-"));
const pad = join(map, "verdeler.mjs");
await writeFile(pad, bouwVerdelerScript());
const verdeler = (await import(pathToFileURL(pad).href)).default as { fetch(r: Request, env: unknown): Promise<Response> };

const opslag = new Map<string, string>([
  [DOMEINKAART_SLEUTEL, JSON.stringify({ "alfa.nl": "alfa", "beta.nl": "beta", "fout.nl": "wv-alfa", "stiekem.nl": "intern", "gamma.nl": { slug: "beta", hoofd: "www" }, "scheef.nl": { slug: "wv-alfa", hoofd: "www" } })],
  ["alfa/index.html", "<h1>ALFA</h1>"],
  ["alfa/contact/index.html", '<h1>ALFA contact</h1><form action="https://wordswap.nl/api/formulier" method="post"><button>Verstuur</button></form><form action="https://wordswap.nl/api/formulier" method="post"><button>Nog een</button></form>'],
  ["alfa/_redirects", "/oud /contact/ 301\n"],
  ["alfa/_headers", "/*\n  X-Test: alfa\n"],
  ["beta/index.html", "<h1>BETA</h1>"],
  ["beta/404.html", "<h1>BETA niet gevonden</h1>"],
  ["wv-alfa/index.html", "<h1>CONCEPT ALFA</h1>"],
  ["intern/gezondheid.json", "{}"],
]);
let gelezen: string[] = [];
const voorwerp = (k: string) => {
  const inhoud = opslag.get(k);
  if (inhoud === undefined) return null;
  return { body: new Response(inhoud).body, size: inhoud.length, httpEtag: '"x"', text: async () => inhoud };
};
const env = { SITES: { get: async (k: string) => (gelezen.push(k), voorwerp(k)), head: async (k: string) => (opslag.has(k) ? {} : null) } };
const haal = async (url: string) => verdeler.fetch(new Request(url, { redirect: "manual" }), env);

// 1. Elk domein krijgt zijn eigen site
assert.equal(await (await haal("https://alfa.nl/")).text(), "<h1>ALFA</h1>");
assert.equal(await (await haal("https://beta.nl/")).text(), "<h1>BETA</h1>");
assert.ok((await (await haal("https://alfa.nl/contact/")).text()).startsWith("<h1>ALFA contact</h1>"));

// 2. Redirects en headers van de ene site lekken niet naar de andere
//    (het site-script had één gedeeld geheugen; via de verdeler is dat per site)
const door = await haal("https://alfa.nl/oud");
assert.equal(door.status, 301);
assert.equal(door.headers.get("location"), "https://alfa.nl/contact/");
const betaOud = await haal("https://beta.nl/oud");
assert.equal(betaOud.status, 404, "beta volgt een redirect van alfa: het geheugen is gedeeld");
assert.equal(await betaOud.text(), "<h1>BETA niet gevonden</h1>");
assert.equal((await haal("https://alfa.nl/")).headers.get("x-test"), "alfa");
assert.equal((await haal("https://beta.nl/")).headers.get("x-test"), null, "beta krijgt een header van alfa");

// 3. www gaat naar het kale domein van DEZELFDE site
const www = await haal("https://www.beta.nl/pad?x=1");
assert.equal(www.status, 301);
assert.equal(www.headers.get("location"), "https://beta.nl/pad?x=1");

// 3b. Nooit een pagina zonder slotje: http gaat naar https, en samen met
//     www in ÉÉN doorverwijzing (gevonden 29-09 op aimia.nl en roelart.nl:
//     het onbeveiligde adres toonde gewoon de site)
const onveilig = await haal("http://alfa.nl/contact/?a=1");
assert.equal(onveilig.status, 301, "het onbeveiligde adres toont de site in plaats van door te sturen");
assert.equal(onveilig.headers.get("location"), "https://alfa.nl/contact/?a=1");
const beide = await haal("http://www.alfa.nl/");
assert.equal(beide.headers.get("location"), "https://alfa.nl/", "http en www kosten twee doorverwijzingen in plaats van één");
assert.equal((await haal("https://alfa.nl/contact/")).status, 200, "het beveiligde adres wordt ook doorgestuurd: eindeloze lus");

// 3c. Hoofdadres met www (site stond zo in Google): de site toont zich op
//     www en het kale adres stuurt door. De andere sites merken daar niets van.
assert.equal(await (await haal("https://www.gamma.nl/")).text(), "<h1>BETA</h1>", "het www-hoofdadres toont de site niet");
const naarWww = await haal("https://gamma.nl/pad?x=1");
assert.equal(naarWww.status, 301);
assert.equal(naarWww.headers.get("location"), "https://www.gamma.nl/pad?x=1");
assert.equal((await haal("http://gamma.nl/")).headers.get("location"), "https://www.gamma.nl/", "http en hoofdadres kosten twee doorverwijzingen");
assert.equal((await haal("http://www.gamma.nl/")).headers.get("location"), "https://www.gamma.nl/");
assert.equal((await haal("https://www.alfa.nl/")).headers.get("location"), "https://alfa.nl/", "een gewone site stuurt www niet meer door naar kaal");
assert.equal((await haal("https://scheef.nl/")).status, 404, "een concept (wv-) is via een kaartregel met hoofdadres bereikbaar");

// 3d. Herkenningsteken op elk antwoord van een bekende site, ook op een
//     doorverwijzing: daaraan ziet de admin of de hoster al heeft omgezet
assert.equal((await haal("https://alfa.nl/")).headers.get("x-ws-verdeler"), "1");
assert.equal((await haal("http://alfa.nl/")).headers.get("x-ws-verdeler"), "1", "de doorverwijzing mist het herkenningsteken: vóór het certificaat is er dan niets te zien");
assert.equal((await haal("http://alfa.nl/")).status, 301, "het herkenningsteken heeft de doorverwijzing stukgemaakt");
assert.equal((await haal("https://alfa.nl/bestaat-niet")).status, 404);

// 3e. Feestje uit de livemail: alleen met het toevoegsel, alleen op een gewone
//     pagina, en het toevoegsel wordt in de browser weer weggehaald
const feest = await haal("https://alfa.nl/?wordswap-feest=1");
const feestTekst = await feest.text();
assert.equal(feest.status, 200);
assert.ok(feestTekst.includes("Gefeliciteerd, je website staat live") && feestTekst.includes("Dit feestje ziet alleen jij"), "het feestje ontbreekt bij het toevoegsel");
assert.ok(feestTekst.includes("bij via de WordSwap-chat"), "de wenk over bijwerken via de chat ontbreekt");
assert.ok(!feestTekst.includes("border-radius:999px") && feestTekst.includes("left:12px;right:12px"), "de balk is weer een pil die op een telefoon een ei wordt");
assert.ok(/t<6500\)requestAnimationFrame/.test(feestTekst), "de confetti duurt geen zes seconden meer");
assert.ok(feestTekst.includes('u.searchParams.delete("wordswap-feest")') && feestTekst.includes("history.replaceState"), "het toevoegsel blijft in de adresbalk hangen");
assert.ok(feestTekst.startsWith("<h1>ALFA</h1>"), "de pagina zelf is aangetast");
// Het script moet geldige JavaScript zijn: een verdwaald aanhalingsteken en de
// browser doet niets (gebeurde 30-09 op vandenbergmediation.nl)
const scriptTekst = feestTekst.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "";
assert.ok(scriptTekst.length > 500, "het feest-script ontbreekt");
assert.doesNotThrow(() => new Function(scriptTekst), "het feest-script is geen geldige JavaScript");
assert.equal(feest.headers.get("content-length"), null, "content-length staat nog op de oude lengte: browsers knippen de pagina dan af");
assert.ok(!(await (await haal("https://alfa.nl/")).text()).includes("Gefeliciteerd"), "gewone bezoekers zien het feestje");
assert.ok(!(await (await haal("https://beta.nl/bestaat-niet?wordswap-feest=1")).text()).includes("Gefeliciteerd"), "het feestje staat op een 404-pagina");
assert.ok(!(await (await haal("https://alfa.nl/_headers?wordswap-feest=1")).text()).includes("Gefeliciteerd"), "het feestje wordt in een niet-HTML-bestand gezet");

// 4. Onbekend domein: 404, en er wordt niets uit de opslag van een site gelezen
gelezen = [];
const vreemd = await haal("https://vreemd.nl/");
assert.equal(vreemd.status, 404);
assert.equal(vreemd.headers.get("x-robots-tag"), "noindex");
assert.ok(gelezen.every((k) => k === DOMEINKAART_SLEUTEL), "bij een onbekend domein is er toch site-inhoud gelezen: " + gelezen.join(","));

// 5. Een kaart die naar een concept (wv-) of naar interne opslag wijst wordt geweigerd
assert.equal((await haal("https://fout.nl/")).status, 404, "een concept (wv-) is via een domein bereikbaar");
assert.equal((await haal("https://stiekem.nl/gezondheid.json")).status, 404, "interne opslag is via een domein bereikbaar");
// en een domeinnaam die toevallig een eigenschap van elk object is
assert.equal((await haal("https://constructor/")).status, 404);

// 6. Geen tweede leesscript: de verdeler is het site-script, en schreeuwt als dat verandert
const script = bouwVerdelerScript();
assert.ok(script.includes('pad.startsWith("/audio/")') && script.includes("const site = {"), "de verdeler gebruikt het vaste site-script niet");
assert.ok(!/\bregelsCache\b/.test(script), "er staat nog een gedeeld geheugen in de verdeler");
assert.ok(R2_WORKER_SCRIPT.includes("let regelsCache = null;"), "het site-script is veranderd: loop de verdeler na");

// 7. Domeinnamen voor de kaart
assert.equal(kaartDomein("https://www.Voorbeeld.NL/pad"), "voorbeeld.nl");
assert.equal(kaartDomein("klant.wordswap.workers.dev"), null, "een workers.dev-adres hoort niet in de kaart");
assert.equal(kaartDomein("geen domein"), null);
assert.equal(kaartDomein("../intern"), null);

console.log("verdeler: ok");


// Formulier-terugkoppeling: het script komt één keer achter het (eerste)
// formulier naar /api/formulier, en niet op pagina's zonder zo'n formulier.
const metForm = await (await haal("https://alfa.nl/contact/")).text();
assert.equal(metForm.split('<script>(function(){var A="/api/formulier"').length - 1, 1, "het formulierscript hoort precies één keer op de pagina");
assert.ok(/<\/form><script>/.test(metForm) && metForm.includes('data-ws-bezig') && metForm.includes('"pageshow"'), "het formulierscript mist de dubbele-klik-rem of het herstel bij terug");
const zonderForm = await (await haal("https://alfa.nl/")).text();
assert.ok(!zonderForm.includes("Bezig met versturen"), "een pagina zonder formulier krijgt het script niet");
console.log("✓ formulierknop toont 'bezig' via het site-script");
