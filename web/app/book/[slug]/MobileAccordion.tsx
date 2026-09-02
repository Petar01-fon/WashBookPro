"use client";

import { Service, Timeslot } from "@/lib/booking-api";
import { BookingAction, BookingState } from "./bookingReducer";
import { isStepFilled, stepSummaryLabel } from "./summary";
import { StepStub } from "./StepStub";
import { CategoryStep } from "./CategoryStep";
import { DateTimeStep } from "./DateTimeStep";
import { STEP_META } from "./stepMeta";

interface Props {
    services: Service[];
    loading: boolean;
    error: boolean;
    availabilitySlots: Timeslot[];
    availabilityLoading: boolean;
    availabilityError: boolean;
    state: BookingState;
    dispatch: (action: BookingAction) => void;
}

// Mobile-only vertical accordion. Exactly one step is open (state.step);
// the rest render as collapsed rows — accent/filled if a value was picked,
// neutral/muted otherwise. Tapping a filled collapsed row reopens it.
export function MobileAccordion({
    services,
    loading,
    error,
    availabilitySlots,
    availabilityLoading,
    availabilityError,
    state,
    dispatch,
}: Props) {
    return (
        <div className="space-y-3">
            {STEP_META.map((meta) => {
                const isActive = meta.step === state.step;
                const filled = isStepFilled(meta.step, state);

                if (isActive) {
                    return (
                        <div
                            key={meta.step}
                            className="rounded-2xl border border-[var(--wb-accent)] bg-white p-5"
                        >
                            {meta.step === 1 ? (
                                <CategoryStep
                                    services={services}
                                    loading={loading}
                                    error={error}
                                    state={state}
                                    dispatch={dispatch}
                                />
                            ) : meta.step === 2 ? (
                                <DateTimeStep
                                    state={state}
                                    dispatch={dispatch}
                                    slots={availabilitySlots}
                                    loading={availabilityLoading}
                                    error={availabilityError}
                                />
                            ) : (
                                <StepStub
                                    title={meta.title}
                                    description={meta.description}
                                    showBack={meta.step > 1}
                                    nextLabel={meta.step === 4 ? "Potvrdi" : "Dalje"}
                                    onBack={() => dispatch({ type: "BACK" })}
                                    onAdvance={() => dispatch({ type: "ADVANCE" })}
                                />
                            )}
                        </div>
                    );
                }

                return (
                    <button
                        key={meta.step}
                        type="button"
                        disabled={!filled}
                        onClick={() => filled && dispatch({ type: "JUMP_TO_STEP", step: meta.step })}
                        className={[
                            "w-full flex items-center justify-between rounded-2xl border px-5 py-4 text-left transition-colors",
                            filled
                                ? "border-[var(--wb-accent)]/40 bg-blue-50 hover:bg-blue-100/70 cursor-pointer"
                                : "border-[var(--wb-border)] bg-[var(--wb-bg)] cursor-default",
                        ].join(" ")}
                    >
                        <span
                            className={[
                                "font-mono text-xs uppercase tracking-widest",
                                filled ? "text-[var(--wb-accent)] font-semibold" : "text-[var(--wb-muted)]",
                            ].join(" ")}
                        >
                            {meta.title}
                        </span>
                        <span
                            className={[
                                "text-sm font-medium",
                                filled ? "text-[var(--wb-fg)]" : "text-[var(--wb-muted)]",
                            ].join(" ")}
                        >
                            {stepSummaryLabel(meta.step, state)}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
