"use client";

import { useReducer } from "react";
import { bookingReducer, initialBookingState } from "./bookingReducer";
import { STEP_META } from "./stepMeta";
import { StepStub } from "./StepStub";
import { BookingProgressBar } from "./BookingProgressBar";
import { SummarySidebar } from "./SummarySidebar";
import { MobileAccordion } from "./MobileAccordion";

interface Props {
    slug: string;
}

// Gate C: full-viewport wizard shell. Layout branches on the `lg` breakpoint
// via Tailwind (both trees are mounted, one hidden) rather than a JS resize
// listener, so there's no hydration flash and the state stays identical
// across the switch. Gate D fills in real step content and data fetching.
export default function BookingFlow({ slug }: Props) {
    const [state, dispatch] = useReducer(bookingReducer, initialBookingState);
    const activeMeta = STEP_META.find((m) => m.step === state.step)!;

    return (
        <div className="min-h-screen bg-[var(--wb-bg)]">
            {/* Desktop: two columns, sticky summary, numbered progress */}
            <div className="hidden lg:block max-w-5xl mx-auto px-8 py-12">
                <div className="mb-10">
                    <BookingProgressBar current={state.step} />
                </div>
                <div className="grid grid-cols-[1fr_320px] gap-10 items-start">
                    <div className="rounded-2xl border border-[var(--wb-border)] bg-white p-8">
                        <StepStub
                            title={activeMeta.title}
                            description={activeMeta.description}
                            showBack={state.step > 1}
                            nextLabel={state.step === 4 ? "Potvrdi" : "Dalje"}
                            onBack={() => dispatch({ type: "BACK" })}
                            onAdvance={() => dispatch({ type: "ADVANCE" })}
                        />
                    </div>
                    <SummarySidebar state={state} />
                </div>
            </div>

            {/* Mobile: vertical accordion stepper, no progress circles */}
            <div className="lg:hidden px-4 py-8">
                <h1 className="text-xl font-bold text-[var(--wb-fg)] mb-6">Rezervacija</h1>
                <MobileAccordion state={state} dispatch={dispatch} />
            </div>
        </div>
    );
}
