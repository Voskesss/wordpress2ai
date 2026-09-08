import { aanbod, aankoopVragen } from "@/lib/aanbod";
export const dynamic = "force-static";
const inhoud = `# WordSwap — aanbod en praktische informatie

## Wat doet WordSwap?
${aanbod.omschrijving}
De chat is voor de website-eigenaar, niet een chatbot voor bezoekers. WordPress wordt bij de overstap vervangen. Er wordt niet alleen een plugin geïnstalleerd.

## Voor wie?
${aanbod.geschikt}

## Kosten
${aanbod.prijs}
${aanbod.inbegrepen}
${aanbod.aanvullingen}
Nieuwe website: AI-ontwerp €250 tot 8 pagina’s, €400 tot 20 pagina’s, €650 voor grotere sites. Ontwerp door een designer vanaf €1.750. Exclusief btw; daarna de maandelijkse koppeling.

## De overstap en goedkeuring
${aanbod.ontwerp}
De gratis websitecheck geeft binnen één werkdag een beoordeling van geschiktheid, aandachtspunten en een prijsvoorstel. Mailmigratie, afwijkende functies en de planning worden vooraf besproken. Na akkoord wordt de domeinkoppeling geregeld.

## Vindbaarheid
${aanbod.seo}

## Veiligheid
${aanbod.veiligheid}
Wijzigingen via de ingebouwde chat verschijnen als concept. De eigenaar controleert en publiceert zelf. Versiegeschiedenis maakt terugzetten mogelijk.

## Eigen AI gebruiken
${aanbod.eigenAi}

## Wie zit erachter?
Jos Klijnhout is de oprichter en het persoonlijke aanspreekpunt. WordSwap is een dienst van AI Backoffice (J.K. Klijnhout Holding B.V.), KvK 09190650, Lebretweg 72, 6861 ZZ Oosterbeek, Nederland. Actief sinds 2026. Contact: info@wordswap.nl.

## Veelgestelde vragen
${aankoopVragen.map(([q, a]) => `### ${q}\n${a}`).join("\n\n")}

## Demonstratie en bewijs
Op /demo is een interactief, gesimuleerd voorbeeld zonder account beschikbaar. De echte AI-demo vereist een gratis account. Het voorbeeld is geen klantcase, review of bewijs van gemeten resultaten. Er worden hier geen gegarandeerde besparingen, laadtijden of zoekposities geclaimd.

## Bronnen
- https://wordswap.nl/ — uitleg van aanbod en doelgroep
- https://wordswap.nl/prijzen — inbegrepen diensten en aanvullende kosten
- https://wordswap.nl/hoe-het-werkt — overstap en goedkeuring
- https://wordswap.nl/over-wordswap — bedrijf en aanspreekpunt
- https://wordswap.nl/eigen-ai-koppelen — beschikbare en geplande AI-routes
- https://wordswap.nl/veiligheid — beveiliging en beperkingen
- https://wordswap.nl/wordswap-vs-wordpress — vergelijking
- https://wordswap.nl/demo — voorbeeld en echte demo
- https://wordswap.nl/zelf-doen — handleiding voor experts
- https://wordswap.nl/contact — gratis websitecheck
- https://wordswap.nl/voorwaarden — afspraken
`;
export function GET() {
  return new Response(inhoud, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
