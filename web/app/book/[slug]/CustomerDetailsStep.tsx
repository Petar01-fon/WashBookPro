"use client";

import { BookingAction, BookingState } from "./bookingReducer";

interface Props {
    state: BookingState;
    dispatch: (action: BookingAction) => void;
}

const inputClass =
    "w-full rounded-xl border border-[var(--wb-border)] bg-white px-4 py-2.5 text-sm text-[var(--wb-fg)] outline-none transition-colors focus:border-[var(--wb-accent)]";
const labelClass = "block text-sm font-medium text-[var(--wb-fg)] mb-1.5";

// Gate D3: real step 3. Plain controlled inputs dispatching SET_FIELD — no local
// form state, the reducer is the single source of truth (same as D1/D2). No hard
// validation here: D3 stays non-blocking per the gate spec, D4 owns submit validation.
export function CustomerDetailsStep({ state, dispatch }: Props) {
    const setField = (field: "customerName" | "customerPhone" | "customerEmail" | "notes" | "plateNumber", value: string) =>
        dispatch({ type: "SET_FIELD", field, value });

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-[var(--wb-fg)]">Podaci</h2>

            <div className="space-y-4">
                <div>
                    <label className={labelClass}>Ime i prezime</label>
                    <input
                        type="text"
                        className={inputClass}
                        value={state.customerName ?? ""}
                        onChange={(e) => setField("customerName", e.target.value)}
                    />
                </div>

                <div>
                    <label className={labelClass}>Telefon</label>
                    <input
                        type="tel"
                        className={inputClass}
                        value={state.customerPhone ?? ""}
                        onChange={(e) => setField("customerPhone", e.target.value)}
                    />
                </div>

                <div>
                    <label className={labelClass}>Email</label>
                    <input
                        type="email"
                        className={inputClass}
                        value={state.customerEmail ?? ""}
                        onChange={(e) => setField("customerEmail", e.target.value)}
                    />
                </div>

                <div>
                    <label className={labelClass}>Registarska tablica (opciono)</label>
                    <input
                        type="text"
                        className={inputClass}
                        value={state.plateNumber ?? ""}
                        // Uppercase live so the canonical form is visible while typing;
                        // trim only on blur, so a space between words isn't stripped
                        // mid-keystroke. Format isn't validated — locked in Gate A,
                        // plates vary and ANPR matching happens later.
                        onChange={(e) => setField("plateNumber", e.target.value.toUpperCase())}
                        onBlur={(e) => setField("plateNumber", e.target.value.trim())}
                    />
                </div>

                <div>
                    <label className={labelClass}>Napomena (opciono)</label>
                    <textarea
                        className={inputClass}
                        rows={3}
                        value={state.notes ?? ""}
                        onChange={(e) => setField("notes", e.target.value)}
                    />
                </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
                <button
                    onClick={() => dispatch({ type: "BACK" })}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[var(--wb-fg)] border border-[var(--wb-border)] hover:border-[var(--wb-fg)]/30 transition-colors"
                >
                    ← Nazad
                </button>
                <button
                    onClick={() => dispatch({ type: "ADVANCE" })}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--wb-accent)] hover:bg-[var(--wb-accent)]/90 transition-colors"
                >
                    Dalje
                </button>
            </div>
        </div>
    );
}
