"use client";

// Last-resort error boundary: replaces the root layout, so it brings its own
// <html>, <body> and global styles. Reports the error to Sentry (ADR-030).

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="sr">
      <body className="min-h-screen flex items-center justify-center bg-[var(--wb-bg)] text-[var(--wb-fg)] p-6">
        <title>Greška — WashBook</title>
        <div className="max-w-md text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--wb-muted)]">
            Greška
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Nešto nije u redu</h1>
          <p className="mt-2 text-[var(--wb-muted)]">
            Došlo je do neočekivane greške. Pokušajte ponovo.
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="mt-6 rounded-md bg-[var(--wb-accent)] px-5 py-2.5 text-[var(--wb-on-accent)] font-medium"
          >
            Pokušaj ponovo
          </button>
        </div>
      </body>
    </html>
  );
}
