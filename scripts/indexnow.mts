// Meldt alle pagina's uit de sitemap aan bij IndexNow (Bing, Yandex, e.a.).
// Gebruik: npx tsx --env-file=.env.local scripts/indexnow.mts
const sleutel = process.env.INDEXNOW_KEY;
if (!sleutel) throw new Error("INDEXNOW_KEY ontbreekt in .env.local");
const xml = await fetch("https://wordswap.nl/sitemap.xml").then((r) => r.text());
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: "wordswap.nl", key: sleutel, keyLocation: `https://wordswap.nl/${sleutel}.txt`, urlList: urls }),
});
console.log(`IndexNow: ${urls.length} adressen aangemeld → HTTP ${res.status}`);
