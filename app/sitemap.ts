import type { MetadataRoute } from "next";

const base = "https://wordswap.nl";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/hoe-het-werkt", "/prijzen", "/contact"].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.8,
  }));
}
