import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

// Sentry (ADR-030). No source map upload for now: it needs a secret auth token
// at build time. Stack traces from the browser stay minified until then.
export default withSentryConfig(nextConfig, {
  sourcemaps: { disable: true },
  telemetry: false,
  silent: !process.env.CI,
});
