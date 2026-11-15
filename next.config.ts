import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The API serves the hand-written OpenAPI file from docs/ at runtime.
  outputFileTracingIncludes: {
    "/api/openapi": ["./docs/api/openapi.yaml"],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
