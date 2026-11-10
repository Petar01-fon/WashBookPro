// Shared Sentry options for the client, server and edge runtimes (ADR-030).
// Errors only: no tracing, no replay, no logs (logs live in Seq on the backend).
// v11 sends logs/metrics only through Sentry.logger/metrics or a logging
// integration; we use neither, so nothing needs switching off for them.
//
// @sentry/nextjs v11 collects everything when `dataCollection` is unset (user,
// cookies, headers, request bodies). Booking requests carry name, phone and
// email, so every category that can hold personal data is switched off here.
// Query strings too: /book/[slug]/success carries name and plate, and
// /auth/callback carries the access and refresh tokens.

import type { BrowserOptions } from "@sentry/nextjs";

export const sentryOptions = {
  // Inlined at build time (Docker build arg). Empty or missing = SDK disabled.
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "development",
  tracesSampleRate: 0,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    stackFrameVariables: false,
  },
} satisfies BrowserOptions;
