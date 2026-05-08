"use client";

import { useState } from "react";

export function Waitlist() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // silent — show success regardless
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <section className="bg-[var(--wb-fg)] py-24">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-[rgba(255,255,255,0.4)]">
          Mobilna aplikacija
        </p>
        <h2 className="mt-5 text-4xl font-bold text-white tracking-tight leading-tight">
          Budite prvi kad<br />app stigne.
        </h2>
        <p className="mt-4 text-[rgba(255,255,255,0.55)] max-w-sm mx-auto leading-relaxed">
          Obaveštavamo vas čim WashBook mobilna aplikacija bude dostupna za iOS i Android.
        </p>

        <div className="mt-10">
          {submitted ? (
            <div className="inline-flex items-center gap-3 bg-white/10 border border-[var(--wb-border-dark)] text-white rounded-2xl px-6 py-4">
              <span className="text-green-400 text-lg">✓</span>
              <span className="text-sm font-medium">Odlično! Bićete obavešteni.</span>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vasa@email.com"
                required
                className="flex-1 bg-white/10 border border-[var(--wb-border-dark)] text-white placeholder-[rgba(255,255,255,0.35)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--wb-accent)] focus:ring-1 focus:ring-[var(--wb-accent)] transition-colors"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-[var(--wb-accent)] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors disabled:opacity-60 shrink-0"
              >
                {loading ? "..." : "Prijavite se"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-xs text-[rgba(255,255,255,0.25)]">
          Bez spama. Odjava kad god hoćete.
        </p>
      </div>
    </section>
  );
}
