/**
 * Zoekt het logo van een klantsite op de homepage: eerst een afbeelding in de
 * <header>/<nav>, anders een afbeelding met "logo" in pad, alt of class.
 * Levert een absoluut webadres op, of null. Resultaat kort gecachet.
 */
const cache = new Map<string, { tijd: number; url: string | null }>();

export async function zoekLogo(host: string): Promise<string | null> {
  const schoon = host.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!schoon) return null;
  const hit = cache.get(schoon);
  if (hit && Date.now() - hit.tijd < 10 * 60 * 1000) return hit.url;
  let url: string | null = null;
  try {
    const res = await fetch(`https://${schoon}/`, { signal: AbortSignal.timeout(6000), headers: { "user-agent": "WordSwap-logo-zoeker" } });
    if (res.ok) {
      const html = await res.text();
      const kop = html.match(/<header[\s\S]*?<\/header>/i)?.[0] ?? html.match(/<nav[\s\S]*?<\/nav>/i)?.[0] ?? "";
      const imgs = (bron: string) => [...bron.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
      const src = (tag: string) => tag.match(/\ssrc=["']([^"']+)["']/i)?.[1] ?? null;
      const isLogo = (tag: string) => /logo/i.test(tag) && !/\.svg#|data:/.test(src(tag) ?? "");
      const kandidaat =
        imgs(kop).find(isLogo) ?? imgs(kop)[0] ?? imgs(html).find(isLogo) ?? null;
      const pad = kandidaat ? src(kandidaat) : null;
      if (pad && !pad.startsWith("data:")) {
        url = new URL(pad, `https://${schoon}/`).toString();
      }
    }
  } catch {
    url = null;
  }
  cache.set(schoon, { tijd: Date.now(), url });
  return url;
}
