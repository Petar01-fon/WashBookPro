"use client";

import { BookingState, Step } from "./bookingReducer";
import { stepSummaryLabel } from "./summary";

const ROWS: { step: Step; label: string }[] = [
    { step: 1, label: "Kategorija" },
    { step: 2, label: "Termin" },
    { step: 3, label: "Podaci" },
    { step: 4, label: "Potvrda" },
];

interface Props {
    state: BookingState;
}

// Desktop-only sticky sidebar. Reads the same wizard state as the mobile
// accordion's collapsed rows — Gate C shows only placeholders ("—").
export function SummarySidebar({ state }: Props) {
    return (
        <aside className="sticky top-8 rounded-2xl border border-[var(--wb-border)] bg-white p-6 space-y-4">
            <h3 className="font-mono text-xs uppercase tracking-widest text-[var(--wb-muted)]">
                Pregled rezervacije
            </h3>
            <dl className="space-y-3">
                {ROWS.map((row) => (
                    <div key={row.step} className="flex items-center justify-between text-sm">
                        <dt className="text-[var(--wb-muted)]">{row.label}</dt>
                        <dd className="font-medium text-[var(--wb-fg)]">
                            {stepSummaryLabel(row.step, state)}
                        </dd>
                    </div>
                ))}
            </dl>
        </aside>
    );
}
