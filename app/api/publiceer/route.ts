import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isBeheerder } from "@/lib/auth";
import { publiceerConcept } from "@/lib/concept-acties";

export const maxDuration = 300;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const body = await req.json().catch(() => null);
  return publiceerConcept(body?.changeId, userId, isBeheerder);
}
