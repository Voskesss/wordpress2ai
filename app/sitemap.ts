import type { MetadataRoute } from "next";

const base = "https://wordswap.nl";

export default function sitemap(): MetadataRoute.Sitemap {
  const paden = [
    "",
    "/hoe-het-werkt",
    "/prijzen",
    "/demo",
    "/nieuwe-website",
    "/contact",
    "/wordpress-overzetten",
    "/wordpress-alternatief",
    "/website-zonder-onderhoud",
    "/wordpress-website-traag",
  ];
  return paden.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.8,
  }));
}
