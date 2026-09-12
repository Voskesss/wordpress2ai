import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/** Hulpvraag vanuit het portaal: mailt de vraag van een ingelogde gebruiker
 * naar info@wordswap.nl, met zijn naam en e-mailadres als reply-to zodat Jos
 * direct kan antwoorden. Vervangt de oude mailto-link, die op apparaten
 * zonder mailprogramma nergens heen ging. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { tekst } = (await req.json()) as { tekst?: string };
  if (!tekst?.trim() || tekst.trim().length < 5) {
    return NextResponse.json({ error: "Vertel kort waar je hulp bij wilt." }, { status: 400 });
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ error: "Mailsleutel ontbreekt." }, { status: 500 });

  const naam = [user.firstName, user.lastName].filter(Boolean).join(" ") || "een klant";
  const email = user.emailAddresses[0]?.emailAddress ?? "onbekend";
  const ontsnap = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "WordSwap portaal <formulier@wordswap.nl>",
      to: ["jos@wordswap.nl"],
      subject: `Hulpvraag uit het portaal — ${naam}`,
      reply_to: email.includes("@") ? [email] : undefined,
      html: `<div style="font-family:-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.6">
<p><strong>${ontsnap(naam)}</strong> (${ontsnap(email)}) vraagt hulp via het portaal:</p>
<blockquote style="margin:12px 0;padding:10px 14px;background:#f5f5f4;border-radius:10px;white-space:pre-wrap">${ontsnap(tekst.trim().slice(0, 2000))}</blockquote>
<p style="font-size:13px;color:#78716c">Beantwoorden = gewoon deze mail beantwoorden.</p>
</div>`,
    }),
  });
  if (!res.ok) {
    console.error("Hulpvraag-mail mislukt:", await res.text());
    return NextResponse.json({ error: "Versturen mislukte — probeer het zo nog eens." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
