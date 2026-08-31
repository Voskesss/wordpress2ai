import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/** Maakt van Jos' snelle aantekening een nette, persoonlijke observatie
 * voor in de eerste outreach-mail. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (user?.publicMetadata?.role !== "admin") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  const { tekst, bedrijf, website } = (await req.json()) as {
    tekst: string;
    bedrijf?: string;
    website?: string;
  };
  if (!tekst?.trim()) return NextResponse.json({ error: "Geen tekst" }, { status: 400 });

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic();
  const resp = await client.messages.create({
    // Tekst gladstrijken is eenvoudig werk — het snelle model volstaat
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system:
      "Je herschrijft een ruwe aantekening van Jos over de website van een prospect tot een nette observatie voor in een koude maar vriendelijke acquisitie-mail. Eisen: Nederlands, 1 à 3 zinnen, persoonlijk en concreet (behoud precies wat Jos opviel), begin met iets positiefs of neutraals als dat in de aantekening zit, benoem het verbeterpunt eerlijk maar respectvol (nooit afkrakend — de ontvanger is trots op zijn zaak), geen verkooppraat en geen oplossing noemen (dat doet de rest van de mail al), geen aanhef of afsluiting. Geef ALLEEN de herschreven tekst terug, niets eromheen.",
    messages: [
      {
        role: "user",
        content: `Bedrijf: ${bedrijf ?? "onbekend"} (${website ?? ""})\nRuwe aantekening van Jos: ${tekst}`,
      },
    ],
  });
  const netjes = resp.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("")
    .trim();
  return NextResponse.json({ netjes });
}
