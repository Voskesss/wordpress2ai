/**
 * Onderdelen-inventaris van een live site: welke vaste bouwstenen staan er op elke pagina
 * (topbalk, deelknoppen, naar-boven-knop, sliders, uitgelichte berichten, kruimelpad, ...)?
 * Vangnet tegen "vergeten" elementen: alles wat hier gevonden wordt moet in de kopie terugkomen
 * of bewust worden weggelaten (met reden in de oplevering).
 *   npx tsx scripts/onderdelen-inventaris.mts <repo> <url> [url ...]
 * Resultaat: ~/wordswap-klanten/<repo>-bron/onderdelen-inventaris.json + .md
 */
import { chromium, type Page } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

const [repo, ...urls] = process.argv.slice(2);
if (!repo || !urls.length) { console.error('Gebruik: onderdelen-inventaris.mts <repo> <url> [url ...]'); process.exit(1); }

type Vondst = { onderdeel: string; desktop: boolean; mobiel: boolean; detail: string };

const PATRONEN: { onderdeel: string; selectors: string[] }[] = [
  { onderdeel: 'Topbalk boven het menu', selectors: ['.top-bar', '#top-bar', '.topbar', '[class*="top-bar"]:not(.pswp__top-bar)', '[class*="topbar"]', '.header-top', '[class*="header-top"]', '.elementor-location-header [class*="top"]'] },
  { onderdeel: 'Deelknoppen (social share)', selectors: ['a[href*="facebook.com/sharer"]', 'a[href*="twitter.com/share"]', 'a[href*="twitter.com/intent"]', 'a[href*="x.com/intent"]', 'a[href*="linkedin.com/share"]', 'a[href*="pinterest.com/pin"]', 'a[href^="whatsapp:"]', 'a[href*="wa.me/?text"]', '[class*="share-buttons"]', '[class*="sharedaddy"]', '[class*="addtoany"]'] },
  { onderdeel: 'Social-profielen (iconen naar eigen pagina)', selectors: ['a[href*="facebook.com/"]:not([href*="sharer"])', 'a[href*="instagram.com/"]', 'a[href*="linkedin.com/company"]', 'a[href*="linkedin.com/in/"]', 'a[href*="youtube.com/"]', 'a[href*="tiktok.com/"]'] },
  { onderdeel: 'Naar-boven-knop', selectors: ['.scroll-top', '#scroll-top', '[class*="back-to-top"]', '[id*="back-to-top"]', '[class*="scroll-to-top"]', '[class*="go-top"]', '[class*="totop"]'] },
  { onderdeel: 'Kruimelpad', selectors: ['[class*="breadcrumb"]', 'nav[aria-label*="breadcrumb" i]', '.yoast-breadcrumbs', '.rank-math-breadcrumb'] },
  { onderdeel: 'Vorige/volgende-navigatie', selectors: ['.post-navigation', '.nav-links', '[class*="project-navigation"]', '[class*="post-nav"]', 'a[rel="prev"]', 'a[rel="next"]'] },
  { onderdeel: 'Slider/carrousel', selectors: ['.owl-carousel', '.slick-slider', '.swiper', '.swiper-container', '[class*="carousel"]', 'sr7-module', 'rs-module', '.flexslider', '[class*="elementor-slides"]'] },
  { onderdeel: 'Uitgelichte/geselecteerde berichten of projecten (shortcode/widget)', selectors: ['[class*="portfolio-shortcode"]', '[class*="blog-shortcode"]', '[class*="recent-posts"]', '.elementor-posts', '[class*="wp-block-latest-posts"]', '[class*="related-posts"]', '[class*="post-grid"]', '[class*="dt-portfolio"]', '[class*="et_pb_blog"]', '[class*="et_pb_portfolio"]'] },
  { onderdeel: 'Hover-effect op tegels (tekst over beeld)', selectors: ['[class*="rollover"]', '[class*="description-on-hover"]', '[class*="hover-grid"]', '[class*="overlay-on-hover"]', '[class*="hover-effect"]'] },
  { onderdeel: 'Filterknoppen (categorieën boven een grid)', selectors: ['[class*="filter-categories"]', '[class*="portfolio-filter"]', '[class*="isotope-filter"]', '[data-filter]'] },
  { onderdeel: 'Zoekfunctie', selectors: ['input[type="search"]', 'form[role="search"]', '[class*="search-form"]'] },
  { onderdeel: 'Taalkeuze', selectors: ['[class*="wpml"]', '[class*="lang-switch"]', '[class*="language-switcher"]', '[class*="trp-language"]', '.gtranslate_wrapper'] },
  { onderdeel: 'Cookiebanner', selectors: ['[id*="cookie"]', '[class*="cookie-notice"]', '[class*="cmplz"]', '#CybotCookiebotDialog', '[class*="cookie-law"]'] },
  { onderdeel: 'Chat/WhatsApp-knop of pop-up', selectors: ['[class*="whatsapp"]', '[id*="tawk"]', '[class*="crisp"]', '[class*="intercom"]', '[class*="popup"]', '[class*="modal"]:not(.pswp)'] },
  { onderdeel: 'Formulier', selectors: ['form:not([role="search"])'] },
  { onderdeel: 'Video/kaart-embed', selectors: ['iframe[src*="youtube"]', 'iframe[src*="vimeo"]', 'iframe[src*="google.com/maps"]', 'video'] },
  { onderdeel: 'Accordeon/tabs', selectors: ['details', '[class*="accordion"]', '[class*="toggle"]:not([class*="menu"])', '[role="tablist"]'] },
  { onderdeel: 'Teller/cijfers-animatie', selectors: ['[class*="counter"]', '[class*="count-up"]', '[class*="number-counter"]'] },
  { onderdeel: 'Reviews/testimonials', selectors: ['[class*="testimonial"]', '[class*="review"]'] },
  { onderdeel: 'Logo-rij partners/klanten', selectors: ['[class*="logo-carousel"]', '[class*="clients"]', '[class*="partners"]', '[class*="brand"]'] },
];

