/**
 * AI-schrijver voor leadmails, met de volledige context van de lead: gegevens,
 * oordeel, wat er op hun website staat, de mail-tijdlijn en (bij aanpassen) de
 * huidige tekst plus Jos' aanwijzing. Gebruikt door de bijwerkronde (eerste
 * concept voor elke nieuwe lead) en de "Met AI aanpassen"-knop in /admin/leads.
 */

import type { MailStap } from "@/lib/lead-opvolging";

export function parseMailJson(tekst: string): { onderwerp: string; tekst: string } | null {
  try {
    const json = JSON.parse(tekst.slice(tekst.indexOf("{"), tekst.lastIndexOf("}") + 1)) as {
      onderwerp?: string;
      tekst?: string;
    };
    if (!json.onderwerp?.trim() || !json.tekst?.trim()) return null;
    return { onderwerp: json.onderwerp.trim(), tekst: json.tekst.trim() };
  } catch {
    return null;
  }
}

/** Homepage-tekst van de lead ophalen (kaal, kort) zodat de AI weet waar de site over gaat. */
export async function haalSiteTekst(website: string | null | undefined): Promise<string | null> {
  if (!website) return null;
  try {
    const res = await fetch(`https://${website}`, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; WordSwap-check)" },
    });
    if (!res.ok) return null;
    const kaal = (await res.text())
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z#0-9]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return kaal ? kaal.slice(0, 1500) : null;
  } catch {
    return null;
  }
}

const WAT_WORDSWAP_IS = `Over WordSwap (het aanbod, alleen dit beloven):
- WIJ zetten de hele site over — de klant hoeft niets te doen. Daarna is alles precies hetzelfde (tenzij de klant meteen een mooier ontwerp wil), blijft de vindbaarheid in Google gelijk of wordt die beter, en wordt de site sneller.
- Daarna niets meer te onderhouden: geen updates, plugins of hosting-gedoe. Aanpassen doet de klant door in een chat te typen wat er anders moet — persoonlijke service, geen ticketsysteem.
- Prijs ALTIJD in twee delen noemen: het overzetten kost eenmalig een bedrag (staat het bedrag in de context, noem dat; anders "eenmalig vanaf €150, afhankelijk van de omvang"), daarna €19 per maand, alles inbegrepen. Nooit alleen het maandbedrag noemen — dat wekt de indruk dat overzetten gratis is.
- BTW: bedragen zijn exclusief btw en dat zet je er altijd bij ("Alle bedragen zijn exclusief btw."). Uitzondering: is de lead een vereniging, stichting of particulier — die kan de btw niet verrekenen — noem dan bedragen inclusief btw en zeg er expliciet bij dat ze inclusief zijn.
- Webshops met een betaalsysteem doen we NIET.
- VERBODEN in de eerste mail: verwijzen naar de demo, en een gratis voorproefje of gratis proef-overzetting aanbieden. Niets gratis beloven.

Vaste bouwstenen die Jos zelf steeds gebruikt — pak alleen wat bij deze lead past, in je eigen woorden:
- MEERPRIJS ONTWERP: ontwerpwerk komt ALTIJD bovenop het overzetbedrag, nooit in plaats daarvan — schrijf dus "€50 extra" en "€250 extra", niet "vanaf €50" (anders lijkt een nieuw ontwerp goedkoper dan een overstap). Bijvoorbeeld: "Wil je meteen iets aan het ontwerp doen, dan komt daar een bedrag bij: opfrissen €50 extra, of een compleet nieuw ontwerp €250 extra." Noem dit als iets extra's, nooit als voorwaarde.
- VEEL BEELD: al hun foto's gaan gewoon mee, netjes geordend in een eigen fotobank; nieuwe foto's zetten ze er zelf bij door ze in de chat te uploaden. Beelden worden automatisch op webformaat gezet zodat de site snel blijft — beloof NOOIT dat originele bestanden of afdrukresolutie op de site komen.
- TALEN: staat er een taalkeuze of vertaalknop op hun site, dan kan die gewoon mee. Beloof geen professionele vertalingen; die kunnen wel, maar dat is apart werk.
- VERKOOP ZONDER KASSA: verkopen ze via een externe partij of op aanvraag, dan past dat prima bij ons — zeg dan expliciet dat hun bestaande verkoopmanier gewoon blijft werken.`;

