"use client";

import { Check } from "lucide-react";
import { Step } from "./bookingReducer";

const STEPS = [
    { n: 1, label: "Kategorija" },
    { n: 2, label: "Termin" },
    { n: 3, label: "Podaci" },
    { n: 4, label: "Potvrda" },
] as const;

interface Props {
    current: Step;
}

// Desktop-only visual progress indicator. Purely informational for Gate C —
// no click-to-navigate (mobile handles re-opening via the accordion rows).
export function BookingProgressBar({ current }: Props) {
    return (
        <div className="flex items-start" role="list">
            {STEPS.map((step, idx) => {
                const done = step.n < current;
                const active = step.n === current;

                return (
                    <div key={step.n} className="flex items-start flex-1 last:flex-none" role="listitem">
                        <div className="flex flex-col items-center gap-1.5">
                            <div
                                aria-current={active ? "step" : undefined}
                                className={[
                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
                                    done
                                        ? "bg-[var(--wb-fg)] text-white"
                                        : active
                                        ? "bg-[var(--wb-accent)] text-white"
                                        : "border border-[var(--wb-border)] text-[var(--wb-muted)]",
                                ].join(" ")}
                            >
                                {done ? (
                                    <Check size={14} strokeWidth={2.5} />
                                ) : (
                                    <span className="font-mono text-xs font-semibold leading-none">
                                        {String(step.n).padStart(2, "0")}
                                    </span>
                                )}
                            </div>

                            <span
                                className={[
                                    "font-mono text-[11px] uppercase tracking-widest select-none whitespace-nowrap",
                                    active ? "text-[var(--wb-fg)] font-semibold" : "text-[var(--wb-muted)]",
                                ].join(" ")}
                            >
                                {step.label}
                            </span>
                        </div>

                        {idx < STEPS.length - 1 && (
                            <div className="flex-1 h-px bg-[var(--wb-border)] mt-4 mx-2" aria-hidden />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
