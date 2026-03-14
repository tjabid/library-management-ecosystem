import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Suppress noisy hydration warnings in development caused by
  // browser extensions injecting extra attributes into the DOM.
  reactStrictMode: true,

  // Tell Next.js to bundle these packages on the server rather than
  // trying to resolve them as external ESM — required for the Neon
  // WebSocket driver used by Drizzle in Server Actions.
  serverExternalPackages: ["@neondatabase/serverless"],
};

export default nextConfig;
