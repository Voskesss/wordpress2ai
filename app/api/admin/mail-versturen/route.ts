import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { losseMailNaarHtml } from "@/lib/mailer";

/** Losse mail vanuit jos@wordswap.nl (de admin-mailer). */
export async function POST(req: Request) {
  const user = await currentUser();
  if (user?.publicMetadata?.role !== "admin") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  const { aan, onderwerp, tekst } = (await req.json()) as {
    aan: string;
    onderwerp: string;
    tekst: string;
  };
  if (!aan?.includes("@") || !onderwerp?.trim() || !tekst?.trim()) {
    return NextResponse.json({ error: "Vul ontvanger, onderwerp en tekst in." }, { status: 400 });
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ error: "Mailsleutel ontbreekt." }, { status: 500 });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Jos Klijnhout | WordSwap <jos@wordswap.nl>",
      to: [aan.trim()],
      subject: onderwerp.trim(),
      html: losseMailNaarHtml(tekst.trim()),
      reply_to: ["jos@wordswap.nl"],
    }),
  });
  if (!res.ok) {
    console.error("Losse mail mislukt:", await res.text());
    return NextResponse.json({ error: "Versturen mislukte — probeer het zo nog eens." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
