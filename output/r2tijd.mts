const ACC = '2a71da7bfe94ae3540d4af02be53d53e';
const url = `https://api.cloudflare.com/client/v4/accounts/${ACC}/r2/buckets/wordswap-sites/objects?prefix=${encodeURIComponent('media/test-groene-golf/')}&per_page=100`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` } });
const data = await res.json();
for (const o of data.result ?? []) console.log(o.last_modified ?? o.uploaded, o.key, o.size);
