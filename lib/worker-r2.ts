/**
 * Het vaste Worker-script dat een klantsite uit R2 serveert. Voor élke site
 * identiek; alleen de bindings verschillen (SITES = de bucket, HOOFD = www of
 * kaal, PREFIX = het
 * voorvoegsel van deze site). Het script verandert dus niet bij een wijziging
 * van de site — daarom is een wijziging direct overal zichtbaar.
 *
 * Wat het overneemt van de vroegere Cloudflare-assets-instellingen:
 *  - /pad → /pad/ (307) als pad/index.html bestaat, en /pad/ → index.html
 *  - /pad → pad.html als dat bestaat
 *  - 404.html met status 404
 *  - _redirects (301's; houdt oude adressen en Google-posities intact)
 *  - _headers (beveiligingsheaders uit de site zelf)
 *  - noindex op workers.dev-adressen, doorsturen naar het hoofdadres (301):
 *    standaard www → kaal, met binding HOOFD=www juist kaal → www
 *  - http → https (301); samen met www in één doorverwijzing
 *  - confetti, alleen met ?wordswap-feest in het adres (knop uit de livemail)
 *  - verzendknop van formulieren toont "Bezig met versturen" en blokkeert een
 *    dubbele klik (de mail via een eigen server duurt soms seconden)
 *  - ETag/If-None-Match (304), Range-verzoeken (video seeken), mime-types
 *
 * Verhoog R2_SCRIPT_VERSIE bij elke wijziging aan dit script: de deploy
 * publiceert het script dan opnieuw voor elke site die aan de beurt is.
 */
export const R2_SCRIPT_VERSIE = "14";

/** Het toevoegsel in de link uit de livemail. Alleen wie via die knop
 * binnenkomt ziet het feestje; gewone bezoekers en Google nooit. */
export const FEEST_PARAM = "wordswap-feest";

/** Confetti plus een balkje, ruim zes seconden, daarna weg. Haalt het toevoegsel
 * meteen uit de adresbalk zodat het niet blijft hangen of gedeeld wordt. */
/** Formulieren posten naar wordswap.nl/api/formulier; die verstuurt eerst de
 * mail (via een eigen mailserver soms seconden) en stuurt dan pas door naar
 * de bedanktpagina. Zonder terugkoppeling klikt een bezoeker nog eens of
 * denkt dat het stuk is. Dit script zet de knop op "Bezig met versturen" en
 * houdt een tweede verzending tegen; bij terug-knop (bfcache) herstelt hij. */
/** Tekst op de knop per taal van de pagina (html lang, of lang op het
 * formulier zelf). Onbekende taal: Engels. Een site kan het overschrijven met
 * data-bezig="..." op het formulier. */
