import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@anthropic-ai/claude-agent-sdk"],
  experimental: {
    // Standaard 1 MB; het opleverrapport (pdf) bij het koppelen moet mee kunnen
    serverActions: { bodySizeLimit: "12mb" },
  },
  // Samengevoegde SEO-pagina's (14-10-2026): meerdere pagina's op één zoekterm
  // lieten Google kiezen, en dan koos hij er geen. Permanent doorsturen
  // houdt de opgebouwde waarde vast. Test: tests/seo-samenvoegen.mts.
  async redirects() {
    return [
      ["/website-zonder-cms", "/wordpress-overzetten"],
      ["/wordpress-omzetten-naar-gewone-website", "/wordpress-overzetten"],
      ["/wordpress-omzetten-snel-en-ai-vriendelijk", "/wordpress-overzetten"],
      ["/wordpress-aansturen-met-ai", "/website-koppelen-aan-ai"],
      ["/wordpress-website-maken-met-ai", "/nieuwe-website"],
    ].map(([source, destination]) => ({ source, destination, permanent: true }));
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          ...(process.env.NODE_ENV !== "production" ||
          process.env.VERCEL_ENV === "preview"
            ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
            : []),
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
  outputFileTracingIncludes: {
    // Elke route die de Agent SDK gebruikt heeft de motor + linux-binary nodig
    "/api/chat": [
      "./node_modules/@anthropic-ai/claude-agent-sdk/**/*",
      "./node_modules/@anthropic-ai/claude-agent-sdk-linux-x64/**/*",
    ],
    "/api/admin/migratie-bouw": [
      "./node_modules/@anthropic-ai/claude-agent-sdk/**/*",
      "./node_modules/@anthropic-ai/claude-agent-sdk-linux-x64/**/*",
    ],
  },
};

export default nextConfig;
