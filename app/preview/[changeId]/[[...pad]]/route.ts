import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { changes, sites } from "@/db/schema";
import { GITHUB_ORG, gh, installationToken } from "@/lib/github";

const MIME: Record<string, string> = {
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

async function haalBestand(
  repo: string,
  pad: string,
  branch: string
): Promise<ArrayBuffer | null> {
  const token = await installationToken();
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_ORG}/${repo}/contents/${pad}?ref=${encodeURIComponent(branch)}`,
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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ changeId: string; pad?: string[] }> }
) {
  const { changeId, pad: padDelen } = await params;
  const id = Number(changeId);
  if (!Number.isInteger(id)) return new Response("Ongeldig", { status: 400 });

  let pad = (padDelen ?? []).join("/") || "index.html";
  if (pad.endsWith("/")) pad += "index.html";

  // Alleen HTML-verzoeken lopen door de login-check; assets (css/afbeeldingen)
  // worden door de middleware overgeslagen en zouden anders op auth() crashen.
  const ext0 = pad.split(".").pop() ?? "";
  const isHtml = !pad.includes(".") || ext0 === "html" || ext0 === "htm";
  let userId: string | null = null;
  if (isHtml) {
    ({ userId } = await auth());
    if (!userId) return new Response("Niet ingelogd", { status: 401 });
  }

  const [rij] = await db
    .select({ change: changes, site: sites })
    .from(changes)
    .innerJoin(sites, eq(changes.siteId, sites.id))
    .where(
      userId
        ? and(eq(changes.id, id), eq(sites.clerkUserId, userId))
        : eq(changes.id, id)
    );
  if (!rij) return new Response("Niet gevonden", { status: 404 });

  let data = await haalBestand(rij.site.githubRepo, pad, rij.change.branch);
  if (!data && !pad.includes(".")) {
    pad = `${pad}.html`;
    data = await haalBestand(rij.site.githubRepo, pad, rij.change.branch);
  }
  if (!data) return new Response("Pagina niet gevonden", { status: 404 });

  const ext = pad.split(".").pop() ?? "";
  const mime = MIME[ext] ?? "application/octet-stream";

  if (ext === "html" || ext === "htm") {
    let html = new TextDecoder().decode(data);
    // Absolute paden laten wijzen naar deze preview-route
    html = html.replace(
      /(href|src|action)=(["'])\//g,
      `$1=$2/preview/${id}/`
    );
    return new Response(html, { headers: { "Content-Type": mime } });
  }

  return new Response(data, {
    headers: { "Content-Type": mime, "Cache-Control": "no-store" },
  });
}
