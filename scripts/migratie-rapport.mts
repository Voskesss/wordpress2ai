/**
 * Migratierapport voor de klant als PDF in WordSwap-huisstijl.
 *   npx tsx scripts/migratie-rapport.mts <repo>
 * Leest ~/wordswap-klanten/<repo>-bron/rapport.md (frontmatter + markdown) en schrijft
 * ~/wordswap-klanten/<repo>-bron/rapport-<repo>.pdf. Maakt zelf een voor-en-na-beeld van de
 * homepage (velden `oud` en `nieuw`) en toont de kerncijfers (score_*, laadtijd_*, paginas).
 */
import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const repo = process.argv[2];
if (!repo) {
  console.error("Gebruik: migratie-rapport.mts <repo>");
  process.exit(1);
}
const bron = path.join(homedir(), "wordswap-klanten", `${repo}-bron`);
const ruw = await readFile(path.join(bron, "rapport.md"), "utf8");

// ---------- frontmatter + een klein markdown-subset ----------
const fm: Record<string, string> = {};
let tekst = ruw;
const kop = ruw.match(/^---\n([\s\S]*?)\n---\n/);
if (kop) {
  for (const regel of kop[1].split("\n")) {
    const m = regel.match(/^([a-z_]+):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].trim();
  }
  tekst = ruw.slice(kop[0].length);
}
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s: string) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

