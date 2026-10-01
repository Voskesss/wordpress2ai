import { NextResponse } from "next/server";
import { draaiGezondheid } from "@/lib/gezondheid";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Dagelijkse gezondheidscontrole; zie lib/gezondheid.ts. */
export async function GET(req: Request) {
  const geheim = process.env.CRON_SECRET;
  if (!geheim || req.headers.get("authorization") !== `Bearer ${geheim}`) {
    return new NextResponse("Nee", { status: 401 });
  }
  const rapport = await draaiGezondheid();
  const fouten = rapport.checks.filter((c) => c.status === "fout").length;
  // Dagoverzicht van tegengehouden spam rijdt mee op deze dagelijkse rit.
  // Een fout hier mag het gezondheidsrapport nooit tegenhouden.
  let spamMails = 0;
  try {
    const { verstuurSpamDagmails } = await import("@/lib/spam-dagmail");
    spamMails = (await verstuurSpamDagmails()).mails;
  } catch (e) {
    console.error("Spam-dagoverzicht mislukt:", e);
  }
  return NextResponse.json({ ok: true, checks: rapport.checks.length, fouten, spamMails });
}