async function scan(page: Page) {
  // tsx/esbuild zet __name()-aanroepen in functies die naar de browser gaan; daar bestaat die helper niet.
  await page.evaluate('window.__name = (f) => f');
  return page.evaluate((patronen) => {
    const zichtbaar = (e: Element) => {
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
    };
    const uit: Record<string, string> = {};
    for (const p of patronen) {
      for (const s of p.selectors) {
        let els: Element[] = [];
        try { els = [...document.querySelectorAll(s)]; } catch { continue; }
        const e = els.find(zichtbaar) || els[0];
        if (!e) continue;
        const tekst = ((e as HTMLElement).innerText || e.getAttribute('aria-label') || e.getAttribute('href') || '').replace(/\s+/g, ' ').trim().slice(0, 90);
        uit[p.onderdeel] = `${zichtbaar(e) ? '' : '(verborgen) '}${s} → ${tekst}`;
        break;
      }
    }
    // Sticky/fixed kop en horizontaal scrollende rijen (swipe op mobiel)
    const kop = document.querySelector('header, #header, .masthead, .site-header');
    if (kop && ['fixed', 'sticky'].includes(getComputedStyle(kop).position)) uit['Vaste (sticky) kopbalk'] = getComputedStyle(kop).position;
    const rij = [...document.querySelectorAll('body *')].find((e) => {
      const cs = getComputedStyle(e);
      return (cs.overflowX === 'auto' || cs.overflowX === 'scroll' || e.classList.contains('owl-stage-outer')) && e.scrollWidth > e.clientWidth + 40 && e.clientHeight > 80;
    });
    if (rij) uit['Swipe-rij (horizontaal scrollbaar)'] = String(rij.className).slice(0, 80);
    return uit;
  }, PATRONEN);
}

const browser = await chromium.launch();
const resultaat: Record<string, Vondst[]> = {};
for (const url of urls) {
  const perVp: Record<string, Record<string, string>> = {};
  for (const [naam, breedte] of [['desktop', 1440], ['mobiel', 375]] as const) {
    const page = await browser.newPage({ viewport: { width: breedte, height: 900 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); } window.scrollTo(0, 0); });
    await page.waitForTimeout(800);
    perVp[naam] = await scan(page);
    await page.close();
  }
  const namen = new Set([...Object.keys(perVp.desktop), ...Object.keys(perVp.mobiel)]);
  resultaat[url] = [...namen].map((n) => ({
    onderdeel: n, desktop: n in perVp.desktop, mobiel: n in perVp.mobiel,
    detail: perVp.desktop[n] || perVp.mobiel[n],
  }));
  console.log(`${url}: ${namen.size} onderdelen`);
}
await browser.close();

const bronDir = path.join(homedir(), 'wordswap-klanten', `${repo}-bron`);
await mkdir(bronDir, { recursive: true });
await writeFile(path.join(bronDir, 'onderdelen-inventaris.json'), JSON.stringify(resultaat, null, 2));

let md = `# Onderdelen-inventaris ${repo}\n\nElk onderdeel hieronder moet in de kopie terugkomen, of bewust weggelaten worden met reden in de oplevering. Zet per regel [x] als het klaar is.\n`;
for (const [url, vondsten] of Object.entries(resultaat)) {
  md += `\n## ${new URL(url).pathname}\n`;
  for (const v of vondsten) {
    const waar = v.desktop && v.mobiel ? 'desktop+mobiel' : v.desktop ? 'alleen desktop' : 'alleen mobiel';
    md += `- [ ] **${v.onderdeel}** (${waar}) — \`${v.detail}\`\n`;
  }
}
await writeFile(path.join(bronDir, 'onderdelen-inventaris.md'), md);
console.log(`Geschreven: ${path.join(bronDir, 'onderdelen-inventaris.md')}`);
