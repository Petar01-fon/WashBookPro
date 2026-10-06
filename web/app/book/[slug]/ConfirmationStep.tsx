"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createReservation, ReservationConflictError } from "@/lib/booking-api";
import { formatDateSr, formatTimeSr } from "@/lib/date-format";
import { BookingAction, BookingState } from "./bookingReducer";
import { parseLocalDateString } from "./DateTimeStep";

interface Props {
    slug: string;
    state: BookingState;
    dispatch: (action: BookingAction) => void;
}

// Gate D4: real step 4 — review + submit. On 409 (slot taken while the customer
// filled in later steps) we don't show a bare error here: dispatch SLOT_TAKEN, which
// sends them back to step 2 with the stale slot cleared and a fresh availability
// fetch triggered (see availabilityRefreshToken in bookingReducer.ts) — everything
// else they typed survives. Any other failure (validation/network/500) is a plain
// inline message on this step; nothing in the state needs to change for those.
export function ConfirmationStep({ slug, state, dispatch }: Props) {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        if (!state.slot || !state.serviceId) return;
        setSubmitting(true);
        setError(null);
        try {
            const result = await createReservation({
                tenantSlug: slug,
                serviceId: state.serviceId,
                bayId: state.slot.bayId,
                startsAt: state.slot.startsAt,
                plateNumber: state.plateNumber || undefined,
                customerName: state.customerName ?? "",
                customerPhone: state.customerPhone ?? "",
                customerEmail: state.customerEmail ?? "",
                notes: state.notes || undefined,
            });

            // email is deliberately left out of the URL — it's PII that would
            // otherwise sit in browser history, server logs, and the Referer header,
            // and travel along if the customer forwards the link. The success page
            // says a confirmation was sent, without repeating the address.
            const params = new URLSearchParams({
                name: state.customerName ?? "",
                service: state.serviceName ?? "",
                startsAt: state.slot.startsAt,
                endsAt: state.slot.endsAt,
                price: String(state.servicePriceRsd ?? 0),
                emailSent: result.emailSent ? "1" : "0",
            });
            if (state.plateNumber) params.set("plate", state.plateNumber);
            router.push(`/book/${slug}/success?${params.toString()}`);
        } catch (err) {
            if (err instanceof ReservationConflictError) {
                dispatch({ type: "SLOT_TAKEN" });
                return;
            }
            setError("Greška pri slanju rezervacije. Pokušajte ponovo.");
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-[var(--wb-fg)]">Potvrda</h2>

            <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                    <dt className="text-[var(--wb-muted)] shrink-0">Usluga</dt>
                    <dd className="font-medium text-[var(--wb-fg)] text-right">
                        <div>
                            {state.category} · {state.serviceName}
                        </div>
                        {state.serviceDurationMinutes != null && state.servicePriceRsd != null && (
                            <div className="text-[var(--wb-muted)]">
                                {state.serviceDurationMinutes} min · {state.servicePriceRsd} RSD
                            </div>
                        )}
                    </dd>
                </div>

                <div className="flex justify-between gap-4">
                    <dt className="text-[var(--wb-muted)] shrink-0">Termin</dt>
                    <dd className="font-medium text-[var(--wb-fg)] text-right">
                        <div>{state.date && formatDateSr(parseLocalDateString(state.date))}</div>
                        {state.slot && (
                            <div>
                                {formatTimeSr(state.slot.startsAt)} · {state.slot.bayName}
                            </div>
                        )}
                    </dd>
                </div>

                <div className="flex justify-between gap-4">
                    <dt className="text-[var(--wb-muted)] shrink-0">Ime i prezime</dt>
                    <dd className="font-medium text-[var(--wb-fg)] text-right">{state.customerName}</dd>
                </div>

                <div className="flex justify-between gap-4">
                    <dt className="text-[var(--wb-muted)] shrink-0">Telefon</dt>
                    <dd className="font-medium text-[var(--wb-fg)] text-right">{state.customerPhone}</dd>
                </div>

                <div className="flex justify-between gap-4">
                    <dt className="text-[var(--wb-muted)] shrink-0">Email</dt>
                    <dd className="font-medium text-[var(--wb-fg)] text-right">{state.customerEmail}</dd>
                </div>

                {state.plateNumber && (
                    <div className="flex justify-between gap-4">
                        <dt className="text-[var(--wb-muted)] shrink-0">Tablica</dt>
                        <dd className="font-medium text-[var(--wb-fg)] text-right">{state.plateNumber}</dd>
                    </div>
                )}

                {state.notes && (
                    <div className="flex justify-between gap-4">
                        <dt className="text-[var(--wb-muted)] shrink-0">Napomena</dt>
                        <dd className="font-medium text-[var(--wb-fg)] text-right">{state.notes}</dd>
                    </div>
                )}
            </dl>

            {error && <p className="text-sm text-[var(--wb-error)]">{error}</p>}

            <div className="flex items-center gap-3 pt-2">
                <button
                    onClick={() => dispatch({ type: "BACK" })}
                    disabled={submitting}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[var(--wb-fg)] border border-[var(--wb-border)] hover:border-[var(--wb-fg)]/30 transition-colors disabled:opacity-50"
                >
                    ← Nazad
                </button>
                <button
                    onClick={handleConfirm}
                    disabled={submitting}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--wb-accent)] hover:bg-[var(--wb-accent)]/90 transition-colors disabled:opacity-50"
                >
                    {submitting ? "Slanje…" : "Potvrdi rezervaciju"}
                </button>
            </div>
        </div>
    );
}
