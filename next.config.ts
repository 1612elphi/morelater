import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  // The MCP server is its own process; proxy.ts has already checked the lock.
  async rewrites() {
    return [{ source: "/mcp", destination: "http://127.0.0.1:3001/mcp" }];
  },
};

export default nextConfig;
