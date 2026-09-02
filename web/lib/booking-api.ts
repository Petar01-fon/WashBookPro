const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface TenantInfo {
    id: string;
    name: string;
    slug: string;
    address: string | null;
    openingTime: string | null;
    closingTime: string | null;
}

export interface Service {
    id: string;
    name: string;
    vehicleCategory: string;
    serviceType: string;
    durationMinutes: number;
    priceRsd: number;
}

export interface Timeslot {
   startsAt: string;
    endsAt: string;
    bayId: string;
    bayName: string;
}

export interface CreateReservationPayload {
    bayId: string;
    serviceId: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    startsAt: string;
    notes?: string;
    plateNumber?: string;
    tenantSlug: string;
}

export interface ReservationResult {
    id: string;
    serviceName: string;
    startsAt: string;
    customerName: string;
    customerEmail: string;
}

export async function getTenantBySlug(slug: string): Promise<TenantInfo> {
    const res = await fetch(`${API_URL}/tenants/by-slug/${encodeURIComponent(slug)}`, {
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Tenant not found");
    return res.json();
}

export async function getServices(slug: string): Promise<Service[]> {
    const res = await fetch(`${API_URL}/services?tenantSlug=${slug}`, {
        cache: "no-store",
    });

    if (!res.ok) throw new Error("Failed to fetch services");
    return res.json();
}


export async function getAvailability(slug: string, date: string, serviceId: string): Promise<Timeslot[]> {
    const res = await fetch(`${API_URL}/availability?tenantSlug=${slug}&date=${date}&serviceId=${serviceId}`, {
        cache: "no-store",
    });

    if (!res.ok) throw new Error("Failed to fetch availability");
    return res.json();
}

// Thrown specifically for 409 (slot taken between availability fetch and submit) so
// callers can distinguish it from validation/network/server errors via instanceof.
export class ReservationConflictError extends Error {
    constructor() {
        super("The selected time slot is no longer available");
        this.name = "ReservationConflictError";
    }
}

export async function createReservation(payload: CreateReservationPayload): Promise<ReservationResult> {
    const res = await fetch(`${API_URL}/reservations`, {
        method: "POST",
        headers: {"Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (res.status === 409) throw new ReservationConflictError();
    if (!res.ok) throw new Error("Failed to create reservation");
    return res.json();
}