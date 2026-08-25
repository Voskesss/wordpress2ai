import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@anthropic-ai/claude-agent-sdk"],
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
