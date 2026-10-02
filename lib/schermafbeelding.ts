/**
 * Schermafbeelding van een pagina via Cloudflare Browser Rendering ("Browser
 * Run" in het dashboard). Zo kan de AI zien wat de eigenaar ziet — bijvoorbeeld
 * als die op "Klopt niet, kijk zelf even" drukt.
 *
 * Gratis laag: 10 minuten browsertijd per dag; één afbeelding kost 2-4 seconden.
 * De API geeft snel 429 bij opeenvolgende aanvragen: daarom herkansen met pauze.
 */
import sharp from "sharp";

const API = "https://api.cloudflare.com/client/v4";
const ACCOUNT = "2a71da7bfe94ae3540d4af02be53d53e";

export type Apparaat = "telefoon" | "tablet" | "desktop";

/** Maximale hoogte per deelafbeelding: hoger wordt voor het model onleesbaar klein. */
const DEEL_HOOGTE = 1400;
const MAX_DELEN = 4;

function viewport(apparaat: Apparaat) {
  if (apparaat === "telefoon") return { width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 1 };
  if (apparaat === "tablet") return { width: 768, height: 1024, isMobile: true, hasTouch: true, deviceScaleFactor: 1 };
  return { width: 1280, height: 800, deviceScaleFactor: 1 };
}

/** Maakt de HTML klaar voor een opname van de hele pagina: zonder "lui
 * laden" en "later uitpakken" op foto's. Cloudflare tekent zulke foto's
 * buiten het eerste scherm niet bij een fullPage-opname; die stonden dan als
 * leeg vak op de schermafbeelding, en de AI ging bij "Kijk zelf" foto's
 * "repareren" die niets mankeerden (Vakbeursonline 02-10). Onze eigen
 * nabewerking zet beide instellingen op bijna elke foto, dus dit raakte
 * vrijwel elke site. Een <base> zorgt dat /afbeeldingen/... blijft kloppen. */
export function htmlVoorOpname(html: string, url: string): string {
  const basis = url.replace(/[?#].*$/, "");
  return html
    .replace(/\sloading=(["'])lazy\1/gi, "")
    .replace(/\sdecoding=(["'])async\1/gi, "")
    .replace(/<head([^>]*)>/i, `<head$1><base href="${basis}">`);
}

/** Volledige pagina als PNG. Gooit een fout als het na herkansingen niet lukt. */
export async function maakSchermafbeelding(url: string, apparaat: Apparaat = "desktop"): Promise<Buffer> {
  // Eerst de pagina zelf ophalen en klaarmaken; lukt dat niet, dan valt de
  // opname terug op de gewone url (met het risico op lege fotovakken).
  let bron: { html: string } | { url: string } = { url };
  try {
    const pagina = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (pagina.ok && (pagina.headers.get("content-type") ?? "").includes("html")) {
      bron = { html: htmlVoorOpname(await pagina.text(), url) };
    }
  } catch {}
  let laatste: unknown = null;
  for (let poging = 0; poging < 4; poging++) {
    try {
      const res = await fetch(`${API}/accounts/${ACCOUNT}/browser-rendering/screenshot`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...bron,
          viewport: viewport(apparaat),
          screenshotOptions: { fullPage: true, type: "png" },
          gotoOptions: { waitUntil: "networkidle0", timeout: 25000 },
        }),
        signal: AbortSignal.timeout(45000),
      });
      if (res.status === 429) {
        laatste = new Error("Schermafbeelding: te veel aanvragen (429)");
        await new Promise((r) => setTimeout(r, 8000 * (poging + 1)));
        continue;
      }
      if (!res.ok) {
        const tekst = await res.text().catch(() => "");
        throw new Error(`Schermafbeelding mislukt (HTTP ${res.status}): ${tekst.slice(0, 200)}`);
      }
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      laatste = e;
      if (poging < 3) await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw laatste instanceof Error ? laatste : new Error("Schermafbeelding mislukt");
}

/** Knipt een (hoge) paginafoto in leesbare delen van boven naar beneden. */
export async function knipInDelen(png: Buffer): Promise<Buffer[]> {
  const meta = await sharp(png).metadata();
  const breedte = meta.width ?? 0;
  const hoogte = meta.height ?? 0;
  if (!breedte || !hoogte) return [png];
  const delen: Buffer[] = [];
  for (let top = 0; top < hoogte && delen.length < MAX_DELEN; top += DEEL_HOOGTE) {
    const h = Math.min(DEEL_HOOGTE, hoogte - top);
    delen.push(await sharp(png).extract({ left: 0, top, width: breedte, height: h }).png().toBuffer());
  }
  return delen;
}
