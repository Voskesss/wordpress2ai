/**
 * Snelle e-mailcheck voor een klantdomein — draai dit bij ELKE intake:
 *   npx tsx scripts/mail-check.mts klantdomein.nl
 * Vertelt waar de mail draait en of migratie nodig is.
 */
import { promises as dns } from 'node:dns';

const domein = process.argv[2];
if (!domein) { console.error('Gebruik: mail-check.mts <domein>'); process.exit(1); }

const mx = await dns.resolveMx(domein).catch(() => []);
const txt = (await dns.resolveTxt(domein).catch(() => [])).map((r) => r.join(''));
const dmarc = (await dns.resolveTxt(`_dmarc.${domein}`).catch(() => [])).map((r) => r.join(''));
const ns = await dns.resolveNs(domein).catch(() => []);

console.log(`\n=== E-mailcheck ${domein} ===`);
console.log('MX-records:', mx.length ? '' : '(geen — geen mail op dit domein?)');
for (const r of mx.sort((a, b) => a.priority - b.priority)) console.log(`  ${r.priority}  ${r.exchange}`);

const mxTekst = mx.map((r) => r.exchange.toLowerCase()).join(' ');
const herkend =
  /outlook|microsoft/.test(mxTekst) ? 'Microsoft 365 — mail draait EXTERN, alleen DNS-records meenemen' :
  /google|gmail/.test(mxTekst) ? 'Google Workspace — mail draait EXTERN, alleen DNS-records meenemen' :
  /soverin/.test(mxTekst) ? 'Soverin — mail draait EXTERN, alleen DNS-records meenemen' :
  /transip/.test(mxTekst) ? 'TransIP — check of dit mail-only is of bij de webhosting hoort' :
  /vimexx|antagonist|siteground|mailspamprotection|hostnet|mijndomein|byte|savvii|cloud86|neostrada|versio|strato|one\.com|hostinger/.test(mxTekst) ?
    'LET OP: mail draait bij een WEBHOSTER — waarschijnlijk gekoppeld aan de WordPress-hosting. E-MAILMIGRATIE NODIG vóór opzegging!' :
  mx.length ? 'Onbekende provider — handmatig checken of dit de webhoster is' : 'Geen MX gevonden';
console.log('\nDiagnose:', herkend);

console.log('\nSPF:', txt.find((t) => t.startsWith('v=spf1')) ?? '(geen — noteren, moet mee)');
console.log('DMARC:', dmarc.find((t) => t.startsWith('v=DMARC1')) ?? '(geen)');
console.log('Nameservers:', ns.join(', '));
console.log('\nVolgende stap: zie docs/email-migratie.md voor het draaiboek.\n');
