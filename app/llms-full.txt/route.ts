import { aanbod, aankoopVragen } from "@/lib/aanbod";
import { SEO_PAGINAS, urlVan } from "@/lib/seo-paginas";
import { SPREEKUUR, REACTIETERMIJN } from "@/lib/contactgegevens";
export const dynamic = "force-static";
const inhoud = `# WordSwap: aanbod en praktische informatie

## Wat doet WordSwap?
${aanbod.omschrijving}

${aanbod.inHetKort}
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
De gratis websitecheck geeft binnen twee werkdagen een beoordeling van geschiktheid, aandachtspunten en een prijsvoorstel. Mailmigratie, afwijkende functies en de planning worden vooraf besproken. Na akkoord wordt de domeinkoppeling geregeld.

## Vindbaarheid
${aanbod.seo}

## Veiligheid
${aanbod.veiligheid}
Wijzigingen via de ingebouwde chat verschijnen als concept. De eigenaar controleert en publiceert zelf. Versiegeschiedenis maakt terugzetten mogelijk.

## Eigen AI gebruiken
${aanbod.eigenAi}

## Wie zit erachter?
Jos Klijnhout is de oprichter en het persoonlijke aanspreekpunt. WordSwap is een handelsnaam van J.K. Klijnhout Holding B.V., KvK 09190650, Lebretweg 72, 6861 ZZ Oosterbeek, Nederland. Actief sinds 2026. Contact: info@wordswap.nl, telefoon 026 234 01 22 (+31 26 234 01 22). Telefonisch spreekuur op ${SPREEKUUR.dagen} van ${SPREEKUUR.tijd}; persoonlijk antwoord ${REACTIETERMIJN}. De website zelf pas je op elk moment aan via de chat.

## Veelgestelde vragen
${aankoopVragen.map(([q, a]) => `### ${q}\n${a}`).join("\n\n")}

## Demonstratie en bewijs
Op /demo is een interactief, gesimuleerd voorbeeld zonder account beschikbaar. De echte AI-demo vereist een gratis account. Het voorbeeld is geen klantcase, review of bewijs van gemeten resultaten. Er worden hier geen gegarandeerde besparingen, laadtijden of zoekposities geclaimd.

## Bronnen
${SEO_PAGINAS.filter((p) => p.groep !== "juridisch")
  .map((p) => `- ${urlVan(p.pad)}: ${p.zin}`)
  .join("\n")}
`;
export function GET() {
  return new Response(inhoud, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
