import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@anthropic-ai/claude-agent-sdk"],
  outputFileTracingIncludes: {
    "/api/chat": ["./node_modules/@anthropic-ai/claude-agent-sdk/**/*"],
  },
};

export default nextConfig;
