/**
 * Zoeken op een klantsite, als bouwsteen.
 *
 * Waarom dit bestaat: een zoekindex is een afgeleid bestand. Wordt hij bij de
 * bouw gemaakt, dan loopt hij achter zodra de klant via de portaalchat iets
 * verandert: nieuwe woorden zijn niet vindbaar en een verwijderde pagina blijft
 * in de resultaten staan (en dus een 404 voor de bezoeker). Daarom maakt de
 * deploy hem, uit de pagina's die op dat moment gepubliceerd worden.
 *
 * Dat kan ook alleen daar. `bereidBestandenVoor` in lib/cloudflare.ts is het
 * moment waarop `vouwUit()` de delen-markers vervangt; pas daarna is een pagina
 * compleet. Zou de index eerder gemaakt worden, dan miste hij alles wat in
 * gedeelde blokken staat.
 *
 * Een site zet het zoekvak neer met één marker:
 *
 *     <!--invoeg:zoeken-->
 *
 * Knop, uitklapvlak, opmaak en gedrag komen hier vandaan. Wil een site een
 * eigen variant, dan wint een eigen `delen/zoeken.html` uit de klantrepo.
 */

/** Naam van het ingebouwde deel; pagina's gebruiken <!--invoeg:zoeken-->. */
export const ZOEK_DEEL = "zoeken";

/** Pad van de index binnen de site. */
export const ZOEKINDEX_PAD = "zoekindex.json";

/**
 * Hoeveel tekst de hele index maximaal mag bevatten. Een bezoeker haalt dit
 * bestand op zijn telefoon op zodra hij het zoekvak opent, dus het mag niet
 * meegroeien met een archief van honderden pagina's.
 */
export const ZOEKINDEX_BUDGET = 260_000;

/** Tekst per pagina: ruim bij een kleine site, krapper naarmate het er meer worden. */
const TEKST_MAX = 1800;
const TEKST_MIN = 260;

export type ZoekPagina = { pad: string; titel: string; tekst: string };

/**
 * Vult de ingebouwde delen aan. Een gelijknamig bestand in de klantrepo wint,
 * zodat een site altijd een eigen variant kan neerzetten.
 * Zowel de deploy als de bouw-controle roept dit aan, zodat beide dezelfde
 * pagina beoordelen als de bezoeker krijgt.
 */
export function vulIngebouwdeDelenAan(delen: Map<string, string>): Map<string, string> {
  if (!delen.has(ZOEK_DEEL)) delen.set(ZOEK_DEEL, zoekFragment());
  return delen;
}

const ONTDOE_BLOKKEN =
  /<(script|style|noscript|header|footer|nav|aside|form|template)\b[\s\S]*?<\/\1>/gi;

const ENTITEITEN: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#039;": "'",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&ldquo;": '"',
  "&rdquo;": '"',
  "&ndash;": "-",
  "&mdash;": "-",
  "&hellip;": "…",
  "&eacute;": "é",
  "&euml;": "ë",
  "&uuml;": "ü",
  "&oacute;": "ó",
};

/**
 * Zelfde als naarTekst, maar elk element blijft een eigen regel. Nodig om te
 * kunnen zien welke stukjes op elke pagina terugkomen: na het platslaan tot
 * één regel plakt de kopbalk aan de paginatitel vast en lijkt hij uniek.
 */
