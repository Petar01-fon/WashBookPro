"use client";

import { type TerminalReservation, type ReservationStatus } from "@/lib/terminal-api";
import { formatTimeSr } from "@/lib/date-format";

interface Props {
  reservation: TerminalReservation;
  loading: boolean;
  onStatusChange: (id: string, status: ReservationStatus) => void;
  onCancel: (id: string) => void;
}

const STATUS_BADGE: Record<number, { label: string; className: string }> = {
  0: { label: "Na čekanju", className: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" },
  1: { label: "Potvrđeno", className: "bg-blue-500/20 text-blue-400 border border-blue-500/30" },
  2: { label: "U toku", className: "bg-green-500/20 text-green-400 border border-green-500/30" },
  3: { label: "Završeno", className: "bg-gray-500/20 text-gray-400 border border-gray-500/30" },
  4: { label: "Otkazano", className: "bg-red-500/20 text-red-400 border border-red-500/30" },
};

export default function ReservationCard({ reservation: r, loading, onStatusChange, onCancel }: Props) {
  const badge = STATUS_BADGE[r.status];
  const isDone = r.status === 3 || r.status === 4;

  return (
    <div className={`bg-gray-900 border rounded-2xl p-5 transition-opacity ${isDone ? "opacity-50 border-gray-800" : "border-gray-700"}`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="font-bold text-lg leading-tight">{r.customer.name}</p>
          <p className="text-gray-400 text-sm">{r.customer.phone}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1 mb-4">
        <p className="text-sm text-gray-300">
          <span className="text-gray-500">Usluga:</span> {r.service.name}
        </p>
        <p className="text-sm text-gray-300">
          <span className="text-gray-500">Boks:</span> {r.bay.name}
        </p>
        <p className="text-sm text-gray-300">
          <span className="text-gray-500">Vreme:</span> {formatTimeSr(r.startsAt)} – {formatTimeSr(r.endsAt)}
        </p>
        <p className="text-sm text-gray-300">
          <span className="text-gray-500">Cena:</span> {r.service.priceRsd.toLocaleString("sr-Latn-RS")} RSD
        </p>
        {r.notes && (
          <p className="text-sm text-gray-400 italic">"{r.notes}"</p>
        )}
      </div>

      {/* Actions */}
      {!isDone && (
        <div className="flex gap-2 flex-wrap">
          {r.status === 0 && (
            <>
              <ActionButton onClick={() => onStatusChange(r.id, 1)} loading={loading} variant="primary">
                ✓ Potvrdi
              </ActionButton>
              <ActionButton onClick={() => onCancel(r.id)} loading={loading} variant="danger">
                ✗ Otkaži
              </ActionButton>
            </>
          )}
          {r.status === 1 && (
            <>
              <ActionButton onClick={() => onStatusChange(r.id, 2)} loading={loading} variant="primary">
                ▶ Počni
              </ActionButton>
              <ActionButton onClick={() => onCancel(r.id)} loading={loading} variant="danger">
                ✗ Otkaži
              </ActionButton>
            </>
          )}
          {r.status === 2 && (
            <ActionButton onClick={() => onStatusChange(r.id, 3)} loading={loading} variant="success">
              ✓ Završi
            </ActionButton>
          )}
        </div>
      )}
    </div>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  loading: boolean;
  variant: "primary" | "success" | "danger";
  children: React.ReactNode;
}

function ActionButton({ onClick, loading, variant, children }: ActionButtonProps) {
  const styles = {
    primary: "bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white",
    success: "bg-green-600 hover:bg-green-500 active:bg-green-700 text-white",
    danger: "bg-red-900/60 hover:bg-red-800 active:bg-red-900 text-red-300",
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`${styles[variant]} font-semibold px-4 py-2.5 rounded-xl text-sm min-w-[100px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? "..." : children}
    </button>
  );
}