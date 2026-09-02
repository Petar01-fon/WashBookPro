"use client";

import { BookingAction, BookingState, Step } from "./bookingReducer";
import { isStepFilled, stepSummaryLabel } from "./summary";

const ROWS: { step: Step; label: string }[] = [
    { step: 1, label: "Kategorija" },
    { step: 2, label: "Termin" },
    { step: 3, label: "Podaci" },
    { step: 4, label: "Potvrda" },
];

interface Props {
    state: BookingState;
    dispatch: (action: BookingAction) => void;
}

// Desktop-only sticky sidebar. "Promeni" jumps back to that step via
// JUMP_TO_STEP — no extra cleanup dispatched here. Re-selecting on the step
// you land on already triggers the right downstream reset (SELECT_CATEGORY/
// SELECT_SERVICE/SELECT_DATE all clear what they need to); the jump itself
// doesn't need to invalidate anything. Only shown for rows already filled,
// and not for whichever step is currently open (nothing to "change" to there).
export function SummarySidebar({ state, dispatch }: Props) {
    return (
        <aside className="sticky top-8 rounded-2xl border border-[var(--wb-border)] bg-white p-6 space-y-4">
            <h3 className="font-mono text-xs uppercase tracking-widest text-[var(--wb-muted)]">
                Pregled rezervacije
            </h3>
            <dl className="space-y-3">
                {ROWS.map((row) => {
                    const canChange = isStepFilled(row.step, state) && row.step !== state.step;
                    return (
                        <div key={row.step} className="text-sm space-y-0.5">
                            <div className="flex items-center justify-between">
                                <dt className="text-[var(--wb-muted)]">{row.label}</dt>
                                {canChange && (
                                    <button
                                        type="button"
                                        onClick={() => dispatch({ type: "JUMP_TO_STEP", step: row.step })}
                                        className="text-xs font-medium text-[var(--wb-accent)] hover:underline"
                                    >
                                        Promeni
                                    </button>
                                )}
                            </div>
                            <dd className="font-medium text-[var(--wb-fg)]">
                                {stepSummaryLabel(row.step, state)}
                            </dd>
                        </div>
                    );
                })}
            </dl>
        </aside>
    );
}
