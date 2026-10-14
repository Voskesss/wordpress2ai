import type { MetadataRoute } from "next";
import { SEO_PAGINAS, urlVan, type Groep } from "@/lib/seo-paginas";

const GEWICHT: Record<Groep, number> = {
  start: 0.9,
  overstappen: 0.9,
  nieuw: 0.9,
  bijhouden: 0.9,
  kennis: 0.7,
  branche: 0.7,
  vertrouwen: 0.5,
  juridisch: 0.2,
};

export default function sitemap(): MetadataRoute.Sitemap {
  return SEO_PAGINAS.map((p) => ({
    url: urlVan(p.pad).replace(/\/$/, ""),
    lastModified: p.bijgewerkt,
    changeFrequency: "monthly",
    priority: p.pad === "" ? 1 : GEWICHT[p.groep],
  }));
}
