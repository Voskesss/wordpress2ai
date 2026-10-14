import { aanbod } from "@/lib/aanbod";
import { SEO_PAGINAS, GROEP_KOP, SITE, urlVan, type Groep } from "@/lib/seo-paginas";

const GROEPEN: Groep[] = ["start", "overstappen", "nieuw", "bijhouden", "kennis", "branche", "vertrouwen"];
export const dynamic = "force-static";
const inhoud = `# WordSwap

> ${aanbod.omschrijving}

${aanbod.inHetKort}

${aanbod.prijs}
${aanbod.geschikt}
${aanbod.eigenAi}
${aanbod.seo}

${GROEPEN.map(
  (g) =>
    `## ${GROEP_KOP[g]}\n${SEO_PAGINAS.filter((p) => p.groep === g)
      .map((p) => `- [${p.naam}](${urlVan(p.pad)}): ${p.zin}`)
      .join("\n")}`,
).join("\n\n")}

## Meer
- [Volledig overzicht](${SITE}/llms-full.txt): aanbod, prijzen, beperkingen en vragen
- [Sitemap](${SITE}/sitemap.xml): alle openbare pagina's
`;
export function GET() {
  return new Response(inhoud, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
