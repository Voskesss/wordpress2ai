import { aanbod } from "@/lib/aanbod";
export const dynamic = "force-static";
const inhoud = `# WordSwap

> ${aanbod.omschrijving}

${aanbod.prijs}
${aanbod.geschikt}
${aanbod.eigenAi}
${aanbod.seo}

## Productinformatie
- [SEO-behoud](https://wordswap.nl/seo-behoud): bestaande URL’s, structuur en metadata meenemen en controleren
- [Partners](https://wordswap.nl/partners): samenwerken rond bestaande WordPress-klantsites
- [Volledig overzicht](https://wordswap.nl/llms-full.txt): aanbod, prijzen, beperkingen en vragen
- [Home](https://wordswap.nl/): WordPress overzetten en daarna wijzigen via AI-chat
- [Prijzen](https://wordswap.nl/prijzen): hosting, AI-gebruik, btw en aanvullende kosten
- [Hoe het werkt](https://wordswap.nl/hoe-het-werkt): van websitecheck tot goedgekeurde overstap
- [Eigen AI](https://wordswap.nl/eigen-ai-koppelen): ingebouwde chat, teksten voorbereiden, expert-route en geplande koppeling
- [Vergelijking](https://wordswap.nl/wordswap-vs-wordpress): wanneer WordSwap en wanneer WordPress past
- [Demo](https://wordswap.nl/demo): gesimuleerd voorbeeld zonder account; echte AI-demo met account
- [Nieuwe website](https://wordswap.nl/nieuwe-website): nieuw ontwerp als aanvullende dienst

## Vertrouwen en contact
- [Over WordSwap](https://wordswap.nl/over-wordswap): Jos Klijnhout, AI Backoffice, KvK 09190650, Oosterbeek
- [Veiligheid](https://wordswap.nl/veiligheid): risico’s, accounts, hosting en goedkeuring
- [Zelf doen](https://wordswap.nl/zelf-doen): technische handleiding
- [Contact](https://wordswap.nl/contact): gratis geschiktheidscheck en prijsvoorstel
- [Voorwaarden](https://wordswap.nl/voorwaarden): afspraken, prijzen en eigendom
- [Sitemap](https://wordswap.nl/sitemap.xml): alle openbare pagina’s
`;
export function GET() {
  return new Response(inhoud, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
