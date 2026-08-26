import { currentUser } from "@clerk/nextjs/server";
import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { bouwJobs } from "@/db/schema";

/** Zet een mislukte job terug in de wachtrij en start de worker opnieuw.
 *  Dankzij de checkpoints in de klant-repo hervat de bouw waar hij was. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (user?.publicMetadata?.role !== "admin") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  const { jobId } = (await req.json().catch(() => ({}))) as { jobId?: number };
  if (!jobId) return NextResponse.json({ error: "jobId ontbreekt" }, { status: 400 });

  const [job] = await db
    .update(bouwJobs)
    .set({ status: "wachtend", voortgang: "Opnieuw in de wachtrij...", bijgewerkt: new Date() })
    .where(and(eq(bouwJobs.id, jobId), eq(bouwJobs.status, "fout"), ne(bouwJobs.wxr, "")))
    .returning({ id: bouwJobs.id });
  if (!job) {
    return NextResponse.json(
      { error: "Alleen mislukte jobs met bewaarde export kunnen opnieuw" },
      { status: 400 }
    );
  }

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
  return NextResponse.json({ ok: true });
}
