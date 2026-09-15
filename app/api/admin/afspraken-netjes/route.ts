import { NextResponse } from "next/server";
import { isBeheerder } from "@/lib/auth";

/** Maakt van Jos' losse aantekeningen nette afspraakregels voor de opdrachtbevestiging. */
export async function POST(req: Request) {
  if (!(await isBeheerder())) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const { tekst } = (await req.json().catch(() => ({}))) as { tekst?: string };
  if (!tekst?.trim()) return NextResponse.json({ error: "Geen tekst" }, { status: 400 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "AI niet beschikbaar" }, { status: 500 });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system:
        "Je herschrijft losse aantekeningen tot nette afspraakregels voor in een zakelijke opdrachtbevestiging van WordSwap (websites). Regels: foutloos en vriendelijk Nederlands, de klant als 'je', WordSwap als 'wij'. Elke afspraak op een eigen regel, zonder opsommingstekens of nummers. Bedragen schrijven als €12 of €12,50 en vermeld excl. btw als dat uit de aantekening blijkt. Verzin NIETS wat er niet staat en laat niets weg. Geef alleen de regels terug, geen inleiding of toelichting.",
      messages: [{ role: "user", content: tekst.slice(0, 2000) }],
    }),
  }).catch(() => null);
  if (!res?.ok) return NextResponse.json({ error: "AI-verzoek mislukt" }, { status: 502 });
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const uit = (data.content ?? []).map((c) => c.text ?? "").join("").trim();
  if (!uit) return NextResponse.json({ error: "Geen resultaat" }, { status: 502 });
  return NextResponse.json({ tekst: uit.slice(0, 1500) });
}
