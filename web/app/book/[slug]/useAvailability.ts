import { useEffect, useState } from "react";
import { getAvailability, Timeslot } from "@/lib/booking-api";

interface AvailabilityState {
    slots: Timeslot[];
    loading: boolean;
    error: boolean;
}

// Same single-fetch-point principle as useServices: both the desktop and
// mobile trees stay mounted at once, so this is called once by BookingFlow
// and the result passed down via props, instead of fetching inside the step
// component that renders in both trees.
export function useAvailability(
    slug: string,
    serviceId: string | undefined,
    date: string | undefined,
    refreshToken: number,
): AvailabilityState {
    const [slots, setSlots] = useState<Timeslot[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!serviceId || !date) {
            setSlots([]);
            setLoading(false);
            setError(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(false);
        getAvailability(slug, date, serviceId)
            .then((data) => {
                if (!cancelled) setSlots(data);
            })
            .catch(() => {
                if (!cancelled) setError(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [slug, serviceId, date, refreshToken]);

    return { slots, loading, error };
}
