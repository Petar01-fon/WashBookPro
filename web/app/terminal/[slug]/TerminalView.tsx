"use client";

import { useEffect, useState, useCallback } from "react";
import { getReservations, updateReservationStatus, cancelReservation, type TerminalReservation, type ReservationStatus } from "@/lib/terminal-api";
import { getAccessToken, logout } from "@/lib/auth";
import { belgradeDateString } from "@/lib/date-format";
import { useRouter } from "next/navigation";
import ReservationCard from "./ReservationCard";
import WalkInDialog from "./WalkInDialog";

interface Props {
  slug: string;
}

const STATUS_LABELS: Record<number, string> = {
  0: "Na čekanju",
  1: "Potvrđeno",
  2: "U toku",
  3: "Završeno",
  4: "Otkazano",
};

const STATUS_ORDER = [0, 1, 2, 3, 4];

export default function TerminalView({ slug }: Props) {
  const router = useRouter();
  const [reservations, setReservations] = useState<TerminalReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const today = belgradeDateString(new Date());

  const fetchReservations = useCallback(async () => {
    const token = getAccessToken();
    if (!token) { router.push("/login"); return; }
    try {
      const data = await getReservations(today, token);
      setReservations(data);
      setError(null);
    } catch {
      setError("Greška pri učitavanju rezervacija.");
    } finally {
      setLoading(false);
    }
  }, [today, router]);

  useEffect(() => {
    fetchReservations();
    const interval = setInterval(fetchReservations, 30000);
    return () => clearInterval(interval);
  }, [fetchReservations]);

  async function handleStatusChange(id: string, status: ReservationStatus) {
    const token = getAccessToken();
    if (!token) return;
    setActionLoading(id);
    try {
      await updateReservationStatus(id, status, token);
      await fetchReservations();
    } catch {
      setError("Greška pri promeni statusa.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel(id: string) {
    const token = getAccessToken();
    if (!token) return;
    setActionLoading(id);
    try {
      await cancelReservation(id, token);
      await fetchReservations();
    } catch {
      setError("Greška pri otkazivanju.");
    } finally {
      setActionLoading(null);
    }
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const activeReservations = reservations.filter(r => r.status !== 3 && r.status !== 4);
  const doneReservations = reservations.filter(r => r.status === 3 || r.status === 4);

  const grouped = [0, 1, 2].map(status => ({
    status,
    label: STATUS_LABELS[status],
    items: activeReservations.filter(r => r.status === status),
  }));

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Terminal</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {new Date().toLocaleDateString("sr-Latn-RS", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Belgrade" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWalkInOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl text-base transition-colors"
          >
            + Walk-in
          </button>
          <button
            onClick={handleLogout}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium px-4 py-3 rounded-xl text-sm transition-colors"
          >
            Odjavi se
          </button>
        </div>
      </div>

      <div className="px-6 py-6">
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 rounded-xl px-4 py-3 mb-6 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-500 text-lg">
            Učitavanje...
          </div>
        ) : (
          <>
            {/* Aktivne rezervacije po statusu */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {grouped.map(({ status, label, items }) => (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
                    <span className="bg-gray-800 text-gray-300 text-xs font-bold px-2 py-0.5 rounded-full">{items.length}</span>
                  </div>
                  <div className="flex flex-col gap-4">
                    {items.length === 0 ? (
                      <div className="border border-dashed border-gray-800 rounded-2xl h-24 flex items-center justify-center text-gray-600 text-sm">
                        Nema rezervacija
                      </div>
                    ) : (
                      items.map(r => (
                        <ReservationCard
                          key={r.id}
                          reservation={r}
                          loading={actionLoading === r.id}
                          onStatusChange={handleStatusChange}
                          onCancel={handleCancel}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Završene i otkazane */}
            {doneReservations.length > 0 && (
              <div className="mt-10">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">Završeno / Otkazano</p>
                <div className="flex flex-col gap-3">
                  {doneReservations.map(r => (
                    <ReservationCard
                      key={r.id}
                      reservation={r}
                      loading={actionLoading === r.id}
                      onStatusChange={handleStatusChange}
                      onCancel={handleCancel}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {walkInOpen && (
        <WalkInDialog
          slug={slug}
          onClose={() => setWalkInOpen(false)}
          onSuccess={() => { setWalkInOpen(false); fetchReservations(); }}
        />
      )}
    </div>
  );
}