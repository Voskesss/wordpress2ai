import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { scanProspect } from "@/lib/prospectscan";

export const maxDuration = 60;

/** Scant een website op WordPress + verwaarlozing (admin-Outreach). */
export async function POST(req: Request) {
  const user = await currentUser();
  if (user?.publicMetadata?.role !== "admin") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  const { domein } = (await req.json()) as { domein: string };
  if (!domein?.trim()) return NextResponse.json({ error: "Geen domein" }, { status: 400 });
  return NextResponse.json(await scanProspect(domein));
}
