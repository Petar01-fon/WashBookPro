"use client";

import { useEffect, useReducer } from "react";
import { bookingReducer, initialBookingState } from "./bookingReducer";
import { useServices } from "./useServices";
import { useAvailability } from "./useAvailability";
import { useCustomerPrefill } from "./useCustomerPrefill";
import { CategoryStep } from "./CategoryStep";
import { DateTimeStep } from "./DateTimeStep";
import { CustomerDetailsStep } from "./CustomerDetailsStep";
import { ConfirmationStep } from "./ConfirmationStep";
import { BookingProgressBar } from "./BookingProgressBar";
import { SummarySidebar } from "./SummarySidebar";
import { MobileAccordion } from "./MobileAccordion";

interface Props {
    slug: string;
}

// Gate C: full-viewport wizard shell. Layout branches on the `lg` breakpoint
// via Tailwind (both trees are mounted, one hidden) rather than a JS resize
// listener, so there's no hydration flash and the state stays identical
// across the switch. All four steps are real as of Gate D4.
export default function BookingFlow({ slug }: Props) {
    const [state, dispatch] = useReducer(bookingReducer, initialBookingState);
    const { services, loading, error } = useServices(slug);
    const {
        slots: availabilitySlots,
        loading: availabilityLoading,
        error: availabilityError,
    } = useAvailability(slug, state.serviceId, state.date, state.availabilityRefreshToken);

    const customerProfile = useCustomerPrefill();
    useEffect(() => {
        if (!customerProfile) return;
        dispatch({
            type: "PREFILL_CUSTOMER",
            name: `${customerProfile.firstName} ${customerProfile.lastName}`.trim(),
            phone: customerProfile.phoneNumber,
            email: customerProfile.email,
        });
    }, [customerProfile]);

    return (
        <div className="min-h-screen bg-[var(--wb-bg)]">
            {/* Desktop: two columns, sticky summary, numbered progress */}
            <div className="hidden lg:block max-w-5xl mx-auto px-8 py-12">
                <div className="mb-10">
                    <BookingProgressBar current={state.step} />
                </div>
                <div className="grid grid-cols-[1fr_320px] gap-10 items-start">
                    <div className="rounded-2xl border border-[var(--wb-border)] bg-white p-8">
                        {state.step === 1 ? (
                            <CategoryStep
                                services={services}
                                loading={loading}
                                error={error}
                                state={state}
                                dispatch={dispatch}
                            />
                        ) : state.step === 2 ? (
                            <DateTimeStep
                                state={state}
                                dispatch={dispatch}
                                slots={availabilitySlots}
                                loading={availabilityLoading}
                                error={availabilityError}
                            />
                        ) : state.step === 3 ? (
                            <CustomerDetailsStep state={state} dispatch={dispatch} />
                        ) : (
                            <ConfirmationStep slug={slug} state={state} dispatch={dispatch} />
                        )}
                    </div>
                    <SummarySidebar state={state} dispatch={dispatch} />
                </div>
            </div>

            {/* Mobile: vertical accordion stepper, no progress circles */}
            <div className="lg:hidden px-4 py-8">
                <h1 className="text-xl font-bold text-[var(--wb-fg)] mb-6">Rezervacija</h1>
                <MobileAccordion
                    slug={slug}
                    services={services}
                    loading={loading}
                    error={error}
                    availabilitySlots={availabilitySlots}
                    availabilityLoading={availabilityLoading}
                    availabilityError={availabilityError}
                    state={state}
                    dispatch={dispatch}
                />
            </div>
        </div>
    );
}