function naarHtml(md: string): string {
  const regels = md.split("\n");
  const uit: string[] = [];
  let i = 0;
  while (i < regels.length) {
    const r = regels[i];
    if (!r.trim()) { i++; continue; }
    if (r.startsWith("## ")) { uit.push(`<h2>${inline(r.slice(3))}</h2>`); i++; continue; }
    if (r.startsWith("### ")) { uit.push(`<h3>${inline(r.slice(4))}</h3>`); i++; continue; }
    if (r.startsWith("|")) {
      const rijen: string[][] = [];
      while (i < regels.length && regels[i].startsWith("|")) {
        const cellen = regels[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cellen.every((c) => /^:?-+:?$/.test(c))) rijen.push(cellen);
        i++;
      }
      const [hoofd, ...romp] = rijen;
      uit.push(`<table><thead><tr>${hoofd.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${romp
        .map((r2) => `<tr>${r2.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
      continue;
    }
    if (/^(- |\d+\. )/.test(r)) {
      const genummerd = /^\d+\. /.test(r);
      const items: string[] = [];
      while (i < regels.length && /^(- |\d+\. )/.test(regels[i])) {
        items.push(`<li>${inline(regels[i].replace(/^(- |\d+\. )/, ""))}</li>`);
        i++;
      }
      uit.push(genummerd ? `<ol>${items.join("")}</ol>` : `<ul>${items.join("")}</ul>`);
      continue;
    }
    const alinea: string[] = [];
    while (i < regels.length && regels[i].trim() && !/^(## |### |\||- |\d+\. )/.test(regels[i])) alinea.push(regels[i++]);
    uit.push(`<p>${inline(alinea.join(" "))}</p>`);
  }
  return uit.join("\n");
}

// Eerste alinea wordt de intro (groter), de rest de romp
const html = naarHtml(tekst);
const eersteP = html.indexOf("<p>");
const intro = eersteP === 0 ? html.slice(0, html.indexOf("</p>") + 4).replace("<p>", '<p class="intro">') : "";
const romp = eersteP === 0 ? html.slice(html.indexOf("</p>") + 4) : html;

// ---------- voor-en-na-beeld van de homepage ----------
const browser = await chromium.launch();
async function schiet(url: string): Promise<string> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await ctx.route(/cookiebot|futy\.io|googletagmanager|google-analytics|leadinfo|hotjar|clarity|connect\.facebook/, (r) => r.abort());
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await p.addStyleTag({ content: "#wa,#CybotCookiebotDialog,[id*=cookie],[class*=cookie-banner]{display:none!important}" });
  await p.waitForTimeout(1200);
  const png = await p.screenshot({ type: "jpeg", quality: 82 });
  await ctx.close();
  return `data:image/jpeg;base64,${png.toString("base64")}`;
}
const voorNa = fm.oud && fm.nieuw ? { oud: await schiet(fm.oud), nieuw: await schiet(fm.nieuw) } : null;

// ---------- opmaak ----------
const logo = `<svg width="30" height="30" viewBox="0 0 40 40" fill="none"><path d="M4 9 12 31 20 13 28 31 34 15" stroke="#172E3B" stroke-width="4.5" stroke-linejoin="round"/><path d="m34 15 2-6" stroke="#31956B" stroke-width="4.5"/></svg>`;
const cijfer = (label: string, oud?: string, nieuw?: string) =>
  oud && nieuw
    ? `<div class="cijfer"><div class="cijfer-label">${esc(label)}</div><div class="cijfer-waarden"><span class="oud">${esc(oud)}</span><span class="pijl">→</span><span class="nieuw">${esc(nieuw)}</span></div></div>`
    : "";
const kerncijfers = [
  cijfer("Google-score op mobiel", fm.score_oud, fm.score_nieuw),
  cijfer("Tot de pagina in beeld staat", fm.laadtijd_oud, fm.laadtijd_nieuw),
  fm.paginas ? `<div class="cijfer"><div class="cijfer-label">Pagina's overgezet</div><div class="cijfer-waarden"><span class="nieuw">${esc(fm.paginas)}</span><span class="klein">op hetzelfde adres</span></div></div>` : "",
].join("");

const pagina = `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 16mm 17mm 20mm; }
:root { --groen: #245747; --groen-donker: #243a31; --accent: #31956B; --licht: #eef3ea; --rand: #dfe5da; --creme: #fdfaf4; --grijs: #5d6b63; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: Geist, system-ui, sans-serif; color: var(--groen-donker); font-size: 10.5pt; line-height: 1.55; }
a { color: var(--groen); text-decoration: underline; text-underline-offset: 2px; }
.kopregel { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid var(--rand); }
.woordmerk { display: inline-flex; align-items: center; font-weight: 700; font-size: 22pt; letter-spacing: -0.055em; color: #172E3B; }
.woordmerk svg { margin-right: -1px; }
.woordmerk .stip { color: var(--accent); }
.soort { font-size: 8pt; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--grijs); }
.label { margin: 30px 0 10px; font-size: 8pt; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: #6f6448; }
.label::before { content: ""; display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #6e9a5b; margin-right: 9px; vertical-align: 1px; }
h1 { font-size: 27pt; line-height: 1.08; letter-spacing: -0.035em; font-weight: 600; margin: 0 0 16px; color: var(--groen-donker); }
.aanhef { font-weight: 600; font-size: 12pt; margin: 0 0 4px; }
.intro { font-size: 12pt; line-height: 1.6; color: #34473f; margin: 0 0 22px; }
.cijfers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 0 0 22px; }
.cijfer { background: var(--licht); border-radius: 10px; padding: 12px 14px; }
.cijfer-label { font-size: 8pt; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--grijs); margin-bottom: 6px; }
.cijfer-waarden { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.oud { font-size: 12pt; color: #8a8f86; text-decoration: line-through; }
.pijl { color: var(--accent); font-weight: 700; }
.nieuw { font-size: 20pt; font-weight: 700; color: var(--groen); letter-spacing: -0.02em; }
.klein { font-size: 9pt; color: var(--grijs); }
.voorna { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 0 0 8px; break-inside: avoid; }
.voorna figure { margin: 0; }
.voorna img { width: 100%; border-radius: 8px; border: 1px solid var(--rand); display: block; }
.voorna figcaption { font-size: 8pt; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: var(--grijs); margin-top: 6px; }
h2 { font-size: 15pt; letter-spacing: -0.02em; font-weight: 600; margin: 26px 0 8px; padding-top: 14px; border-top: 1px solid var(--rand); break-after: avoid; color: var(--groen-donker); }
h3 { font-size: 11.5pt; margin: 16px 0 6px; break-after: avoid; }
p { margin: 0 0 10px; }
ul, ol { margin: 0 0 12px; padding: 0; list-style: none; }
li { position: relative; padding-left: 20px; margin-bottom: 7px; break-inside: avoid; }
ul li::before { content: ""; position: absolute; left: 3px; top: .62em; width: 6px; height: 6px; border-radius: 2px; background: var(--accent); }
ol { counter-reset: n; }
ol li { counter-increment: n; padding-left: 28px; }
ol li::before { content: counter(n); position: absolute; left: 0; top: 1px; width: 19px; height: 19px; border-radius: 50%; background: var(--groen); color: #fff; font-size: 8pt; font-weight: 700; display: flex; align-items: center; justify-content: center; }
table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 6px 0 14px; font-size: 9pt; line-height: 1.45; border: 1px solid var(--rand); border-radius: 8px; overflow: hidden; }
thead { display: table-header-group; }
th { background: var(--groen); color: #fff; text-align: left; font-weight: 600; padding: 7px 9px; }
td { padding: 7px 9px; vertical-align: top; border-top: 1px solid var(--rand); }
tr { break-inside: avoid; }
tbody tr:nth-child(even) td { background: #f7f9f4; }
td:first-child { font-weight: 600; }
.slot { margin-top: 26px; padding: 14px 16px; background: var(--creme); border: 1px solid var(--rand); border-radius: 10px; font-size: 9.5pt; break-inside: avoid; }
</style></head><body>
<div class="kopregel"><span class="woordmerk">${logo}<span>ordswap<span class="stip">.</span></span></span><span class="soort">Migratierapport</span></div>
<div class="label">${esc(fm.klant ?? repo)} · ${esc(fm.datum ?? "")}</div>
<h1>${esc(fm.titel ?? "Jouw nieuwe website")}</h1>
${fm.aanhef ? `<p class="aanhef">Hoi ${esc(fm.aanhef)},</p>` : ""}
${intro}
${kerncijfers ? `<div class="cijfers">${kerncijfers}</div>` : ""}
${voorNa ? `<div class="voorna"><figure><img src="${voorNa.oud}" alt=""><figcaption>Nu · ${esc(new URL(fm.oud).hostname)}</figcaption></figure><figure><img src="${voorNa.nieuw}" alt=""><figcaption>Nieuw · ${esc(new URL(fm.nieuw).hostname)}</figcaption></figure></div>` : ""}
${romp}
<div class="slot"><strong>Vragen over dit rapport?</strong> Neem gerust contact met ons op via <a href="https://wordswap.nl/">wordswap.nl</a>. We lopen het ook graag samen met je door.</div>
</body></html>`;

const p = await browser.newPage();
await p.setContent(pagina, { waitUntil: "networkidle" });
await p.evaluate("document.fonts.ready");
const uitPad = path.join(bron, `rapport-${repo}.pdf`);
await p.pdf({
  path: uitPad,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: `<div style="width:100%;font-family:Helvetica,Arial,sans-serif;font-size:7.5pt;color:#5d6b63;padding:0 17mm;display:flex;justify-content:space-between"><span>WordSwap · wordswap.nl</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
  margin: { top: "16mm", bottom: "20mm", left: "17mm", right: "17mm" },
});
await writeFile(path.join(bron, `rapport-${repo}.html`), pagina);
await browser.close();
console.log(uitPad);
