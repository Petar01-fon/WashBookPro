import { useEffect, useState } from "react";
import { CustomerProfile, fetchCustomerProfile, isCustomerLoggedIn } from "@/lib/customer-auth";

// Booking uses customer-auth.ts exclusively — never auth.ts (owner/worker), a separate
// system per ADR. Fetches once on mount, same single-fetch-point principle as
// useServices/useAvailability. Returns null for anonymous customers (booking must work
// without login) and stays null if the fetch fails, rather than surfacing an error state
// — a failed prefill just means the customer types their details manually.
export function useCustomerPrefill(): CustomerProfile | null {
    const [profile, setProfile] = useState<CustomerProfile | null>(null);

    useEffect(() => {
        if (!isCustomerLoggedIn()) return;
        let cancelled = false;
        fetchCustomerProfile().then((data) => {
            if (!cancelled && data) setProfile(data);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    return profile;
}
