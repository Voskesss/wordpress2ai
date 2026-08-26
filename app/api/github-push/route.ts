import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { deployRepoNaarCloudflare } from "@/lib/cloudflare";

export const maxDuration = 300;

/**
 * GitHub-webhook: een push naar main van een klant-repo wordt automatisch
 * gedeployed naar Cloudflare (live + werkversie). Zo kun je klant-sites ook
 * rechtstreeks via git/Claude Code aanpassen: push = live.
 * Instellen: webhook op org- of App-niveau naar deze URL, secret in
 * GITHUB_WEBHOOK_SECRET, alleen push-events.
 */
export async function POST(req: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Geen secret ingesteld" }, { status: 500 });

  const body = await req.text();
  const handtekening = req.headers.get("x-hub-signature-256") ?? "";
  const verwacht = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  const a = Buffer.from(handtekening);
  const b = Buffer.from(verwacht);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Ongeldige handtekening" }, { status: 401 });
  }

  if (req.headers.get("x-github-event") !== "push") {
    return NextResponse.json({ ok: true, genegeerd: "geen push-event" });
  }

  const event = JSON.parse(body) as {
    ref?: string;
    repository?: { name?: string };
    pusher?: { name?: string };
  };
  if (event.ref !== "refs/heads/main") {
    return NextResponse.json({ ok: true, genegeerd: "niet main" });
  }
  const repo = event.repository?.name ?? "";
  if (!repo) return NextResponse.json({ error: "Geen repo" }, { status: 400 });

  const [site] = await db.select().from(sites).where(eq(sites.githubRepo, repo));
  if (!site?.netlifySiteId) {
    return NextResponse.json({ ok: true, genegeerd: "site niet online" });
  }

  // Concept-branches van de chat pushen ook via de API maar alleen main deployt;
  // de werkversie gaat mee zodat portal-preview en live gelijk blijven.
  await deployRepoNaarCloudflare(repo, site.netlifySiteId);
  await deployRepoNaarCloudflare(repo, `wv-${site.netlifySiteId}`).catch((e) =>
    console.error("Werkversie-deploy mislukt:", e)
  );
  return NextResponse.json({ ok: true, gedeployed: site.netlifySiteId });
}
