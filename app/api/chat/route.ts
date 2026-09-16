import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isBeheerder } from "@/lib/auth";
import { voerChatBeurtUit } from "@/lib/chat-beurt";

// Pro-abonnement: langere functies mogen. 800 s dekt ook grote klussen
// (galerij met veel foto's). De chatbeurt zelf (lib/chat-beurt.ts) stopt de
// agent ruim vóór deze harde grens — houd de waarde daar gelijk.
export const maxDuration = 800;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  return voerChatBeurtUit(req, userId, { isBeheerder, kanaal: "portaal" });
}
