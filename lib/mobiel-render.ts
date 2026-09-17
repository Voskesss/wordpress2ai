/**
 * Visuele mobielcontrole: de gewijzigde pagina's van de werkversie écht laten
 * renderen op telefoonbreedte (390 px) via Cloudflare Browser Rendering, en
 * meten of de pagina breder wordt dan het scherm. Aanvulling op
 * lib/mobiel-check.ts, dat alleen riskante inline-styles in de HTML herkent.
 *
 * Snelheid: één verzoek voor alle pagina's. De eerste pagina laadt de andere
 * in onzichtbare frames van 390 px (zelfde domein, dus meetbaar) en meet alles
 * tegelijk. Dat past ook binnen de limiet van het huidige Cloudflare-plan
 * (±1 verzoek per 10 s voor het hele account). Is de dienst bezet, traag of
 * stuk, dan wordt de controle overgeslagen: de wijziging gaat altijd door.
 */

export const MOBIEL_BREEDTE = 390;
const MAX_PAGINAS = 4;

export type Boosdoener = { tag: string; klasse: string; html: string; ouder: string };
export type PaginaMeting = { pad: string; breedte: number; boosdoeners: Boosdoener[] };

/** Welke pagina's gecontroleerd worden, als URL-paden. Gewijzigde HTML eerst;
 * alleen css/js/delen gewijzigd raakt alle pagina's, dan in elk geval de home. */
export function paginasOmTeMeten(gewijzigd: string[]): string[] {
  const paden: string[] = [];
  for (const b of gewijzigd) {
    if (!/\.html?$/i.test(b) || b.startsWith("delen/") || b.includes("wp2ai-controle/")) continue;
    const url =
      b === "index.html" ? "/" : b.endsWith("/index.html") ? `/${b.slice(0, -"index.html".length)}` : `/${b}`;
    if (!paden.includes(url)) paden.push(url);
  }
  const raaktAlles = gewijzigd.some((b) => /\.(css|js)$/i.test(b) || b.startsWith("delen/"));
  if (raaktAlles && !paden.includes("/")) paden.unshift("/");
  return paden.slice(0, MAX_PAGINAS);
}

/** Het meetscript dat in de eerste pagina draait. Schrijft het resultaat als
 * JSON in <script id="wp2ai-mobiel"> en zet daarna data-wp2ai-klaar. */
export function meetScript(overigePaden: string[]): string {
  return `(function(){
var B=${MOBIEL_BREEDTE};
function snip(el,n){return el?String(el.outerHTML||'').replace(/\\s+/g,' ').slice(0,n):''}
function meet(doc,win,pad){
  var sw=doc.documentElement.scrollWidth,uit=[];
  if(sw>B+1&&doc.body){
    var els=doc.body.querySelectorAll('*');
    for(var i=0;i<els.length&&uit.length<5;i++){
      var el=els[i],r=el.getBoundingClientRect();
      if(!r.width||r.right<=B+1)continue;
      if(win.getComputedStyle(el).position==='fixed')continue;
      var p=el.parentElement,geknipt=false;
      while(p&&p!==doc.body){var ox=win.getComputedStyle(p).overflowX;if(ox!=='visible'&&p.getBoundingClientRect().right<=B+1){geknipt=true;break}p=p.parentElement}
      if(geknipt)continue;
      var ouder=el.parentElement;
      if(ouder&&ouder!==doc.body&&ouder.getBoundingClientRect().right>B+1)continue;
      uit.push({tag:el.tagName.toLowerCase(),klasse:String(el.getAttribute('class')||'').slice(0,80),html:snip(el,160),ouder:snip(ouder,100)});
    }
  }
  return {pad:pad,breedte:sw,boosdoeners:uit};
}
function klaar(res){var s=document.createElement('script');s.type='application/json';s.id='wp2ai-mobiel';s.textContent=JSON.stringify(res).replace(/</g,'\\\\u003c');document.body.appendChild(s);document.documentElement.setAttribute('data-wp2ai-klaar','1')}
function start(){
  var res=[meet(document,window,location.pathname)],paden=${JSON.stringify(overigePaden)},open=paden.length;
  if(!open)return klaar(res);
  paden.forEach(function(pad){
    var f=document.createElement('iframe'),af=false;
    f.style.cssText='position:absolute;left:0;top:0;width:'+B+'px;height:844px;border:0;visibility:hidden';
    function einde(){if(af)return;af=true;try{res.push(meet(f.contentDocument,f.contentWindow,pad))}catch(e){}if(--open===0)klaar(res)}
    f.onload=function(){setTimeout(einde,150)};setTimeout(einde,5000);
    f.src=pad;document.body.appendChild(f);
  });
}
if(document.readyState==='complete')setTimeout(start,100);else addEventListener('load',function(){setTimeout(start,100)});
})();`;
}

/** Leest het meetresultaat uit de gerenderde HTML. */
export function leesMeting(html: string): PaginaMeting[] | null {
  const m = html.match(/<script type="application\/json" id="wp2ai-mobiel">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    const data = JSON.parse(m[1]) as PaginaMeting[];
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

/** Alleen de pagina's die echt te breed zijn (1 px speling voor afronding). */
export function teBredePaginas(metingen: PaginaMeting[]): PaginaMeting[] {
  return metingen.filter((p) => p.breedte > MOBIEL_BREEDTE + 1);
}

/** Opdrachttekst voor de AI met per pagina wat er uitsteekt. */
export function beschrijfProblemen(teBreed: PaginaMeting[]): string {
  return teBreed
    .map((p) => {
      const regels = p.boosdoeners.map(
        (b) => `  - <${b.tag}${b.klasse ? ` class="${b.klasse}"` : ""}>: ${b.html}${b.ouder ? `\n    (binnen: ${b.ouder})` : ""}`,
      );
      return `- Pagina ${p.pad} is ${p.breedte}px breed op een telefoon van ${MOBIEL_BREEDTE}px.${
        regels.length ? ` Dit steekt uit:\n${regels.join("\n")}` : ""
      }`;
    })
    .join("\n");
}

/** Rendert de pagina's op telefoonbreedte en geeft de metingen terug, of null
 * als de controle niet kon (limiet, time-out, storing). */
export async function meetMobieleWeergave(
  basisUrl: string,
  paden: string[],
  opts: { timeoutMs?: number } = {},
): Promise<PaginaMeting[] | null> {
  if (!paden.length || !process.env.CLOUDFLARE_API_TOKEN) return null;
  const { ACCOUNT } = await import("./cloudflare");
  const basis = basisUrl.replace(/\/+$/, "");
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/browser-rendering/content`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: `${basis}${paden[0]}?wp2ai-mobiel=${Date.now()}`,
        viewport: { width: MOBIEL_BREEDTE, height: 844 },
        gotoOptions: { waitUntil: "load", timeout: 8000 },
        addScriptTag: [{ content: meetScript(paden.slice(1)) }],
        waitForSelector: { selector: "html[data-wp2ai-klaar]", timeout: 7000 },
        rejectResourceTypes: ["media"],
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 12_000),
    });
    if (!res.ok) {
      console.log(`Mobiele weergave niet gemeten (${res.status})`);
      return null;
    }
    const data = (await res.json()) as { success?: boolean; result?: string };
    return data.success && typeof data.result === "string" ? leesMeting(data.result) : null;
  } catch (e) {
    console.log("Mobiele weergave niet gemeten:", e instanceof Error ? e.message : e);
    return null;
  }
}
