import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { bouwJobs } from "@/db/schema";

export const maxDuration = 60;

async function leesWxr(form: FormData): Promise<string | null> {
  const file = form.get("wxr");
  if (!(file instanceof File) || file.size === 0) return null;
  const buf = Buffer.from(await file.arrayBuffer());
  if (form.get("gz") === "1") {
    const { gunzipSync } = await import("node:zlib");
    return gunzipSync(buf).toString("utf8");
  }
  return buf.toString("utf8");
}


/** Zet een bouwopdracht klaar en start de worker (GitHub Action). */
export async function POST(req: Request) {
  const user = await currentUser();
  if (user?.publicMetadata?.role !== "admin") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const form = await req.formData();
  const xmlInhoud = await leesWxr(form);
  const siteNaam = String(form.get("siteNaam") ?? "").trim();
  const aanwijzingen = String(form.get("aanwijzingen") ?? "").trim().slice(0, 4000) || null;
  const repoNaam = String(form.get("repoNaam") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!xmlInhoud || !siteNaam || !repoNaam) {
    return NextResponse.json({ error: "Ontbrekende gegevens" }, { status: 400 });
  }

  const [job] = await db
    .insert(bouwJobs)
    .values({
      siteNaam,
      repoNaam,
      aanwijzingen,
      clerkUserId: user.id,
      wxr: xmlInhoud,
      voortgang: "In de wachtrij...",
    })
    .returning({ id: bouwJobs.id });

  // Worker starten via GitHub Actions (workflow_dispatch)
  const pat = process.env.GITHUB_ACTIONS_PAT;
  const workflowRepo = process.env.GITHUB_ACTIONS_REPO ?? "Voskesss/wordpress2ai";
  if (pat) {
    const res = await fetch(
      `https://api.github.com/repos/${workflowRepo}/actions/workflows/bouw-worker.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main" }),
      }
    );
    if (!res.ok) {
      console.error("Workflow dispatch mislukt:", res.status, await res.text());
    }
  }

  return NextResponse.json({ jobId: job.id, workerGestart: Boolean(pat) });
}