export const FORM_BEZIG_TEKSTEN: Record<string, string> = {
  nl: "Bezig met versturen\u2026",
  en: "Sending\u2026",
  de: "Wird gesendet\u2026",
  fr: "Envoi en cours\u2026",
  es: "Enviando\u2026",
  it: "Invio in corso\u2026",
  pt: "A enviar\u2026",
  pl: "Wysy\u0142anie\u2026",
  tr: "G\u00f6nderiliyor\u2026",
};
export const FORM_BEZIG_TEKST = FORM_BEZIG_TEKSTEN.nl;
const FORM_HTML = `<script>(function(){var A="/api/formulier";var T=${JSON.stringify(FORM_BEZIG_TEKSTEN)};function knop(f){return f.querySelector('button[type=submit],input[type=submit],button:not([type])')}function tekst(f){var e=f.getAttribute("data-bezig");if(e)return e;var n=f;while(n&&n.getAttribute&&!n.getAttribute("lang"))n=n.parentNode;var l=(n&&n.getAttribute?n.getAttribute("lang"):"")||document.documentElement.lang||"en";l=l.toLowerCase().split(/[-_]/)[0];return T[l]||T.en}document.addEventListener("submit",function(e){var f=e.target;if(!f||!f.getAttribute||String(f.getAttribute("action")||"").indexOf(A)<0)return;if(f.getAttribute("data-ws-bezig")){e.preventDefault();return}f.setAttribute("data-ws-bezig","1");var k=knop(f);if(!k)return;k.setAttribute("aria-busy","true");k.classList.add("bezig");k.style.opacity=".65";k.style.pointerEvents="none";var t=tekst(f);if(k.tagName==="INPUT"){k.setAttribute("data-ws-tekst",k.value);k.value=t}else{k.setAttribute("data-ws-tekst",k.textContent);k.textContent=t}},true);addEventListener("pageshow",function(e){if(!e.persisted)return;var fs=document.querySelectorAll("form[data-ws-bezig]");for(var i=0;i<fs.length;i++){var f=fs[i];f.removeAttribute("data-ws-bezig");var k=knop(f);if(!k)continue;k.removeAttribute("aria-busy");k.classList.remove("bezig");k.style.opacity="";k.style.pointerEvents="";var t=k.getAttribute("data-ws-tekst");if(t!==null){if(k.tagName==="INPUT")k.value=t;else k.textContent=t}}})})();</script>`;
const FEEST_HTML = `<script>(function(){try{var u=new URL(location.href);if(!u.searchParams.has(${JSON.stringify(FEEST_PARAM)}))return;u.searchParams.delete(${JSON.stringify(FEEST_PARAM)});history.replaceState(null,"",u.pathname+u.search+u.hash);var c=document.createElement("canvas");c.setAttribute("aria-hidden","true");c.style.cssText="position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483647";document.body.appendChild(c);var x=c.getContext("2d");var W=c.width=innerWidth,H=c.height=innerHeight;var kl=["#31956B","#F5B84B","#E8604C","#4A90E2","#9B59B6","#ffffff"];var p=[];for(var i=0;i<260;i++)p.push({x:Math.random()*W,y:-20-Math.random()*H*1.4,r:4+Math.random()*6,k:kl[i%kl.length],vy:2+Math.random()*3,vx:-1+Math.random()*2,a:Math.random()*6.28,va:-0.1+Math.random()*0.2});var b=document.createElement("div");b.setAttribute("role","status");b.innerHTML="\uD83C\uDF89 Gefeliciteerd, je website staat live!<span style='display:block;margin-top:6px;font-weight:400;font-size:14px;line-height:1.45;opacity:.9'>Dit feestje ziet alleen jij, via de knop in de mail. Je bezoekers zien gewoon je website.</span><span style='display:block;margin-top:4px;font-weight:400;font-size:14px;line-height:1.45;opacity:.9'>Vanaf nu werk je je website bij via de WordSwap-chat in je portaal.</span>";b.style.cssText="position:fixed;left:12px;right:12px;top:12px;margin:0 auto;max-width:460px;box-sizing:border-box;background:#16302b;color:#fff;padding:14px 18px;border-radius:16px;font:600 17px/1.35 system-ui,sans-serif;z-index:2147483647;box-shadow:0 10px 30px rgba(0,0,0,.25);text-align:left";document.body.appendChild(b);var t0=Date.now();function f(){var t=Date.now()-t0;x.clearRect(0,0,W,H);for(var j=0;j<p.length;j++){var q=p[j];q.y+=q.vy;q.x+=q.vx;q.a+=q.va;x.save();x.translate(q.x,q.y);x.rotate(q.a);x.fillStyle=q.k;x.fillRect(-q.r/2,-q.r/2,q.r,q.r*0.6);x.restore()}if(t<6500)requestAnimationFrame(f);else c.remove()}f();setTimeout(function(){b.remove()},10000)}catch(e){}})();</script>`;

