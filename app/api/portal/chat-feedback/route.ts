import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { chatFeedback } from "@/db/schema";

/** Feedback op de chatbeleving: duimpje omhoog/omlaag bij een AI-antwoord of
 * een algemene opmerking. Alles wordt opgeslagen; duim omlaag en algemene
 * feedback gaan ook direct per mail naar Jos. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { siteId, oordeel, reden, antwoord } = (await req.json()) as {
    siteId?: number;
    oordeel?: "goed" | "slecht" | "algemeen";
    reden?: string;
    antwoord?: string;
  };
  if (!Number.isInteger(siteId) || !["goed", "slecht", "algemeen"].includes(oordeel ?? "")) {
    return NextResponse.json({ error: "Ongeldige feedback." }, { status: 400 });
  }

  await db.insert(chatFeedback).values({
    siteId: siteId!,
    clerkUserId: user.id,
    oordeel: oordeel!,
    reden: reden?.trim().slice(0, 2000) || null,
    antwoord: antwoord?.trim().slice(0, 4000) || null,
  });

  // Duim omhoog stil registreren; omlaag/algemeen direct doormailen
  if (oordeel !== "goed" && process.env.RESEND_API_KEY) {
    const naam = [user.firstName, user.lastName].filter(Boolean).join(" ") || "een gebruiker";
    const email = user.emailAddresses[0]?.emailAddress ?? "onbekend";
    const ontsnap = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "WordSwap portaal <formulier@wordswap.nl>",
        to: ["jos@wordswap.nl"],
        subject:
          oordeel === "slecht"
            ? `👎 Chat-feedback van ${naam} (site ${siteId})`
            : `💬 Feedback chatbeleving van ${naam} (site ${siteId})`,
        reply_to: email.includes("@") ? [email] : undefined,
        html: `<div style="font-family:-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.6">
<p><strong>${ontsnap(naam)}</strong> (${ontsnap(email)}) gaf ${oordeel === "slecht" ? "een duim omlaag" : "algemene feedback"} in het portaal (site ${siteId}).</p>
${reden?.trim() ? `<p><strong>Reden:</strong></p><blockquote style="margin:8px 0;padding:10px 14px;background:#fef2f2;border-radius:10px;white-space:pre-wrap">${ontsnap(reden.trim().slice(0, 2000))}</blockquote>` : "<p>(geen reden opgegeven)</p>"}
${antwoord?.trim() ? `<p><strong>Het AI-antwoord waar het om ging:</strong></p><blockquote style="margin:8px 0;padding:10px 14px;background:#f5f5f4;border-radius:10px;white-space:pre-wrap">${ontsnap(antwoord.trim().slice(0, 1500))}</blockquote>` : ""}
<p style="font-size:13px;color:#78716c">Alle feedback staat ook in de database (chat_feedback). Beantwoorden = deze mail beantwoorden.</p>
</div>`,
      }),
    }).catch((e) => console.error("Feedback-mail mislukt:", e));
  }

  return NextResponse.json({ ok: true });
}
