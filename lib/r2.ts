/**
 * R2: de bestandsopslag van Cloudflare, via de REST-API (geen aparte S3-sleutels
 * nodig — het gewone API-token met "Workers R2 Storage: Edit" volstaat).
 *
 * Klantsites staan in één bucket, elke site (worker-naam) onder een eigen
 * voorvoegsel: `<naam>/index.html`, `<naam>/afbeeldingen/x.webp`, ...
 * R2 is direct consistent: zodra een schrijfactie klaar is, ziet elk
 * Cloudflare-datacenter de nieuwe versie. Dat is de hele reden van deze opzet.
 */

const API = "https://api.cloudflare.com/client/v4";
const ACCOUNT = "2a71da7bfe94ae3540d4af02be53d53e";
export const R2_BUCKET = "wordswap-sites";

function basis(): string {
  return `${API}/accounts/${ACCOUNT}/r2/buckets/${R2_BUCKET}`;
}

function auth(): Record<string, string> {
  return { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` };
}

/** Object-sleutel als URL-pad: elk segment apart coderen, slashes behouden. */
function sleutelPad(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

/** fetch met herkansingen. De Cloudflare-API staat ± 1200 aanvragen per 5 minuten toe (4 per seconde).
 * Bij 429 wachten we netjes (Retry-After of oplopend) in plaats van op te geven:
 * een eerste deploy van een grote site (honderden bestanden) mag best twee
 * minuten duren, maar mag nooit halverwege stranden. */
async function metHerkansing(
  doe: () => Promise<Response>,
  omschrijving: string,
  pogingen = 8
): Promise<Response> {
  let laatste: unknown = null;
  for (let i = 0; i < pogingen; i++) {
    try {
      const res = await doe();
      if (res.status < 500 && res.status !== 429) return res;
      laatste = new Error(`${omschrijving}: HTTP ${res.status}`);
      if (res.status === 429) {
        const na = Number(res.headers.get("retry-after"));
        await new Promise((r) => setTimeout(r, Number.isFinite(na) && na > 0 ? na * 1000 : Math.min(30000, 2000 * (i + 1))));
        continue;
      }
    } catch (e) {
      laatste = e;
    }
    await new Promise((r) => setTimeout(r, 300 * 2 ** i));
  }
  throw laatste instanceof Error ? laatste : new Error(`${omschrijving} mislukt`);
}

/** Aantal gelijktijdige API-aanvragen: onder de 4/s-limiet blijven. */
export const R2_TEGELIJK = 4;

let bucketGecontroleerd = false;

/** Zorgt dat de bucket bestaat (eenmalig per proces gecontroleerd). */
export async function zorgBucket(): Promise<void> {
  if (bucketGecontroleerd) return;
  const res = await metHerkansing(
    () => fetch(`${API}/accounts/${ACCOUNT}/r2/buckets/${R2_BUCKET}`, { headers: auth() }),
    "bucket opvragen"
  );
  if (res.status === 404) {
    const aanmaak = await fetch(`${API}/accounts/${ACCOUNT}/r2/buckets`, {
      method: "POST",
      headers: { ...auth(), "Content-Type": "application/json" },
      body: JSON.stringify({ name: R2_BUCKET, locationHint: "weur" }),
    });
    const data = (await aanmaak.json()) as { success: boolean; errors?: { code?: number }[] };
    // 10004 = bestaat al (race met een parallelle deploy): prima
    if (!data.success && !data.errors?.some((e) => e.code === 10004)) {
      throw new Error(`R2-bucket aanmaken mislukt: ${JSON.stringify(data.errors)}`);
    }
  } else if (!res.ok) {
    const tekst = await res.text().catch(() => "");
    throw new Error(`R2 niet bereikbaar (HTTP ${res.status}): ${tekst.slice(0, 200)}`);
  }
  bucketGecontroleerd = true;
}

export async function schrijfObject(key: string, data: Buffer | string, contentType: string): Promise<void> {
  const res = await metHerkansing(
    () =>
      fetch(`${basis()}/objects/${sleutelPad(key)}`, {
        method: "PUT",
        headers: { ...auth(), "Content-Type": contentType },
        body: typeof data === "string" ? Buffer.from(data) : new Uint8Array(data),
      }),
    `R2 schrijven ${key}`
  );
  if (!res.ok) {
    const tekst = await res.text().catch(() => "");
    throw new Error(`R2 schrijven mislukt (${key}, HTTP ${res.status}): ${tekst.slice(0, 200)}`);
  }
}

/** Leest een object; null als het niet bestaat. */
export async function leesObject(key: string): Promise<Buffer | null> {
  const res = await metHerkansing(
    () => fetch(`${basis()}/objects/${sleutelPad(key)}`, { headers: auth() }),
    `R2 lezen ${key}`
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`R2 lezen mislukt (${key}, HTTP ${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

export async function verwijderObject(key: string): Promise<void> {
  const res = await metHerkansing(
    () => fetch(`${basis()}/objects/${sleutelPad(key)}`, { method: "DELETE", headers: auth() }),
    `R2 verwijderen ${key}`
  );
  // 404 = al weg: prima
  if (!res.ok && res.status !== 404) throw new Error(`R2 verwijderen mislukt (${key}, HTTP ${res.status})`);
}

/** Alle sleutels onder een voorvoegsel (met paginering). */
export async function lijstSleutels(prefix: string): Promise<string[]> {
  const sleutels: string[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 100; i++) {
    const params = new URLSearchParams({ prefix, per_page: "1000" });
    if (cursor) params.set("cursor", cursor);
    const res = await metHerkansing(
      () => fetch(`${basis()}/objects?${params}`, { headers: auth() }),
      `R2 lijsten ${prefix}`
    );
    if (!res.ok) throw new Error(`R2 lijsten mislukt (${prefix}, HTTP ${res.status})`);
    const data = (await res.json()) as {
      result?: { key: string }[];
      result_info?: { cursor?: string; is_truncated?: boolean };
    };
    for (const o of data.result ?? []) sleutels.push(o.key);
    if (!data.result_info?.is_truncated || !data.result_info.cursor) break;
    cursor = data.result_info.cursor;
  }
  return sleutels;
}

/** Voert taken parallel uit met een maximum aantal tegelijk. */
export async function parallel<T>(items: T[], tegelijk: number, doe: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  const werker = async () => {
    while (index < items.length) {
      const item = items[index++];
      await doe(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(tegelijk, items.length) }, werker));
}

/** Verwijdert alles onder een voorvoegsel (bij opzeggen van een site of opruimen van een demo-sandbox). */
export async function verwijderPrefix(prefix: string): Promise<number> {
  const schoon = prefix.endsWith("/") ? prefix : `${prefix}/`;
  const sleutels = await lijstSleutels(schoon);
  await parallel(sleutels, R2_TEGELIJK, (key) => verwijderObject(key));
  return sleutels.length;
}
