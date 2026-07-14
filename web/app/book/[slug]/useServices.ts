import { useEffect, useState } from "react";
import { getServices, Service } from "@/lib/booking-api";

interface ServicesState {
    services: Service[];
    loading: boolean;
    error: boolean;
}

// Single fetch point, called once by BookingFlow. Both the desktop and
// mobile trees stay mounted at once (CSS-only breakpoint switch), so if each
// CategoryStep instance fetched for itself, getServices would fire twice.
export function useServices(slug: string): ServicesState {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);
        getServices(slug)
            .then((data) => {
                if (!cancelled) setServices(data);
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
    }, [slug]);

    return { services, loading, error };
}
