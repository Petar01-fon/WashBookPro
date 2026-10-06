import { ReservationItem } from "@/lib/dashboard-api";
import { formatTimeSr } from "@/lib/date-format";

const STATUS_LABELS: Record<number, string> = {
  0: "Na čekanju",
  1: "Potvrđena",
  2: "U toku",
  3: "Završena",
  4: "Otkazana",
};

const STATUS_COLORS: Record<number, string> = {
  0: "bg-yellow-100 text-yellow-700",
  1: "bg-blue-100 text-blue-700",
  2: "bg-purple-100 text-purple-700",
  3: "bg-green-100 text-green-700",
  4: "bg-gray-100 text-gray-500",
};

type Props = { reservations: ReservationItem[] };

export function ReservationTable({ reservations }: Props) {
  if (reservations.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
        Nema rezervacija za izabrani dan.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Vreme</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Mušterija</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Usluga</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Boks</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Cena</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {reservations.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-700">
                {formatTimeSr(r.startsAt)}
                {" — "}
                {formatTimeSr(r.endsAt)}
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{r.customer.name}</div>
                <div className="text-xs text-gray-400">{r.customer.phone}</div>
              </td>
              <td className="px-4 py-3 text-gray-700">{r.service.name}</td>
              <td className="px-4 py-3 text-gray-700">{r.bay.name}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status]}`}
                >
                  {STATUS_LABELS[r.status]}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-gray-700">
                {r.service.priceRsd.toLocaleString("sr-Latn-RS")} RSD
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}