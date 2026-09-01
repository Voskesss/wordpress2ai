import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/** Herschrijft een outreach-mail volgens een aanwijzing van Jos
 * ("maak korter", "minder verkoperig", "noem het rieten dak") —
 * telkens opnieuw aan te roepen tot de mail goed voelt. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (user?.publicMetadata?.role !== "admin") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  const { onderwerp, tekst, aanwijzing, bedrijf, website, observatie, sjabloon } =
    (await req.json()) as {
      onderwerp: string;
      tekst: string;
      aanwijzing: string;
      bedrijf?: string;
      website?: string;
      observatie?: string;
      sjabloon?: boolean;
    };
  if (!tekst?.trim() || !aanwijzing?.trim()) {
    return NextResponse.json({ error: "Tekst en aanwijzing nodig" }, { status: 400 });
  }

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic();
  const resp = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 3000,
    system: `Je verbetert een koude maar vriendelijke acquisitie-mail van Jos (WordSwap: zet WordPress-sites om naar snelle sites zonder onderhoud, daarna aanpassen via AI-chat, no cure no pay).

Huisstijl van de mails: Nederlands, je-vorm, kort en concreet, over de situatie van de ontvanger (niet "wij doen"), geen brede beloftes, geen buzzwoorden, respectvol over hun site (de ontvanger is trots op zijn zaak), precies één actie ("één reply is genoeg"). Groet en afmeldknop staan er NIET in — die worden automatisch toegevoegd, dus voeg ze nooit toe.

${sjabloon ? 'Dit is een SJABLOON met invulvelden als {{bedrijf}}, {{opening}} en {{prijsregel}} die per prospect worden ingevuld — laat die invulvelden exact staan (of verplaats ze als de aanwijzing daarom vraagt), verzin er nooit zelf tekst voor. ' : ''}Voer de aanwijzing van Jos uit op de mail. Wijzig alleen wat de aanwijzing raakt; de rest laat je zoveel mogelijk staan. Antwoordformaat, exact dit en niets eromheen:
ONDERWERP: <de onderwerpregel>

<de volledige mailtekst, met een witregel tussen alinea's>`,
    messages: [
      {
        role: "user",
        content: `Prospect: ${bedrijf ?? "onbekend"} (${website ?? ""})${observatie ? `\nObservatie van Jos over hun site: ${observatie}` : ""}

Huidige onderwerpregel: ${onderwerp}

Huidige mailtekst:
${tekst}

Aanwijzing van Jos: ${aanwijzing}`,
      },
    ],
  });
  const uit = resp.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("")
    .trim();
  // Formaat: eerste regel "ONDERWERP: ...", daarna de mailtekst.
  const m = uit.match(/^ONDERWERP:\s*(.+)\n+([\s\S]+)$/);
  if (m) {
    return NextResponse.json({ onderwerp: m[1].trim(), tekst: m[2].trim() });
  }
  // Geen onderwerpregel? Dan is de hele uitvoer de tekst en houden we het oude onderwerp.
  if (uit.length > 40) {
    return NextResponse.json({ onderwerp, tekst: uit });
  }
  return NextResponse.json({ error: "Herschrijven lukte niet — probeer het nog eens" }, { status: 502 });
}
