import { ReservationItem } from "@/lib/dashboard-api";
import { belgradeTimeString } from "@/lib/date-format";

const STATUS_COLORS: Record<number, string> = {
  0: "bg-yellow-100 border-yellow-300 text-yellow-800",
  1: "bg-blue-100 border-blue-300 text-blue-800",
  2: "bg-purple-100 border-purple-300 text-purple-800",
  3: "bg-green-100 border-green-300 text-green-800",
  4: "bg-gray-100 border-gray-300 text-gray-500",
};

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8–18

type Props = { reservations: ReservationItem[]; date: Date };

export function ReservationCalendar({ reservations, date }: Props) {
  const bays = Array.from(
    new Map(reservations.map((r) => [r.bay.id, r.bay.name])).entries()
  ).map(([id, name]) => ({ id, name }));

  if (bays.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
        Nema rezervacija za izabrani dan.
      </div>
    );
  }

  function getTop(startsAt: string): number {
    const [hour, minute] = belgradeTimeString(new Date(startsAt)).split(":").map(Number);
    return ((hour - 8) * 60 + minute) * (64 / 60);
  }

  function getHeight(startsAt: string, endsAt: string): number {
    const diff =
      (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000;
    return diff * (64 / 60);
  }

  return (
    <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
      <div className="flex">
        {/* Vremenska osa */}
        <div className="w-14 shrink-0 border-r border-gray-200">
          <div className="h-10 border-b border-gray-200" />
          {HOURS.map((h) => (
            <div
              key={h}
              className="flex h-16 items-start justify-end pr-2 pt-1 text-xs text-gray-400"
            >
              {h}:00
            </div>
          ))}
        </div>

        {/* Kolone po boksovima */}
        {bays.map((bay) => {
          const bayReservations = reservations.filter(
            (r) => r.bay.id === bay.id
          );
          return (
            <div key={bay.id} className="min-w-40 flex-1 border-r border-gray-200 last:border-r-0">
              {/* Header */}
              <div className="flex h-10 items-center justify-center border-b border-gray-200 text-xs font-semibold text-gray-600">
                {bay.name}
              </div>
              {/* Grid */}
              <div className="relative" style={{ height: `${HOURS.length * 64}px` }}>
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full border-b border-gray-100"
                    style={{ top: `${(h - 8) * 64}px`, height: "64px" }}
                  />
                ))}
                {bayReservations.map((r) => (
                  <div
                    key={r.id}
                    className={`absolute left-1 right-1 overflow-hidden rounded border px-1.5 py-1 text-xs ${STATUS_COLORS[r.status]}`}
                    style={{
                      top: `${getTop(r.startsAt)}px`,
                      height: `${getHeight(r.startsAt, r.endsAt)}px`,
                    }}
                  >
                    <div className="font-medium">{r.customer.name}</div>
                    <div className="truncate opacity-75">{r.service.name}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}