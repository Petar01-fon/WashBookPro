"use client";

import { useEffect, useState } from "react";
import { getDashboardStats, type StatsResponse } from "@/lib/dashboard-api";

function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export function StatsView() {
  const [date, setDate] = useState<Date>(new Date());
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getDashboardStats(toDateString(date))
      .then(setStats)
      .catch(() => setError("Greška pri učitavanju statistika."))
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Statistike</h1>
        <input
          type="date"
          value={toDateString(date)}
          onChange={(e) => setDate(new Date(e.target.value))}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-blue-500"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400">Učitavanje...</div>
      ) : stats ? (
        <>
          {/* Danas */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Danas —{" "}
              {date.toLocaleDateString("sr-Latn-RS", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard
                label="Ukupno rezervacija"
                value={String(stats.today.total)}
              />
              <KpiCard
                label="Završene"
                value={String(stats.today.completed)}
                sub={`${stats.today.cancelled} otkazanih`}
              />
              <KpiCard
                label="Na čekanju"
                value={String(stats.today.pending)}
              />
              <KpiCard
                label="Prihod danas"
                value={`${stats.today.revenueRsd.toLocaleString("sr-Latn-RS")} RSD`}
                sub="samo završene"
              />
            </div>
          </div>

          {/* Mesec */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Ovaj mesec
            </h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <KpiCard
                label="Ukupno rezervacija"
                value={String(stats.month.total)}
              />
              <KpiCard
                label="Završene"
                value={String(stats.month.completed)}
              />
              <KpiCard
                label="Prihod mesec"
                value={`${stats.month.revenueRsd.toLocaleString("sr-Latn-RS")} RSD`}
                sub="samo završene"
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}