const STIJL = `Stijl van Jos:
- Nederlands, je/jij-vorm, korte gewone zinnen, warm en eerlijk, nul verkooppraat of superlatieven.
- Verzin NIETS over hun website of situatie dat niet in de context staat; bij twijfel weglaten.
- Bij een minder sterke match: eerlijk en licht blijven, geen druk — het mag ook gewoon niets worden.
- GEEN afsluitende groet of ondertekening: die voegt de mail zelf toe.
- Hooguit één uitroepteken in de hele mail. Lengte: 90 tot 160 woorden.`;

export async function schrijfLeadMail(o: {
  soort: MailStap;
  naam: string;
  website: string | null;
  oordeel: string | null;
  notities: string | null;
  siteTekst: string | null;
  tijdlijn: string[];
  huidig?: { onderwerp: string; tekst: string } | null;
  instructie?: string | null;
}): Promise<{ onderwerp: string; tekst: string } | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();
    const doel =
      o.soort === "eerste"
        ? "Schrijf de EERSTE mail aan deze lead: bedank voor de aanvraag via de advertentie, laat merken dat je echt naar hun site hebt gekeken (alleen met wat uit de context blijkt), verwoord servicegericht wat wij voor hén regelen (wij zetten alles over, alles blijft hetzelfde, vindbaarheid gelijk of beter, sneller), en doe ALTIJD direct een concreet voorstel: eenmalig overzet-bedrag + €19 per maand. Sluit af met een open uitnodiging om te reageren of te bellen — geen demo, geen gratis proef."
        : o.soort === "opvolger"
          ? "Schrijf een korte OPVOLGMAIL: verwijs vriendelijk naar de eerdere mail en het voorstel daarin, en maak duidelijk dat 'nee' ook een prima antwoord is. Geen demo, geen gratis proef."
          : o.soort === "laatste"
            ? "Schrijf een korte LAATSTE mail: netjes afronden zonder te duwen; hooguit noemen dat we op wordswap.nl te vinden zijn als het later alsnog speelt."
            : "Schrijf een kort bericht voor het CONTACTFORMULIER op hun eigen website: leg uit dat eerdere mails mogelijk in de spam belandden, noem jos@wordswap.nl, en sluit vriendelijk af (dit bericht mag wél eindigen met 'Groet, Jos Klijnhout — WordSwap (wordswap.nl)').";
    const resp = await client.messages.create({
      // Mails aan leads: taalkwaliteit en toon gaan voor
      model: "claude-sonnet-5",
      max_tokens: 700,
      system: `Je schrijft namens Jos van WordSwap een mail aan een lead (iemand die via een advertentie een websitecheck aanvroeg).

${WAT_WORDSWAP_IS}

${STIJL}

${doel}

Antwoord uitsluitend met JSON: {"onderwerp": "...", "tekst": "..."}. Het onderwerp is kort en natuurlijk, zonder hoofdletterig verkooptaal.`,
      messages: [
        {
          role: "user",
          content: [
            `Naam: ${o.naam}`,
            `Website: ${o.website ?? "onbekend"}`,
            o.oordeel ? `Oordeel over de match: ${o.oordeel}` : null,
            o.notities ? `Notities: ${o.notities}` : null,
            o.siteTekst ? `Wat er op hun website staat (ingekort): ${o.siteTekst}` : "Hun website was niet op te halen.",
            o.tijdlijn.length ? `Mail-tijdlijn tot nu toe:\n${o.tijdlijn.join("\n")}` : "Nog geen eerder mailcontact bekend.",
            o.huidig ? `Huidige concepttekst (onderwerp "${o.huidig.onderwerp}"):\n${o.huidig.tekst}` : null,
            o.instructie ? `Aanwijzing van Jos voor deze versie: ${o.instructie}` : null,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
    });
    return parseMailJson(resp.content.map((c) => (c.type === "text" ? c.text : "")).join(""));
  } catch (e) {
    console.error("Leadmail-AI mislukt:", e);
    return null;
  }
}
