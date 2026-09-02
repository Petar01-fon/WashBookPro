"use client";

import { DayPicker } from "react-day-picker";
import { Timeslot } from "@/lib/booking-api";
import { formatDateSr } from "@/lib/date-format";
import { BookingAction, BookingState } from "./bookingReducer";

interface Props {
    state: BookingState;
    dispatch: (action: BookingAction) => void;
    slots: Timeslot[];
    loading: boolean;
    error: boolean;
}

// Builds a YYYY-MM-DD string from local calendar components — not
// toISOString(), which is UTC and would roll a late-evening Belgrade date
// over to the next day.
export function toLocalDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export function parseLocalDateString(value: string): Date {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
}

function formatTime(startsAt: string): string {
    return new Date(startsAt).toLocaleTimeString("sr-Latn-RS", { hour: "2-digit", minute: "2-digit" });
}

// Single source for Serbian date naming across the whole app: Intl, same as
// formatDateSr. react-day-picker's built-in sr-Latn locale pulls its strings
// from date-fns, a transitive dep whose Serbian output this project doesn't
// trust — so caption and weekday names are overridden here instead of
// passing a `locale` prop.
const dayPickerFormatters = {
    formatCaption: (month: Date) => month.toLocaleDateString("sr-Latn-RS", { month: "long", year: "numeric" }),
    formatWeekdayName: (weekday: Date) => weekday.toLocaleDateString("sr-Latn-RS", { weekday: "short" }),
};

const dayPickerClassNames = {
    root: "text-[var(--wb-fg)]",
    months: "relative",
    month: "space-y-3",
    nav: "absolute inset-x-0 top-0 h-9 flex items-center justify-between",
    button_previous:
        "p-1.5 rounded-lg text-[var(--wb-fg)] hover:bg-[var(--wb-bg)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors",
    button_next:
        "p-1.5 rounded-lg text-[var(--wb-fg)] hover:bg-[var(--wb-bg)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors",
    chevron: "fill-current w-4 h-4",
    month_caption: "h-9 flex items-center justify-center",
    caption_label: "text-sm font-semibold text-[var(--wb-fg)]",
    month_grid: "w-full border-collapse mt-1",
    weekdays: "flex",
    weekday: "flex-1 text-center text-xs font-medium uppercase tracking-wide text-[var(--wb-muted)] pb-2",
    week: "flex w-full",
    day: "group flex-1 text-center p-0.5",
    day_button:
        "w-9 h-9 mx-auto flex items-center justify-center rounded-full text-sm font-medium text-[var(--wb-fg)] transition-colors hover:bg-[var(--wb-accent)]/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent group-data-[selected=true]:bg-[var(--wb-accent)] group-data-[selected=true]:text-white group-data-[selected=true]:hover:bg-[var(--wb-accent)] group-data-[today=true]:font-bold group-data-[today=true]:text-[var(--wb-accent)] group-data-[today=true]:group-data-[selected=true]:text-white",
};

// Gate D2: real step 2. Availability is fetched once by BookingFlow
// (useAvailability) and passed in, mirroring the D1 useServices pattern —
// both the desktop and mobile trees stay mounted at once.
export function DateTimeStep({ state, dispatch, slots, loading, error }: Props) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = state.date ? parseLocalDateString(state.date) : undefined;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-[var(--wb-fg)]">Datum i vreme</h2>

            <DayPicker
                mode="single"
                weekStartsOn={1}
                selected={selectedDate}
                onSelect={(date) => {
                    if (!date) return;
                    dispatch({ type: "SELECT_DATE", date: toLocalDateString(date) });
                }}
                disabled={{ before: today }}
                classNames={dayPickerClassNames}
                formatters={dayPickerFormatters}
            />

            {state.date && (
                <div className="space-y-3">
                    <p className="text-sm text-[var(--wb-muted)]">{formatDateSr(selectedDate!)}</p>

                    {loading && <p className="text-sm text-[var(--wb-muted)]">Učitavanje termina…</p>}
                    {error && (
                        <p className="text-sm text-[var(--wb-error)]">Greška pri učitavanju termina. Pokušajte ponovo.</p>
                    )}
                    {!loading && !error && slots.length === 0 && (
                        <p className="text-sm text-[var(--wb-muted)]">Nema slobodnih termina za izabrani datum.</p>
                    )}
                    {!loading && !error && slots.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {slots.map((slot) => {
                                const selected =
                                    state.slot?.bayId === slot.bayId && state.slot?.startsAt === slot.startsAt;
                                return (
                                    <button
                                        key={`${slot.bayId}-${slot.startsAt}`}
                                        type="button"
                                        onClick={() =>
                                            dispatch({
                                                type: "SELECT_SLOT",
                                                bayId: slot.bayId,
                                                bayName: slot.bayName,
                                                startsAt: slot.startsAt,
                                            })
                                        }
                                        className={[
                                            "rounded-xl border py-3 text-sm font-semibold transition-colors",
                                            selected
                                                ? "border-[var(--wb-accent)] bg-[var(--wb-accent)]/10 text-[var(--wb-fg)]"
                                                : "border-[var(--wb-border)] bg-white text-[var(--wb-fg)] hover:border-[var(--wb-accent)]/40",
                                        ].join(" ")}
                                    >
                                        {formatTime(slot.startsAt)}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <div className="flex items-center gap-3 pt-2">
                <button
                    onClick={() => dispatch({ type: "BACK" })}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[var(--wb-fg)] border border-[var(--wb-border)] hover:border-[var(--wb-fg)]/30 transition-colors"
                >
                    ← Nazad
                </button>
            </div>
        </div>
    );
}