export const R2_WORKER_SCRIPT = [
  'const HTML = "text/html; charset=utf-8";',
  "const MIME = {",
  '  html: HTML, htm: HTML, css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8",',
  '  mjs: "text/javascript; charset=utf-8", json: "application/json; charset=utf-8", xml: "application/xml; charset=utf-8",',
  '  txt: "text/plain; charset=utf-8", md: "text/markdown; charset=utf-8", svg: "image/svg+xml", png: "image/png",',
  '  jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", ico: "image/x-icon", avif: "image/avif",',
  '  woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf", mp4: "video/mp4", webm: "video/webm",',
  '  mp3: "audio/mpeg", ogg: "audio/ogg", wav: "audio/wav", pdf: "application/pdf", zip: "application/zip",',
  '  wasm: "application/wasm", webmanifest: "application/manifest+json", vtt: "text/vtt; charset=utf-8",',
  "};",
  "const FEEST = " + JSON.stringify(FEEST_HTML) + ";",
  "const FORM = " + JSON.stringify(FORM_HTML) + ";",
  "const FEEST_PARAM = " + JSON.stringify(FEEST_PARAM) + ";",
  "let regelsCache = null;",
  "",
  "function mimeVoor(pad) {",
  '  const ext = (pad.split(".").pop() || "").toLowerCase();',
  '  return MIME[ext] || "application/octet-stream";',
  "}",
  "",
  "function patroon(p) {",
  '  const esc = p.replace(/[.+?^${}()|[\\]\\\\]/g, "\\\\$&").replace(/\\*/g, ".*").replace(/:[A-Za-z0-9_]+/g, "[^/]+");',
  '  return new RegExp("^" + esc + "$");',
  "}",
  "",
  "async function laadRegels(env) {",
  "  const nu = Date.now();",
  "  if (regelsCache && nu - regelsCache.tijd < 30000) return regelsCache;",
  '  const [r, h] = await Promise.all([env.SITES.get(env.PREFIX + "/_redirects"), env.SITES.get(env.PREFIX + "/_headers")]);',
  "  const redirects = {};",
  "  if (r) {",
  '    for (const regel of (await r.text()).split("\\n")) {',
  "      const schoon = regel.trim();",
  '      if (!schoon || schoon.startsWith("#")) continue;',
  "      const [van, naar, code] = schoon.split(/\\s+/);",
  '      if (!van || !naar || van.includes("*") || van.includes(":")) continue;',
  '      redirects[van.replace(/\\/+$/, "") || "/"] = { naar, code: Number(code) || 301 };',
  "    }",
  "  }",
  "  const headers = [];",
  "  if (h) {",
  "    let huidig = null;",
  '    for (const regel of (await h.text()).split("\\n")) {',
  '      if (!regel.trim() || regel.trim().startsWith("#")) continue;',
  "      if (!/^\\s/.test(regel)) { huidig = { test: patroon(regel.trim()), kop: [] }; headers.push(huidig); continue; }",
  '      const i = regel.indexOf(":");',
  "      if (huidig && i > 0) huidig.kop.push([regel.slice(0, i).trim(), regel.slice(i + 1).trim()]);",
  "    }",
  "  }",
  "  regelsCache = { tijd: nu, redirects, headers };",
  "  return regelsCache;",
  "}",
  "",
  "async function haal(env, key, request, voorwaardelijk) {",
  "  try {",
  "    return await env.SITES.get(key, voorwaardelijk ? { onlyIf: request.headers, range: request.headers } : undefined);",
  "  } catch (e) {",
  "    return null;",
  "  }",
  "}",
  "",
  "export default {",
  "  async fetch(request, env) {",
  "    const url = new URL(request.url);",
  "    // http → https en naar het hoofdadres, samen in één doorverwijzing",
  "    // (één canoniek adres voor Google, en nooit een pagina zonder slotje).",
  "    // Hoofdadres is standaard zonder www; met HOOFD=www juist mét. Een",
  "    // tijdelijk workers.dev-adres krijgt nooit www.",
  '    const onveilig = url.protocol === "http:";',
  '    const metWww = url.hostname.startsWith("www.");',
  '    const wilWww = env.HOOFD === "www" && !url.hostname.endsWith(".workers.dev");',
  "    const verkeerd = wilWww ? !metWww : metWww;",
  "    if (onveilig || verkeerd) {",
  '      if (onveilig) url.protocol = "https:";',
  '      if (verkeerd) url.hostname = wilWww ? "www." + url.hostname : url.hostname.slice(4);',
  "      return Response.redirect(url.toString(), 301);",
  "    }",
  '    if (request.method !== "GET" && request.method !== "HEAD") {',
  '      return new Response("Methode niet toegestaan", { status: 405, headers: { allow: "GET, HEAD" } });',
  "    }",
  "    // Feestje uit de livemail: alleen met het toevoegsel, alleen op een gewone pagina",
  "    const feest = url.searchParams.has(FEEST_PARAM);",
  "    let pad;",
  "    try { pad = decodeURIComponent(url.pathname); } catch (e) { pad = url.pathname; }",
  '    if (pad.includes("..") || /(^|\\/)\\.[^/]*$/.test(pad)) {',
  '      return new Response("Pagina niet gevonden", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });',
  "    }",
  "    const regels = await laadRegels(env);",
  '    const doel = regels.redirects[pad.replace(/\\/+$/, "") || "/"];',
  "    if (doel) return Response.redirect(new URL(doel.naar, url.origin).toString(), doel.code);",
  "",
  '    const prefix = env.PREFIX + "/";',
  "    const rel = pad.slice(1);",
  '    const laatste = pad.split("/").pop();',
  "    let key;",
  "    // Audiobank: /audio/* komt uit de gedeelde media-map van de site",
  "    // (media/<slug>/audio/...), niet uit de deploy-sync. Live en werkversie",
  "    // (wv-) lezen dezelfde map, dus een aflevering staat meteen in het",
  "    // voorbeeld. Het pad audio/ is daarmee gereserveerd voor de audiobank.",
  '    if (pad.startsWith("/audio/") && laatste.includes("."))',
  '      key = "media/" + env.PREFIX.replace(/^wv-/, "") + "/" + rel;',
  '    else if (pad.endsWith("/")) key = prefix + rel + "index.html";',
  '    else if (laatste.includes(".")) key = prefix + rel;',
  "    else {",
  '      if (await env.SITES.head(prefix + rel + "/index.html")) {',
  '        url.pathname = pad + "/";',
  "        return Response.redirect(url.toString(), 307);",
  "      }",
  '      key = prefix + rel + ".html";',
  "    }",
  "    let status = 200;",
  "    let obj = await haal(env, key, request, true);",
  "    // Video's van nieuwe uploads staan in de gedeelde media-map, niet in de",
  "    // site zelf (anders zou elke chatbeurt ze opnieuw ophalen). Oudere",
  "    // video's staan nog wél in de site: daarom eerst daar kijken, dan hier.",
  '    if (!obj && pad.startsWith("/video/")) {',
  '      obj = await haal(env, "media/" + env.PREFIX.replace(/^wv-/, "") + "/" + rel, request, true);',
  '      if (obj) key = "media/" + env.PREFIX.replace(/^wv-/, "") + "/" + rel;',
  "    }",
  "    if (!obj) {",
  "      status = 404;",
  '      key = prefix + "404.html";',
  "      obj = await haal(env, key, request, false);",
  '      if (!obj) return new Response("Pagina niet gevonden", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });',
  "    }",
  "",
  "    const kop = new Headers();",
  '    kop.set("content-type", mimeVoor(key));',
  '    kop.set("etag", obj.httpEtag);',
  '    kop.set("accept-ranges", "bytes");',
  "    // Alles wat via het portaal kan veranderen (pagina's, css, js, beelden) altijd",
  "    // laten controleren: een 304 is goedkoop en de klant ziet nooit een oude versie.",
  "    // Alleen video en lettertypen (groot, veranderen zelden) mag de browser bewaren.",
  '    const bewaarbaar = /\\.(mp4|webm|mp3|ogg|wav|woff2?|ttf|otf)$/i.test(key) && status === 200;',
  '    kop.set("cache-control", bewaarbaar ? "public, max-age=3600, must-revalidate" : "no-cache");',
  "    for (const h of regels.headers) if (h.test.test(pad)) for (const [n, w] of h.kop) kop.set(n, w);",
  '    if (url.hostname.endsWith(".workers.dev")) kop.set("x-robots-tag", "noindex, nofollow");',
  "",
  "    // Voorwaarde niet gehaald (If-None-Match): R2 geeft dan het object zonder body terug",
  '    if (status === 200 && obj.body === undefined) {',
  "      return new Response(null, { status: 304, headers: kop });",
  "    }",
  '    if (status === 200 && obj.range && request.headers.has("range")) {',
  '      const start = "offset" in obj.range ? obj.range.offset : 0;',
  '      const lengte = "length" in obj.range ? obj.range.length : obj.size - start;',
  '      if ("suffix" in obj.range) {',
  "        const s = obj.size - obj.range.suffix;",
  '        kop.set("content-range", "bytes " + s + "-" + (obj.size - 1) + "/" + obj.size);',
  "      } else {",
  '        kop.set("content-range", "bytes " + start + "-" + (start + lengte - 1) + "/" + obj.size);',
  "      }",
  '      kop.set("content-length", String("suffix" in obj.range ? obj.range.suffix : lengte));',
  '      return new Response(request.method === "HEAD" ? null : obj.body, { status: 206, headers: kop });',
  "    }",
  '    if (status === 200 && request.method === "GET" && mimeVoor(key) === HTML && typeof HTMLRewriter !== "undefined") {',
  '      kop.delete("content-length");',
  "      const antwoord = new Response(obj.body, { status, headers: kop });",
  "      // Het formulierscript alleen op pagina's met zo'n formulier, en één keer",
  "      let formGedaan = false;",
  "      const rw = new HTMLRewriter().on('form[action*=\"/api/formulier\"]', { element(el) { if (formGedaan) return; formGedaan = true; el.after(FORM, { html: true }); } });",
  '      if (feest) rw.on("body", { element(el) { el.append(FEEST, { html: true }); } });',
  "      return rw.transform(antwoord);",
  "    }",
  '    kop.set("content-length", String(obj.size));',
  '    return new Response(request.method === "HEAD" ? null : obj.body, { status, headers: kop });',
  "  },",
  "};",
  "",
].join("\n");
