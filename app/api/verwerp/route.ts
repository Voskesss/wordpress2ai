import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isBeheerder } from "@/lib/auth";
import { verwerpConcept } from "@/lib/concept-acties";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const { changeId } = (await req.json()) as { changeId: number };
  return verwerpConcept(changeId, userId, isBeheerder);
}
