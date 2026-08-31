import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { zoekProspects } from "@/lib/prospectscan";

export const maxDuration = 120;

/** Zoekt en scant bedrijfssites voor een branche (+plaats) — admin-Outreach. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (user?.publicMetadata?.role !== "admin") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  const { branche, plaats } = (await req.json()) as { branche: string; plaats?: string };
  if (!branche?.trim()) return NextResponse.json({ error: "Geen branche" }, { status: 400 });
  return NextResponse.json({ resultaten: await zoekProspects(branche, plaats ?? "") });
}
