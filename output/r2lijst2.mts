import { lijstObjecten } from '../lib/r2';
for (const p of ['media/test-groene-golf/']) {
  const rijen = await lijstObjecten(p);
  console.log('--', p, rijen.length, 'objecten');
  for (const r of rijen) console.log((r.size/1024/1024).toFixed(1).padStart(7), 'MB', r.key);
}