function naarRegels(html: string): string[] {
  let t = html.replace(ONTDOE_BLOKKEN, "\n").replace(/<!--[\s\S]*?-->/g, "\n");
  t = t.replace(/<[^>]+>/g, "\n");
  for (const [entiteit, teken] of Object.entries(ENTITEITEN)) t = t.split(entiteit).join(teken);
  return t
    .replace(/&[a-z]+;/gi, " ")
    .split("\n")
    .map((r) => r.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function naarTekst(html: string): string {
  let t = html.replace(ONTDOE_BLOKKEN, " ").replace(/<!--[\s\S]*?-->/g, " ");
  t = t.replace(/<[^>]+>/g, " ");
  for (const [entiteit, teken] of Object.entries(ENTITEITEN)) t = t.split(entiteit).join(teken);
  return t.replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
}

/** Is deze pagina bewust uit Google gehouden? Dan hoort hij ook niet in het zoekvak. */
export function isNoindex(html: string): boolean {
  return /<meta[^>]+name=["']robots["'][^>]*noindex/i.test(html);
}

/** /over-ons/index.html -> /over-ons/ ; 404.html -> /404.html */
export function padVanBestand(bestandspad: string): string {
  const p = "/" + bestandspad.replace(/\\/g, "/").replace(/^\.?\//, "");
  return p.endsWith("/index.html") ? p.slice(0, -"index.html".length) : p;
}

function titelVan(html: string): string {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  if (h1) {
    const t = naarTekst(h1);
    if (t) return t;
  }
  const titel = html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "";
  return naarTekst(titel);
}

function inhoudVan(html: string): string {
  // Heeft de site een <main>, dan is dat precies de eigen inhoud van de pagina.
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  // Zonder <main> valt de hele pagina erin, inclusief <head>. De titel staat al
  // apart in de index, dus die hoeft niet nog eens in de tekst.
  const romp = main ?? html.replace(/<head\b[\s\S]*?<\/head>/i, " ");
  return naarRegels(romp).join("\n");
}

/** Hoeveel pagina's een zin moet delen voordat hij als omlijsting geldt. */
const OMLIJSTING_AANDEEL = 0.8;
/** Onder dit aantal pagina's is "staat overal" geen betrouwbaar signaal. */
const OMLIJSTING_MINIMUM = 5;

/**
 * Haalt menu, kopbalk en voettekst uit de tekst, ook als de site geen <main>
 * heeft en de omlijsting in gewone divs zit (zoals bij evcprofessionals).
 *
 * De truc: tekst die op bijna élke pagina staat ís de omlijsting. Dat hoeven we
 * dus niet aan tagnamen te herkennen, we kunnen het meten. Zonder dit begint
 * elk zoekresultaat met "Inloggen | 📞 +31 6..." en matcht elke zoekopdracht
 * op elke pagina.
 */
export function zonderOmlijsting(teksten: string[]): string[] {
  if (teksten.length < OMLIJSTING_MINIMUM) return teksten;
  const grens = Math.ceil(teksten.length * OMLIJSTING_AANDEEL);
  const telling = new Map<string, number>();
  const stukken = teksten.map((t) => deelOp(t));
  for (const lijst of stukken) {
    for (const zin of new Set(lijst)) telling.set(zin, (telling.get(zin) ?? 0) + 1);
  }
  return stukken.map((lijst) =>
    lijst
      .filter((zin) => (telling.get(zin) ?? 0) < grens)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

/** Per element knippen: dat is de eenheid die zich herhaalt. Per woord tellen
 * zou gewone woorden wegstrepen, per hele pagina zou niets ooit matchen. */
function deelOp(tekst: string): string[] {
  return tekst.split("\n").map((s) => s.trim()).filter(Boolean);
}

/**
 * Bouwt de index uit de pagina's zoals ze gepubliceerd worden.
 * `bestanden` bevat alle publiceerbare bestanden; alleen HTML telt mee.
 */
export function bouwZoekindex(
  bestanden: { pad: string; data: Buffer | string }[]
): { index: ZoekPagina[]; json: string } {
  const paginas: { pad: string; titel: string; volledig: string }[] = [];
  for (const b of bestanden) {
    if (!/\.html?$/i.test(b.pad) || b.pad.startsWith("delen/")) continue;
    const html = typeof b.data === "string" ? b.data : b.data.toString("utf8");
    if (isNoindex(html)) continue;
    const titel = titelVan(html);
    if (!titel) continue;
    paginas.push({ pad: padVanBestand(b.pad), titel, volledig: inhoudVan(html) });
  }
  paginas.sort((a, b) => (a.pad === "/" ? -1 : b.pad === "/" ? 1 : a.pad.localeCompare(b.pad)));

  // Budget eerlijk verdelen: veel pagina's betekent minder tekst per pagina,
  // zodat het bestand op een telefoon klein blijft.
  // Omlijsting eruit vóór het afkappen, anders vult het menu het budget.
  const schoon = zonderOmlijsting(paginas.map((p) => p.volledig));
  paginas.forEach((p, i) => (p.volledig = schoon[i] || p.volledig));

  const perPagina = paginas.length
    ? Math.max(TEKST_MIN, Math.min(TEKST_MAX, Math.floor(ZOEKINDEX_BUDGET / paginas.length)))
    : TEKST_MAX;

  const index: ZoekPagina[] = paginas.map((p) => ({
    pad: p.pad,
    titel: p.titel,
    tekst: p.volledig.slice(0, perPagina),
  }));
  return { index, json: JSON.stringify(index) };
}

/** Het zoekvak: knop, uitklapvlak, opmaak en gedrag in één fragment. */
export function zoekFragment(): string {
  return `<div class="ws-zoek">
  <button class="ws-zoek-knop" type="button" aria-expanded="false" aria-controls="ws-zoekvlak" aria-label="Zoeken op deze website">
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l5 5 1.5-1.5-5-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"/></svg>
  </button>
  <div class="ws-zoekvlak" id="ws-zoekvlak" hidden>
    <label class="ws-zoek-verborgen" for="ws-zoekveld">Zoek op deze website</label>
    <input type="search" id="ws-zoekveld" placeholder="Waar ben je naar op zoek?" autocomplete="off">
    <ul class="ws-zoekuitslag" id="ws-zoekuitslag" aria-live="polite"></ul>
  </div>
</div>
<style>
.ws-zoek { position: relative; display: inline-flex; align-items: center; }
.ws-zoek-knop { background: none; border: 0; padding: 10px; cursor: pointer; color: inherit; min-width: 44px; min-height: 44px; }
.ws-zoek-knop svg { width: 20px; height: 20px; fill: currentColor; display: block; }
.ws-zoek-knop:hover { color: var(--ws-zoek-accent, currentColor); }
.ws-zoekvlak { position: absolute; top: calc(100% + 8px); right: 0; z-index: 90; width: min(420px, calc(100vw - 32px)); background: #fff; color: #333; border-radius: 6px; box-shadow: 0 10px 30px rgba(0,0,0,.18); padding: 14px; }
.ws-zoekvlak input { width: 100%; box-sizing: border-box; padding: 11px 14px; font: inherit; font-size: 16px; border: 1px solid rgba(0,0,0,.18); border-radius: 3px; min-height: 46px; background: #fff; color: inherit; }
.ws-zoekuitslag { list-style: none; margin: 10px 0 0; padding: 0; max-height: 60vh; overflow-y: auto; }
.ws-zoekuitslag li + li { border-top: 1px solid rgba(0,0,0,.08); }
.ws-zoekuitslag a { display: block; padding: 10px 2px; color: inherit; text-decoration: none; }
.ws-zoekuitslag a:hover, .ws-zoekuitslag a:focus { color: var(--ws-zoek-accent, inherit); }
.ws-zoekuitslag strong { display: block; font-size: 15px; line-height: 22px; }
.ws-zoekuitslag span { display: block; font-size: 13px; line-height: 20px; opacity: .75; }
.ws-zoekuitslag .ws-zoek-niets { padding: 10px 2px; font-size: 14px; opacity: .8; }
.ws-zoek-verborgen { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
@media (max-width: 600px) { .ws-zoekvlak { position: fixed; left: 16px; right: 16px; width: auto; top: auto; } }
</style>
<script>
(function () {
  var knop = document.querySelector('.ws-zoek-knop');
  var vlak = document.getElementById('ws-zoekvlak');
  var veld = document.getElementById('ws-zoekveld');
  var lijst = document.getElementById('ws-zoekuitslag');
  if (!knop || !vlak || !veld || !lijst) return;
  var index = null;
  var bezig = false;
  function melding(tekst) {
    lijst.innerHTML = '';
    var li = document.createElement('li');
    li.className = 'ws-zoek-niets';
    li.textContent = tekst;
    lijst.appendChild(li);
  }
  function haal() {
    if (index || bezig) return;
    bezig = true;
    fetch('/${ZOEKINDEX_PAD}')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (d) { index = Array.isArray(d) ? d : []; zoek(); })
      .catch(function () { index = []; melding('Zoeken lukt nu even niet. Probeer het zo nog eens.'); });
  }
  function sluit() {
    vlak.hidden = true;
    knop.setAttribute('aria-expanded', 'false');
  }
  knop.addEventListener('click', function () {
    var open = vlak.hidden;
    vlak.hidden = !open;
    knop.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { veld.focus(); haal(); }
  });
  function zoek() {
    var vraag = veld.value.trim().toLowerCase();
    lijst.innerHTML = '';
    if (vraag.length < 2) return;
    // Nog aan het ophalen: niet zwijgen, anders lijkt het alsof er niets gebeurt.
    if (!index) { melding('Even zoeken...'); return; }
    var woorden = vraag.split(/\\s+/);
    var treffers = [];
    for (var i = 0; i < index.length; i++) {
      var p = index[i];
      var titel = (p.titel || '').toLowerCase();
      var hooi = titel + ' ' + (p.tekst || '').toLowerCase();
      var score = 0;
      var alle = true;
      for (var w = 0; w < woorden.length; w++) {
        var raak = hooi.indexOf(woorden[w]) >= 0;
        if (!raak) { alle = false; continue; }
        if (titel.indexOf(woorden[w]) >= 0) { score += 5; continue; }
        // Hoe vaker een woord op een pagina staat, hoe waarschijnlijker dat de
        // pagina er echt over gaat. Begrensd, anders wint een lange pagina altijd.
        var aantal = 0, vanaf = 0, pos;
        while (aantal < 3 && (pos = hooi.indexOf(woorden[w], vanaf)) >= 0) { aantal++; vanaf = pos + 1; }
        score += aantal;
      }
      // Tag- en rubriekpagina's zijn verzamelingen van andere pagina's: ze
      // matchen op alles wat eronder valt en zouden de echte pagina anders
      // wegdrukken. Wel vindbaar, maar lager.
      if (/^\\/(tag|category|categorie|auteur|author)\\//.test(p.pad || '')) score *= 0.4;
      if (alle && score > 0) treffers.push({ p: p, score: score });
    }
    treffers.sort(function (a, b) { return b.score - a.score; });
    if (!treffers.length) {
      var leeg = document.createElement('li');
      leeg.className = 'ws-zoek-niets';
      leeg.textContent = 'Niets gevonden. Probeer een ander woord.';
      lijst.appendChild(leeg);
      return;
    }
    treffers.slice(0, 8).forEach(function (t) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = t.p.pad;
      var st = document.createElement('strong');
      st.textContent = t.p.titel;
      var sp = document.createElement('span');
      var tekst = (t.p.tekst || '').slice(0, 150);
      sp.textContent = tekst ? tekst + '\\u2026' : '';
      a.appendChild(st);
      if (tekst) a.appendChild(sp);
      li.appendChild(a);
      lijst.appendChild(li);
    });
  }
  veld.addEventListener('input', zoek);
  // Enter is wat mensen vanzelf doen in een zoekveld. Zonder dit gebeurt er
  // niets en denk je dat het zoeken stuk is.
  veld.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    var eerste = lijst.querySelector('a');
    if (eerste) { window.location.href = eerste.getAttribute('href'); return; }
    if (!index) { haal(); melding('Even zoeken...'); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !vlak.hidden) { sluit(); knop.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (!vlak.hidden && !vlak.contains(e.target) && !knop.contains(e.target)) sluit();
  });
})();
</script>`;
}
