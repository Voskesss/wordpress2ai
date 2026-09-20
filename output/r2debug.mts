import { lijstSleutels } from '../lib/r2';
try {
  const s = await lijstSleutels('media/test-groene-golf/');
  console.log('lijstSleutels OK:', s.length, s.slice(0, 20));
} catch (e) { console.log('lijstSleutels FOUT:', (e as Error).message); }
// rauwe aanroep om de foutbody te zien
const acc = process.env.CLOUDFLARE_ACCOUNT_ID, tok = process.env.CLOUDFLARE_API_TOKEN, bucket = process.env.R2_BUCKET ?? 'wordswap-sites';
const url = `https://api.cloudflare.com/client/v4/accounts/${acc}/r2/buckets/${bucket}/objects?prefix=${encodeURIComponent('media/test-groene-golf/')}&per_page=1000`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } });
console.log('rauw:', res.status, (await res.text()).slice(0, 400));
