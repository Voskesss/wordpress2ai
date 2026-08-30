import type { MetadataRoute } from "next";

// AI-crawlers expliciet welkom: wij willen juist genoemd worden in AI-chatbots.
const aiBots = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bytespider",
  "CCBot",
  "meta-externalagent",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...aiBots.map((bot) => ({ userAgent: bot, allow: "/" })),
    ],
    sitemap: "https://wordswap.nl/sitemap.xml",
  };
}
