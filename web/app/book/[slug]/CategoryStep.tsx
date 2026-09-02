"use client";

import { Service } from "@/lib/booking-api";
import { BookingAction, BookingState } from "./bookingReducer";

interface Props {
    services: Service[];
    loading: boolean;
    error: boolean;
    state: BookingState;
    dispatch: (action: BookingAction) => void;
}

// Gate D1: real step 1. Purely presentational — services are fetched once
// by BookingFlow (useServices) and passed in, since both the desktop and
// mobile trees stay mounted at once and would otherwise double-fetch.
// Category chips are built from the tenant's actual service data (distinct
// vehicleCategory values) — same principle as the dashboard's services page
// category combobox. No hardcoded category list.
export function CategoryStep({ services, loading, error, state, dispatch }: Props) {
    const categories = [...new Set(services.map((s) => s.vehicleCategory).filter((c) => c && c.trim().length > 0))];
    const hasCategories = categories.length > 0;
    const filteredServices =
        hasCategories && state.category ? services.filter((s) => s.vehicleCategory === state.category) : services;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-[var(--wb-fg)]">Izaberi kategoriju</h2>

            {loading && <p className="text-sm text-[var(--wb-muted)]">Učitavanje usluga…</p>}
            {error && (
                <p className="text-sm text-[var(--wb-error)]">Greška pri učitavanju usluga. Pokušajte ponovo.</p>
            )}

            {!loading && !error && (
                <>
                    {hasCategories && (
                        <div className="flex flex-wrap gap-2">
                            {categories.map((cat) => {
                                const active = state.category === cat;
                                return (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => dispatch({ type: "SELECT_CATEGORY", category: cat })}
                                        className={[
                                            "px-4 py-2 rounded-full text-sm font-medium border transition-colors",
                                            active
                                                ? "bg-[var(--wb-accent)] text-white border-[var(--wb-accent)]"
                                                : "bg-white text-[var(--wb-fg)] border-[var(--wb-border)] hover:border-[var(--wb-accent)]/40",
                                        ].join(" ")}
                                    >
                                        {cat}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="space-y-3">
                        {filteredServices.length === 0 && (
                            <p className="text-sm text-[var(--wb-muted)]">Nema dostupnih usluga.</p>
                        )}
                        {filteredServices.map((service) => {
                            const selected = state.serviceId === service.id;
                            return (
                                <button
                                    key={service.id}
                                    type="button"
                                    onClick={() =>
                                        dispatch({
                                            type: "SELECT_SERVICE",
                                            serviceId: service.id,
                                            serviceName: service.name,
                                            durationMinutes: service.durationMinutes,
                                            priceRsd: service.priceRsd,
                                        })
                                    }
                                    className={[
                                        "w-full text-left rounded-xl border p-4 transition-colors",
                                        selected
                                            ? "border-[var(--wb-accent)] bg-[var(--wb-accent)]/10"
                                            : "border-[var(--wb-border)] bg-white hover:border-[var(--wb-accent)]/40",
                                    ].join(" ")}
                                >
                                    <p className="font-semibold text-[var(--wb-fg)]">{service.name}</p>
                                    <p className="text-sm text-[var(--wb-muted)]">
                                        {service.durationMinutes} min · {service.priceRsd} RSD
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
