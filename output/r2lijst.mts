import { lijstObjecten } from '../lib/r2';
const rijen = await lijstObjecten('media/test-groene-golf/');
for (const r of rijen) console.log((r.size/1024/1024).toFixed(1).padStart(7), 'MB', r.key);
if (!rijen.length) console.log('(leeg)');
