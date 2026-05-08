"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getRole, getTenantSlug, login } from "@/lib/auth";
import { ApiError } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      document.cookie = "washbook_authed=1; path=/; max-age=86400; SameSite=Strict";
      // router.push(from);
      const role = getRole(); 
        if (role === "Owner") {
          router.push("/dashboard/reservations");
        } else if (role === "Worker") {
          const slug = getTenantSlug();
          router.push(`/terminal/${slug}`);
        } else {
          router.push(from);
        }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401
            ? "Pogrešan email ili lozinka."
            : `Greška: ${err.message}`,
        );
      } else {
        setError("Nije moguće povezati se sa serverom.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          Lozinka
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Prijava..." : "Prijavi se"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div>
          <a
            href="/"
            className="mb-4 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition"
          >
            ← Nazad na početnu
          </a>
          <h1 className="text-2xl font-semibold">WashBookPro</h1>
          <p className="text-sm text-gray-500">Prijavite se na vaš nalog</p>
        </div>

        <Suspense fallback={<div className="text-sm text-gray-400">Učitavanje...</div>}>
          <LoginForm />
        </Suspense>

        {process.env.NODE_ENV === "development" && (
          <p className="text-center text-xs text-gray-400">
            API: {process.env.NEXT_PUBLIC_API_URL}
          </p>
        )}
      </div>
    </main>
  );
}