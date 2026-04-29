"use client";

import { useEffect, useState } from "react";
import { getDashboardReservations, ReservationItem } from "@/lib/dashboard-api";
import { ReservationTable } from "./ReservationTable";
import { ReservationCalendar } from "./ReservationCalendar";

function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function ReservationsView() {
  const [tab, setTab] = useState<"list" | "calendar">("list");
  const [date, setDate] = useState<Date>(new Date());
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getDashboardReservations(toDateString(date))
      .then(setReservations)
      .finally(() => setLoading(false));
  }, [date]);

  function prevDay() {
    setDate((d) => new Date(d.getTime() - 86400000));
  }

  function nextDay() {
    setDate((d) => new Date(d.getTime() + 86400000));
  }

  function today() {
    setDate(new Date());
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Rezervacije</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setTab("list")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "list"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Lista
          </button>
          <button
            onClick={() => setTab("calendar")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "calendar"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Kalendar
          </button>
        </div>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={prevDay}
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          ←
        </button>
        <button
          onClick={today}
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Danas
        </button>
        <span className="text-sm font-medium text-gray-700">
          {date.toLocaleDateString("sr-Latn-RS", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
        <button
          onClick={nextDay}
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          →
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-sm text-gray-400">Učitavanje...</div>
      ) : tab === "list" ? (
        <ReservationTable reservations={reservations} />
      ) : (
        <ReservationCalendar reservations={reservations} date={date} />
      )}
    </div>
  );
}