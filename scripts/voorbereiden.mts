/**
 * Mechanisch voorwerk voor een migratie (geen AI, geen API-kosten):
 * WXR parsen, bronmateriaal + seo-manifest wegschrijven, ontwerp van de
 * live site oogsten (HTML/CSS/screenshots/bestek) en afbeeldingen
 * gededupliceerd downloaden.
 *   npx tsx --env-file=.env.local scripts/voorbereiden.mts <xml-pad> <repo-naam>
 * Resultaat: ~/wordswap-klanten/<repo>-bron/  (bronmateriaal, oud-ontwerp, media-map.json)
 *            ~/wordswap-klanten/<repo>/       (site-map met afbeeldingen/, hier bouwt Claude)
 */
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { parseWxr, maakSeoManifest } from '../lib/wxr';
import { haalLiveOntwerp } from '../lib/bouw';

const [xmlPad, repo] = process.argv.slice(2);
if (!xmlPad || !repo) { console.error('Gebruik: voorbereiden.mts <xml-pad> <repo-naam>'); process.exit(1); }

let xml = await readFile(xmlPad);
if (xmlPad.endsWith('.gz')) xml = gunzipSync(xml);
const wxr = parseWxr(xml.toString('utf8'));
const manifest = maakSeoManifest(wxr);
const paginas = [...wxr.paginas, ...wxr.berichten].filter((p) => p.status === 'publish');
console.log(`${wxr.siteTitel} — ${wxr.paginas.length} pagina's, ${wxr.berichten.length} berichten, bron ${wxr.siteUrl}`);

const bronDir = path.join(homedir(), 'wordswap-klanten', `${repo}-bron`);
const siteDir = path.join(homedir(), 'wordswap-klanten', repo);
await mkdir(path.join(bronDir, 'bronmateriaal'), { recursive: true });
await mkdir(path.join(siteDir, 'afbeeldingen'), { recursive: true });

for (const p of paginas) {
  const naam = (p.slug || p.titel).replace(/[^a-zA-Z0-9-]+/g, '-');
  await writeFile(
    path.join(bronDir, 'bronmateriaal', `${p.type}-${naam}.html`),
    `<!-- pad: ${p.pad} -->\n<!-- titel: ${p.titel} -->\n<!-- samenvatting: ${p.excerpt.replace(/-->/g, '')} -->\n${p.content}`
  );
}
await writeFile(path.join(bronDir, 'seo-manifest.json'), JSON.stringify(manifest, null, 2));
console.log('bronmateriaal geschreven');

const ontwerp = await haalLiveOntwerp(
  wxr.siteUrl,
  paginas.map((p) => p.pad),
  path.join(bronDir, 'oud-ontwerp'),
  (t) => console.log('  ' + t)
);

// Afbeeldingen: WordPress-formaatvarianten groeperen, beste per foto downloaden
const basisVan = (u: string) => u.replace(/-\d+x\d+(?=\.\w+(?:[?#]|$))/, '');
const alle = [...new Set([...ontwerp.afbeeldingUrls, ...manifest.mediaUrls])];
const groepen = new Map<string, { beste: string; besteOpp: number; varianten: string[] }>();
for (const u of alle) {
  const b = basisVan(u);
  const m = u.match(/-(\d+)x(\d+)\.\w+(?:[?#]|$)/);
  const opp = m ? Number(m[1]) * Number(m[2]) : Number.MAX_SAFE_INTEGER;
  const g = groepen.get(b) ?? { beste: u, besteOpp: -1, varianten: [] };
  g.varianten.push(u);
  if (opp > g.besteOpp) { g.beste = u; g.besteOpp = opp; }
  groepen.set(b, g);
}
const teDoen = [...groepen.values()].slice(0, 300);
console.log(`afbeeldingen: ${teDoen.length} uniek van ${alle.length}`);
const mediaMap: Record<string, string> = {};
let n = 0;
for (let i = 0; i < teDoen.length; i += 5) {
  await Promise.all(teDoen.slice(i, i + 5).map(async (g) => {
    try {
      const res = await fetch(g.beste, { signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) return;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 10 * 1024 * 1024) return;
      const basis = path.basename(new URL(basisVan(g.beste)).pathname)
        .replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 60);
      const doel = `afbeeldingen/${basis}.webp`;
      const data = await sharp(buf).rotate().resize({ width: 2000, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
      await writeFile(path.join(siteDir, doel), data);
      for (const v of g.varianten) mediaMap[v] = `/${doel}`;
      n++;
    } catch {}
  }));
  if (i % 50 === 0) console.log(`  ${Math.min(i + 5, teDoen.length)}/${teDoen.length}...`);
}
await writeFile(path.join(bronDir, 'media-map.json'), JSON.stringify(mediaMap, null, 2));
console.log(`${n} afbeeldingen gedownload → ${siteDir}/afbeeldingen`);
console.log(`KLAAR — bron: ${bronDir} | bouwmap: ${siteDir}`);
