import { GITHUB_ORG, installationToken } from "./github";

export const SITE_MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  json: "application/json",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  ico: "image/x-icon",
  txt: "text/plain; charset=utf-8",
  xml: "application/xml",
  woff2: "font/woff2",
};

export async function haalSiteBestand(
  repo: string,
  pad: string,
  branch?: string
): Promise<ArrayBuffer | null> {
  const token = await installationToken();
  const ref = branch ? `?ref=${encodeURIComponent(branch)}` : "";
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_ORG}/${repo}/contents/${pad}${ref}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.raw+json",
      },
    }
  );
  if (!res.ok) return null;
  return res.arrayBuffer();
}

/** Zoekt een pagina op met index.html/.html-fallbacks; geeft ook het gevonden pad terug. */
export async function vindSiteBestand(
  repo: string,
  pad: string,
  branch?: string
): Promise<{ data: ArrayBuffer; pad: string } | null> {
  let data = await haalSiteBestand(repo, pad, branch);
  if (data) return { data, pad };
  if (!pad.split("/").pop()!.includes(".")) {
    for (const variant of [`${pad}/index.html`, `${pad}.html`]) {
      data = await haalSiteBestand(repo, variant, branch);
      if (data) return { data, pad: variant };
    }
  }
  return null;
}

/** Herschrijft HTML zodat hij binnen een portal-weergaveroute werkt. */
export function herschrijfHtml(
  html: string,
  basisRoute: string,
  gevondenPad: string
): string {
  let uit = html.replace(
    /(href|src|action)=(["'])\//g,
    `$1=$2${basisRoute}/`
  );
  const map = gevondenPad.includes("/")
    ? gevondenPad.slice(0, gevondenPad.lastIndexOf("/") + 1)
    : "";
  if (!/<base\s/i.test(uit)) {
    uit = uit.replace(
      /<head([^>]*)>/i,
      `<head$1><base href="${basisRoute}/${map}">`
    );
  }
  return uit;
}
